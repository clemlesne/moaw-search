version:
	@bash ./cicd/version/version.sh -g . -c

version-full:
	@bash ./cicd/version/version.sh -g . -c -m

build:
	@make -C src/search-api build
	@make -C src/search-ui build

start:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs --follow
