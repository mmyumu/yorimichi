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

# The maintained stable line, not a frozen version tag, and its Alpine packages upgraded at each build (libxslt and the like).
FROM nginx:stable-alpine
RUN apk upgrade --no-cache
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
