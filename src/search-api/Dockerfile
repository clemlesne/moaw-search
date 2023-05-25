# Build container
FROM docker.io/library/python:3.11-alpine3.17 as build

RUN apk add --no-cache linux-headers build-base python3-dev \
  && python3 -m pip install --upgrade pip setuptools wheel

RUN python -m venv /venv
ENV PATH=/venv/bin:$PATH

COPY requirements.txt .
RUN python3 -m pip install --requirement requirements.txt

# Output container
FROM docker.io/library/python:3.11-alpine3.17

# Required at run-time by grpc Python dependency
RUN apk add --no-cache libstdc++ \
  && rm -rf /var/cache/apk/*

ARG VERSION
ENV VERSION=${VERSION}

# add user and group named useradd
RUN addgroup -S appuser \
  && adduser -S appuser -G appuser \
  && mkdir /app \
  && chown -R appuser:appuser /app

USER appuser

COPY --from=build /venv /venv
ENV PATH=/venv/bin:$PATH

COPY --chown=appuser:appuser . /app

CMD ["sh", "-c", "WEB_CONCURRENCY=$(nproc --all) cd /app && uvicorn main:api --host 0.0.0.0 --port 8080 --proxy-headers --no-server-header --timeout-keep-alive 30 --header x-version:${VERSION}"]
