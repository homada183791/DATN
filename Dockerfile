FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    python3-pip \
    nodejs \
    npm \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
