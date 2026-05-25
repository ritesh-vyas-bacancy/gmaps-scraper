FROM node:22-slim

RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build --workspace=packages/shared-types && \
    npm run build --workspace=apps/scraper-backend

RUN npx --yes playwright install --with-deps chromium

EXPOSE 4000

CMD ["node", "apps/scraper-backend/dist/index.js"]
