FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@9
COPY apps/web/package.json ./
RUN pnpm install --no-frozen-lockfile
COPY apps/web/ .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
