from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from models.metadata import MetadataModel
from models.search import SearchAnswerModel, SearchStatsModel, SearchModel
from models.suggestion import SuggestionModel
from qdrant_client import QdrantClient
from redis import Redis
from tenacity import retry, stop_after_attempt
from typing import List, Annotated, Optional, Tuple
from uuid import uuid4, UUID
from yarl import URL
import aiohttp
import html
import logging
import openai
import os
import qdrant_client.http.models as qmodels
import re
import textwrap
import time


# Init config
load_dotenv()
VERSION = os.getenv("VERSION")
# Init logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
# Init OpenAI
OAI_EMBEDDING_MODEL = "text-embedding-ada-002"
OAI_COMPLETION_MODEL = "gpt-3.5-turbo"
openai.api_key = os.getenv("OPENAI_KEY")
# Init FastAPI
ROOT_PATH = os.getenv("ROOT_PATH")
logger.info(f"Using root path: {ROOT_PATH}")
api = FastAPI(
    contact={
        "url": "https://github.com/clemlesne/moaw-search",
    },
    description="Search API for MOAW",
    license_info={
        "name": "Apache-2.0",
        "url": "https://github.com/clemlesne/moaw-search/blob/master/LICENCE",
    },
    root_path=ROOT_PATH,
    title="search-api",
    version=VERSION,
)
# Init Qdrant
QD_COLLECTION = "moaw"
QD_DIMENSION = 1536
QD_HOST = os.getenv("QD_HOST")
QD_METRIC = qmodels.Distance.DOT
qd_client = QdrantClient(host=QD_HOST, port=6333)
# Init Redis
GLOBAL_CACHE_TTL_SECS = 60 * 60  # 1 hour
SUGGESTION_TOKEN_TTL_SECS = 60  # 1 minute
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = 6379
redis_client_api = Redis(db=0, host=REDIS_HOST, port=REDIS_PORT)
redis_client_scheduler = RedisJobStore(db=1, host=REDIS_HOST, port=REDIS_PORT)

# Ensure OpenAI API key is set
if not openai.api_key:
    raise Exception("OPENAI_KEY is not set")

# Ensure Qdrant collection exists
try:
    qd_client.get_collection(QD_COLLECTION)
except Exception:
    qd_client.create_collection(
        collection_name=QD_COLLECTION,
        vectors_config=qmodels.VectorParams(
            distance=QD_METRIC,
            size=QD_DIMENSION,
        ),
    )

# Setup CORS
api.add_middleware(
    CORSMiddleware,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_origins=["*"],
)


@api.on_event("startup")
async def startup_event() -> None:
    """
    Starts the scheduler, which runs every hour to index the data in the database.
    """
    scheduler = AsyncIOScheduler(
        jobstores={"redis": redis_client_scheduler},
        timezone="UTC",
    )
    scheduler.add_job(
        args={"user": uuid4()},
        func=index_engine,
        id="index",
        jobstore="redis",
        replace_existing=True,
        trigger=CronTrigger(hour="*"),  # Every hour
    )
    scheduler.start()


@api.get("/health/liveness", status_code=status.HTTP_204_NO_CONTENT, name="Healthckeck liveness")
async def health_liveness_get() -> None:
    return None


async def search_answer(query: str, limit: int, user: UUID) -> List[any]:
    vector = await vector_from_text(
        textwrap.dedent(
            f"""
            Today, we are the {datetime.now()}.

            QUERY START
            {query}
            QUERY END
        """
        ),
        user,
    )

    search_params = qmodels.SearchParams(hnsw_ef=128, exact=False)

    # Get query answer
    results = qd_client.search(
        collection_name=QD_COLLECTION,
        limit=limit,
        query_vector=vector,
        search_params=search_params,
    )
    logger.debug(f"Found {len(results)} results")

    return results


@api.get(
    "/suggestion/{token}",
    name="Get suggestion from a search",
    description=f"Suggestions are cached for {GLOBAL_CACHE_TTL_SECS} seconds.",
)
async def suggestion(token: UUID, user: UUID) -> SuggestionModel:
    logger.info(f"Suggesting for {str(token)}")

    token_cache_key = f"token:{str(token)}"

    search_model_raw = redis_client_api.get(token_cache_key)
    if not search_model_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found or expired")
    search_model = SearchModel.parse_raw(search_model_raw)

    suggestion_cache_key = f"suggestion:{search_model.query}"

    model_raw = redis_client_api.get(suggestion_cache_key)
    if model_raw:
        logger.debug("Found suggestion in cache")
        return SuggestionModel.parse_raw(model_raw)

    prompt = await prompt_from_search_model(search_model)
    comletion = await completion_from_text(prompt, user)
    model = SuggestionModel(message=comletion)
    redis_client_api.set(suggestion_cache_key, model.json(), ex=GLOBAL_CACHE_TTL_SECS)
    return model


