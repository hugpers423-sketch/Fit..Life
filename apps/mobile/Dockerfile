FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mobile/package.json ./apps/mobile/
RUN npm install -g pnpm@9 && pnpm install --no-frozen-lockfile
COPY apps/mobile ./apps/mobile
EXPOSE 8081
CMD ["pnpm", "--filter=mobile", "start"]
