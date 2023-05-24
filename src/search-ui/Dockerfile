FROM docker.io/library/node:20-alpine3.17 as build

ARG VERSION
ENV VITE_VERSION=${VERSION}

RUN mkdir /app
WORKDIR /app

COPY . .

RUN npm install \
  && npm run build

FROM docker.io/library/nginx:1.23-alpine3.17

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