@api.get(
    "/search",
    name="Get search results",
    description=f"Search results are cached for {GLOBAL_CACHE_TTL_SECS} seconds. Suggestion tokens are cached for {SUGGESTION_TOKEN_TTL_SECS} seconds.",
)
async def search(
    query: Annotated[str, Query(max_length=200)], user: UUID, limit: int = 10
) -> SearchModel:
    start = time.process_time()
    logger.info(f"Searching for {query}")

    suggestion_token = str(uuid4())
    search_cache_key = f"search:{query}-{limit}"
    token_cache_key = f"token:{suggestion_token}"

    model_raw = redis_client_api.get(search_cache_key)
    if model_raw:
        model = SearchModel.parse_raw(model_raw)
        answers = model.answers
        total = model.stats.total
        logger.debug("Found cached results")

    else:
        logger.debug("No cached results found")
        total = qd_client.count(collection_name=QD_COLLECTION, exact=False).count
        results = await search_answer(query, limit, user)
        answers = []
        for res in results:
            try:
                answers.append(
                    SearchAnswerModel(
                        id=res.id,
                        metadata=MetadataModel(**res.payload),
                        score=res.score,
                    )
                )
            except TypeError:
                logger.exception(f"Error parsing model: {res.id}")

    model = SearchModel(
        answers=answers,
        query=query,
        stats=SearchStatsModel(time=(time.process_time() - start), total=total),
        suggestion_token=suggestion_token,
    )

    redis_client_api.set(search_cache_key, model.json(), ex=GLOBAL_CACHE_TTL_SECS)
    redis_client_api.set(token_cache_key, model.json(), ex=SUGGESTION_TOKEN_TTL_SECS)

    return model


@api.get(
    "/index",
    status_code=status.HTTP_202_ACCEPTED,
    name="Index workshops from microsoft.github.io. Task is run in background.",
)
async def index(user: UUID, background_tasks: BackgroundTasks, force: Optional[bool] = None) -> None:
    background_tasks.add_task(index_engine, user, force)


async def index_engine(user: UUID, force: bool = False) -> None:
    async with aiohttp.ClientSession() as session:
        workshops = await session.get("https://microsoft.github.io/moaw/workshops.json")
        workshops = await workshops.json()

        ids = []
        payloads = []
        vectors = []

        for workshop in workshops:
            id = workshop.get("id")
            model = MetadataModel(
                audience=workshop.get("audience"),
                authors=workshop.get("authors"),
                description=workshop.get("description"),
                language=workshop.get("language"),
                last_updated=datetime.fromisoformat(workshop.get("lastUpdated")),
                tags=workshop.get("tags"),
                title=workshop.get("title"),
                url=workshop.get("url"),
            )

            if not force:
                try:
                    res = qd_client.retrieve(collection_name=QD_COLLECTION, ids=[id])
                    if len(res) > 0:
                        stored = MetadataModel(**res[0].payload)
                        logger.info(stored.last_updated)
                        logger.info(model.last_updated)
                        if stored.last_updated == model.last_updated:
                            logger.info(f'Workshop "{model.title}" already indexed')
                            continue
                except Exception as e:
                    logger.exception(e)

            logger.info(f"Parsing workshop {model.title}...")
            text = await embedding_text_from_model(model, session)
            logger.debug(f"Text: {text}")
            vector = await vector_from_text(text, user)

            # Create Qdrant payload
            vectors.append(vector)
            ids.append(id)
            payloads.append(model.dict())

        if len(ids) == 0:
            logger.info("No new workshops to index")
            return

        # Insert into Qdrant
        qd_client.upsert(
            collection_name=QD_COLLECTION,
            points=qmodels.Batch(
                ids=ids,
                payloads=payloads,
                vectors=vectors,
            ),
        )

        logger.info(f"Indexed {len(workshops)} workshops")


@retry(stop=stop_after_attempt(3))
async def vector_from_text(prompt: str, user: UUID) -> List[float]:
    logger.debug(f"Getting vector for text: {prompt}")
    response = openai.Embedding.create(
        input=prompt,
        model=OAI_EMBEDDING_MODEL,
        user=str(
            user
        ),  # Unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse
    )
    return response.data[0].embedding


@retry(stop=stop_after_attempt(3))
async def completion_from_text(prompt: str, user: UUID) -> str:
    logger.debug(f"Getting completion for text: {prompt}")
    # Use chat completion to get a more natural response and lower the usage cost
    response = openai.ChatCompletion.create(
        messages=[{"role": "user", "content": prompt}],
        model=OAI_COMPLETION_MODEL,
        presence_penalty=1,  # Increase the model's likelihood to talk about new topics
        user=str(
            user
        ),  # Unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse
    )
    return response.choices[0].message.content


