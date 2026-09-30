FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY --from=server-build /app/server/dist ./dist
COPY --from=client /app/client/dist ./public
RUN mkdir -p uploads && chown -R node:node /app/server
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
