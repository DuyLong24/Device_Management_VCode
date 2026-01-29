FROM node:22-alpine as build-step
WORKDIR /usr/src/app
COPY . .

RUN npm install
RUN CI=false npm run build

FROM nginx:1.10
ADD vhost.conf /etc/nginx/conf.d/default.conf
COPY --from=build-step ./usr/src/app/dist/ /var/www/