async def prompt_from_search_model(model: SearchModel) -> str:
    prompt = textwrap.dedent(
        f"""
        You are a training consultant. You are working for Microsoft. You have 20 years of experience in the technology industry. You are looking for a workshop. Today, we are the {datetime.now()}.

        You MUST:
        - Be kind and respectful
        - Do not invent workshops, only use the ones you have seen
        - Limit your answer few sentences
        - Sources are only workshops you have seen
        - Use imperative form (example: "Do this" instead of "You should do this")
        - Write links with Markdown syntax (example: [which can be found here](https://google.com))
        - Write lists with Markdown syntax, using dashes (example: - First item) or numbers (example: 1. First item)
        - Write your answer in English

        You SHOULD:
        - Be concise and precise
        - Cite your sources as bullet points, at the end of your answer
        - Feel free to propose a new workshop idea if you do not find any relevant one
        - If you don't know, don't answer
        - QUERY defines the workshop you are looking for
        - Use your knowledge to add value to your proposal
        - WORKSHOP are sorted by relevance, from the most relevant to the least relevant
        - WORKSHOP are workshops examples you will base your answer
        - You can precise the way you want to execute the workshop

        Awnser with a help to find the workshop.

        QUERY START
        {model.query}
        QUERY END

    """
    )

    for i, result in enumerate(model.answers):
        prompt += textwrap.dedent(
            f"""
            WORKSHOP START #{i}
            Audience:
            {result.metadata.audience}
            Authors:
            {result.metadata.authors}
            Description:
            {result.metadata.description}
            Language:
            {result.metadata.language}
            Last updated:
            {result.metadata.last_updated}
            Tags:
            {result.metadata.tags}
            Title:
            {result.metadata.title}
            URL:
            {result.metadata.url}
            WORKSHOP END

        """
        )

    return prompt



async def embedding_text_from_model(model: MetadataModel, session: aiohttp.ClientSession) -> str:
    description = await sanitize_for_embedding(model.description)
    (content_raw, url) = await workshop_scrapping(model.url, session)
    content_clean = (await sanitize_for_embedding(content_raw))[:7500]

    # Update model with the real URL
    model.url = url.human_repr()

    return textwrap.dedent(
        f"""
        Title:
        {model.title}

        Description:
        {description}

        Content:
        {content_clean}

        Tags:
        {", ".join(model.tags)}

        Authors:
        {", ".join(model.authors)}

        Audience:
        {", ".join(model.audience)}

        Last updated:
        {model.last_updated}
    """
    )


async def sanitize_for_embedding(raw: str) -> str:
    """
    Takes a raw string of HTML and removes all HTML tags, Markdown tables, and line returns.
    """
    # Remove HTML doctype
    raw = re.sub(r"<!DOCTYPE[^>]*>", " ", raw)
    # Remove HTML head
    raw = re.sub(r"<head\b[^>]*>[\s\S]*<\/head>", " ", raw)
    # Remove HTML scripts
    raw = re.sub(r"<script\b[^>]*>[\s\S]*?<\/script>", " ", raw)
    # Remove HTML styles
    raw = re.sub(r"<style\b[^>]*>[\s\S]*?<\/style>", " ", raw)
    # Remove HTML tags
    raw = re.sub(r"<[^>]*>", " ", raw)
    # Remove Markdown tables
    raw = re.sub(r"[-|]{2,}", " ", raw)
    # Remove Markdown code blocks
    raw = re.sub(r"```[\s\S]*```", " ", raw)
    # Remove Markdown bold, italic, strikethrough, code, heading, table delimiters, links, images, comments, and horizontal rules
    raw = re.sub(r"[*_`~#|!\[\]<>-]+", " ", raw)
    # Remove line returns, tabs and spaces
    raw = re.sub(r"[\n\t\v ]+", " ", raw)
    # Remove HTML entities
    raw = html.unescape(raw)
    # Remove leading and trailing spaces
    raw = raw.strip()

    return raw


async def workshop_scrapping(url: str, session: aiohttp.ClientSession) -> Tuple[str, URL]:
    """
    Scrapes the workshop from the given URL and returns the content as a string.
    """
    logger.debug(f"Scraping workshop from {url}")

    return_url = None

    # Handle relative URLs for workshops hosted in MOAW, in that case, we use the default workshop Markdown file
    scrapping_url = url
    if not url.startswith("http"):
        scrapping_url = f"https://microsoft.github.io/moaw/workshops/{url}workshop.md"
        return_url = URL(f"https://microsoft.github.io/moaw/workshop/{url}")

    res = await session.get(scrapping_url)

    if not return_url:
        return_url = res.url

    return (await res.text(), return_url)
