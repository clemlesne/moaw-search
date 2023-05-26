from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.metadata import MetadataModel
from models.search import SearchAnswerModel, SearchStatsModel, SearchModel
from models.suggestion import SuggestionModel
from qdrant_client import QdrantClient
from redis import Redis
from tenacity import retry, stop_after_attempt
from typing import List
from uuid import uuid4, UUID
import aiohttp
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
redis_client = Redis(db=0, host=REDIS_HOST, port=6379)

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


@api.get("/health/liveness", status_code=204, name="Healthckeck liveness")
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

    search_model_raw = redis_client.get(token_cache_key)
    if not search_model_raw:
        raise HTTPException(status_code=404, detail="Suggestion not found or expired")
    search_model = SearchModel.parse_raw(search_model_raw)

    suggestion_cache_key = f"suggestion:{search_model.query}"

    model_raw = redis_client.get(suggestion_cache_key)
    if model_raw:
        logger.debug("Found suggestion in cache")
        return SuggestionModel.parse_raw(model_raw)

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
        {search_model.query}
        QUERY END

    """
    )

    for i, result in enumerate(search_model.answers):
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

    comletion = await completion_from_text(prompt, user)
    model = SuggestionModel(message=comletion)
    redis_client.set(suggestion_cache_key, model.json(), ex=GLOBAL_CACHE_TTL_SECS)
    return model


@api.get(
    "/search",
    name="Get search results",
    description=f"Search results are cached for {GLOBAL_CACHE_TTL_SECS} seconds. Suggestion tokens are cached for {SUGGESTION_TOKEN_TTL_SECS} seconds.",
)
async def search(query: str, user: UUID, limit: int = 10) -> SearchModel:
    start = time.process_time()
    logger.info(f"Searching for {query}")

    suggestion_token = str(uuid4())
    search_cache_key = f"search:{query}-{limit}"
    token_cache_key = f"token:{suggestion_token}"

    model_raw = redis_client.get(search_cache_key)
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

    redis_client.set(search_cache_key, model.json(), ex=GLOBAL_CACHE_TTL_SECS)
    redis_client.set(token_cache_key, model.json(), ex=SUGGESTION_TOKEN_TTL_SECS)

    return model


@api.get("/index", name="Index workshops from microsoft.github.io")
async def index() -> None:
    # load JSON with aiohttp
    async with aiohttp.ClientSession() as session:
        workshops = await session.get("https://microsoft.github.io/moaw/workshops.json")
        workshops = await workshops.json()
        ids = []
        payloads = []
        vectors = []

        for workshop in workshops:
            logger.info(f"Parsing workshop {workshop['title']}...")
            # Get HTML from web page
            async with aiohttp.ClientSession() as session:
                url = workshop["url"]
                url_content = url
                # Handle relative URLs for workshops hosted in MOAW, in that case, we use the default workshop Markdown file
                if not url.startswith("http"):
                    url = f"https://microsoft.github.io/moaw/workshops/{url}"
                    url_content = f"{url}/workshop.md"
                # Handle redirections from MOAW
                while True:
                    res = await session.get(url_content)
                    if res.status == 301:
                        url_content = res.headers["Location"]
                    else:
                        break
                content_html = await res.text()

            content_text = content_html
            # Remove HTML head
            content_text = re.sub(r"<head>[\S\n\t\v ]*<\/head>", " ", content_text)
            # Remove HTML scripts
            content_text = re.sub(r"<script>[\S\n\t\v ]*<\/script>", " ", content_text)
            # Remove HTML styles
            content_text = re.sub(r"<style>[\S\n\t\v ]*<\/style>", " ", content_text)
            # Remove HTML tags
            content_text = re.sub(r"<[^>]*>", " ", content_text)
            # Remove Markdown tables
            content_text = re.sub(r"[-|]{2,}", " ", content_text)
            # Remove double line returns
            content_text = re.sub(r"\n", " ", content_text)
            # Remove double spaces
            content_text = re.sub(r" +", " ", content_text)

            # Create prompt for OpenAI
            text = textwrap.dedent(
                f"""
                Title:
                {workshop['title']}
                Description:
                {workshop['description']}
                Content:
                {content_text[:7500]}
                Tags:
                {workshop['tags']}
                Authors:
                {workshop['authors']}
                Audience:
                {workshop['audience']}
                Last updated:
                {workshop['lastUpdated']}
            """
            )
            logger.debug(f"Text: {text}")
            vector = await vector_from_text(text)

            # Create Qdrant payload
            vectors.append(vector)
            ids.append(workshop["id"])
            payloads.append(
                {
                    "audience": workshop["audience"],
                    "authors": workshop["authors"],
                    "description": workshop["description"],
                    "language": workshop["language"],
                    "last_updated": workshop["lastUpdated"],
                    "tags": workshop["tags"],
                    "title": workshop["title"],
                    "url": url,
                }
            )

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
