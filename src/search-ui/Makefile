docker := docker
version_small ?= $(shell $(MAKE) --directory ../../ --silent version)
version_full ?= $(shell $(MAKE) --directory ../../ --silent version-full)
component_name := search-ui
container_name := ghcr.io/clemlesne/moaw-search/$(component_name)

install:
	npm install

upgrade:
	npm update

test:
	@echo "➡️ Scanning for outdated dependencies..."
	npm outdated

	@echo "➡️ Running NPM Lint..."
	npm run lint

	@echo "➡️ Running Hadolint..."
	find . -name "Dockerfile*" -exec bash -c "echo 'File {}:' && hadolint {}" \;

lint:
	@echo "➡️ Running NPM Lint..."
	npm run lint

	@echo "➡️ Running Hadolint..."
	find . -name "Dockerfile*" -exec bash -c "echo 'File {}:' && hadolint {}" \;

start:
	npm run dev

build:
	$(docker) build \
		--build-arg VERSION=$(version_full) \
		--tag $(container_name):$(version_small) \
		--tag $(container_name):latest \
		.
