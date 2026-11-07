FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
# The title's code verifier only: the photos are mounted on the VPS, never built in.
COPY public/access.json ./public/access.json
# The home-screen install: manifest and icons (scripts/make-icons.mjs).
COPY public/manifest.webmanifest public/icon-192.png public/icon-512.png ./public/
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
