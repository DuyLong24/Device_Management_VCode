# Build Stage
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .
COPY docker/develop/env .env

RUN npm run build:main

EXPOSE 3000

CMD ["npm", "run", "start:main"]
