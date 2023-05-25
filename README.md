# MOAW Search

> This project is a proof of concept. It is not intended to be used in production. Nevertheless, it follows best practices and can be used as a template for a production-ready project.

MOAW Search is a search engine for the [MOAW](https://microsoft.github.io/moaw/) dataset. It use [OpenAI Embedding](https://platform.openai.com/docs/guides/embeddings) to find the most similar sentences to the query. Search queries can be asked in natural language.

OpenAI models used are:

- [`text-embedding-ada-002`](https://openai.com/blog/new-and-improved-embedding-model) for the search and data indexation
- [`gpt-3.5-turbo`](https://platform.openai.com/docs/models/gpt-3-5) for the suggestions (`text-davinci-003` costs 10x more and this is sufficient for our use case)

![Application screenshot](docs/main.png)

## How it works

```mermaid
graph
  user(["User"])

  api["Search service\n(REST API)"]
  moaw["MOAW\n(website)"]
  qdrant[("Qdrant\n(disk)")]
  redis[("Redis\n(memory)")]
  ui["Search UI\n(PWA)"]

  subgraph "OpenAI"
    oai_ada["ADA embedding"]
    oai_gpt["GPT completions"]
  end

  api -- Cache entities --> redis
  api -- Crawl data for indexing --> moaw
  api -- Generate completions --> oai_gpt
  api -- Generate embeddings --> oai_ada
  api -- Search for similarities, index vectors --> qdrant
  ui -- Use APIs --> api
  user -- Navigate --> ui
```

## How to use

### Run locally

This will build locally the container, start them, and display the logs:

```bash
make build start logs
```

Then, go to [http://127.0.0.1:8081](http://127.0.0.1:8081).

### Deploy in production

Components are built as containers:

- Search API: `ghcr.io/clemlesne/moaw-search-service/search-api`
- Search web UI: `ghcr.io/clemlesne/moaw-search-service/search-ui`

Databases are also containerized, sourced from their official images:

- Redis: `docker.io/redis`
- Qdrant: `docker.io/qdrant/qdrant`

### Get API docs

Go to [http://127.0.0.1:8081/redoc](http://127.0.0.1:8081/redoc).

![Documentation endpoint](docs/doc.png)

## [Authors](./AUTHORS.md)
