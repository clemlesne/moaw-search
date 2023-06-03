# MOAW Search

**Demo available at [moaw-search.shopping-cart-devops-demo.lesne.pro](https://moaw-search.shopping-cart-devops-demo.lesne.pro/).**

MOAW Search is a search engine for the [MOAW](https://microsoft.github.io/moaw/) workshops. It use [OpenAI Embedding](https://platform.openai.com/docs/guides/embeddings) to find the most similar sentences to the query. Search queries can be asked in natural language. It uses [Qdrant to index the data](https://github.com/qdrant/qdrant) and [Redis to cache the results](https://github.com/redis/redis).

OpenAI models used are:

- [`gpt-3.5-turbo`](https://platform.openai.com/docs/models/gpt-3-5) for the suggestions (`text-davinci-003` costs 10x more and this is sufficient for our use case)
- [`text-embedding-ada-002`](https://openai.com/blog/new-and-improved-embedding-model) for the search and data indexation
- [`text-moderation-stable`](https://platform.openai.com/docs/models/moderation) for the moderation

![Application screenshot](docs/main.png)

## How to use

### Run locally

This will build locally the container, start them, and display the logs:

```bash
make build start logs
```

Then, go to [http://127.0.0.1:8081](http://127.0.0.1:8081).

### Deploy locally

All deployments are container based. You can deploy locally with Docker Compose or in Kubernetes with Helm.

```bash
# In Kubernetes, with Helm
NAMESPACE=moaw-search make deploy

# Locally, with Docker Compose
make build start logs
```

### Deploy in production

Deployment is container based. Use Helm to install the latest released chart:

```bash
helm repo add clemlesne-moaw-search https://clemlesne.github.io/moaw-search
helm repo update
helm upgrade --install default clemlesne-moaw-search/moaw-search
```

### Get API docs

Go to [http://127.0.0.1:8081/redoc](http://127.0.0.1:8081/redoc).

![Documentation endpoint](docs/doc.png)

## How it works

### High level

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant PWA
    participant API

    User ->> PWA: Fill text
    activate PWA
    PWA ->> API: Get answers
    API ->> PWA: Answer with the results
    User ->> PWA: See results
    deactivate PWA
    PWA ->> API: Ask for suggestion
    API ->> API: Takes forever
    API ->> PWA: Answer with the suggestion
    User ->> PWA: See suggestion
```

### Architecture

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
    oai_modr["Moderation"]
  end

  api -- Cache entities --> redis
  api -- Generate completions --> oai_gpt
  api -- Test moderation --> oai_modr
  api -- Generate embeddings --> oai_ada
  api -- Index data every hour --> moaw
  api -- Search for similarities, index vectors --> qdrant
  ui -- Use APIs --> api
  user -- Navigate --> ui
```

## Advanced topics

### Sequence diagram

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant PWA
    participant API
    participant Database
    participant Cache
    participant OpenAI

    User ->> PWA: Fill text
    PWA ->> API: Get answers
    API ->> Cache: Test if there is a cached response

    alt No cache
        API ->> OpenAI: Test for moderation
        alt Moderated
          API ->> PWA: Answer with no content
        end
        API ->> OpenAI: Generate embedding
        API ->> Database: Search for vector similarities
        API ->> Cache: Store results
    end

    API ->> API: Generate suggestion token
    API ->> Cache: Store suggestion model
    API ->> PWA: Answer with the results

    User ->> PWA: See results
```

## [Authors](./AUTHORS.md)
