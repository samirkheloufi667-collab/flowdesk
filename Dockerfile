# Image unique pour l'hébergement (Render, Fly, un VPS…) : l'API NestJS sert
# aussi l'interface Next.js exportée en fichiers statiques. Une seule adresse,
# donc des cookies de premier niveau et aucun réglage CORS.
#   docker build -t flowdesk .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY apps apps
# L'interface appelle l'API sur la même origine.
ENV NEXT_PUBLIC_API_URL=/api NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/api && npm run build -w apps/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=10000 WEB_DIST=/app/apps/web/out
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api
COPY --from=build /app/apps/web/out apps/web/out
WORKDIR /app/apps/api
USER node
EXPOSE 10000
CMD ["sh", "scripts/start.sh"]
