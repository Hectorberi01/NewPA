FROM --platform=linux/arm64/v8 node:24-slim
WORKDIR /app

# deps
COPY package*.json ./
RUN npm install

# sources
COPY . .

# build
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]
