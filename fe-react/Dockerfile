FROM node:22-alpine as build-step
WORKDIR /usr/src/app
COPY . .

# ARG VITE_API_URL
# ENV VITE_API_URL=$VITE_API_URL

RUN npm install

# Copy environment file for build
COPY docker/develop/env .env

RUN CI=false npm run build

FROM nginx:1.10
ADD vhost.conf /etc/nginx/conf.d/default.conf
COPY --from=build-step ./usr/src/app/dist/ /var/www/