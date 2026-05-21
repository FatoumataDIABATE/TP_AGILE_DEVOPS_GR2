FROM node:22.14-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY sql ./sql

EXPOSE 3001

CMD ["npm", "start"]