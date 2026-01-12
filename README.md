## Message Queue App (RabbitMQ + Redis + MongoDB + WebSocket)
This is a full-stack demo app that allows users to send messages, process them asynchronously using RabbitMQ, cache status in Redis, persist data in MongoDB, and stream live updates to the frontend via WebSocket.

## Run
1. ```docker compose up -d```
2. Go to backend, ```npm install```, then ```npm run dev-debug```, on new terminal ```npm run dev-queue```
3. Go to frontend, ```npm install```, then ```npm run dev```
