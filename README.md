## Message Queue Processing System
A fullstack message processing system built with Node.js, RabbitMQ, Redis, MongoDB, WebSocket, and React.
This project demonstrates reliable async processing, retry handling, DLQ, idempotency, and real-time UI updates

![Untitled Diagram](https://github.com/user-attachments/assets/d1429084-4c2d-4e1d-9a55-78c302cffa2e)


## Features
- Asynchronous message processing using RabbitMQ
- Automatic retries with delay (retry queue)
- Dead Letter Queue (DLQ) for failed messages
- Manual reprocessing of failed messages from UI
- Idempotent worker (safe against duplicate processing)
- Real-time status updates via WebSocket
- Redis-backed state cache for fast reads
- MongoDB persistence
- Integration tests with Mocha

## Tech Stacks
#### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- Redis
- RabbitMQ
- WebSocket
#### Frontend
- React
- Vite
- Tailwind CSS
#### Testing
- Mocha
- Chai

## Running Project
#### Requirement
- Node.js
- MongoDB
- Redis
- RabbitMQ
#### Main
```bash
docker compose up
```
#### Backend Setup
```bash
cd backend
npm install
npm run dev-debug
```
Run on a separate terminal
```bash
npm run dev-queue
```
#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
#### Test
```bash
npm run test
```
