.PHONY: version version-full build test start stop logs deploy

version_small ?= $(shell $(MAKE) --silent version)
version_full ?= $(shell $(MAKE) --silent version-full)

version:
	@bash ./cicd/version/version.sh -g . -c

version-full:
	@bash ./cicd/version/version.sh -g . -c -m

build:
	@make -C src/search-api build
	@make -C src/search-ui build

test:
	@make -C src/search-api test
	@make -C src/search-ui test

start:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs --follow

deploy:
	test -n "$(NAMESPACE)"  # $$NAMESPACE

	helm upgrade --install --wait --atomic --namespace $(NAMESPACE) --dependency-update default --values .values.yaml cicd/helm
