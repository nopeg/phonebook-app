FROM node:16-alpine

RUN apk add --no-cache mongodb-tools

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD sh -c "mongod --fork --logpath /var/log/mongod.log --dbpath /data/db && node server.js"