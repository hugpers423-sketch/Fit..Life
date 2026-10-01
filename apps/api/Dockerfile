FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9 && pnpm install --no-frozen-lockfile
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
