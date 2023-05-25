docker := docker
version_small ?= $(shell $(MAKE) --directory ../../ --silent version)
version_full ?= $(shell $(MAKE) --directory ../../ --silent version-full)
component_name := search-api
container_name := ghcr.io/clemlesne/moaw-search/$(component_name)

install:
	python3 -m pip install -r requirements.txt

start:
	VERSION=$(version_full) python3 -m uvicorn main:api --reload --port 8081

build:
	$(docker) build \
		--build-arg VERSION=$(version_full) \
		--tag $(container_name):$(version_small) \
		--tag $(container_name):latest \
		.

test:
	python3 -m black .
