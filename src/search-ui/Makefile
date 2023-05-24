docker := docker
version_small ?= $(shell $(MAKE) --directory ../../ --silent version)
version_full ?= $(shell $(MAKE) --directory ../../ --silent version-full)
component_name := search-ui
container_name := moaw-search-service/$(component_name)

install:
	npm install

start:
	npm run dev

build:
	$(docker) build \
		--build-arg VERSION=$(version_full) \
		--tag $(container_name):$(version_small) \
		--tag $(container_name):latest \
		.
