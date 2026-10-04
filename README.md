# Smart Parking Platform

An IoT-Cloud-Web Framework for Smart Parking with Real-Time Occupancy Prediction and Dynamic Allocation.

## 🚀 Repository Structure

- `client/`: React + TypeScript + Vite + Tailwind CSS Frontend.
- `server/`: Node.js + Express + TypeScript + MongoDB + Redis + Socket.IO Backend.
- `shared/`: Shared TypeScript data models, Zod validation schemas, and enum contracts.
- `iot-simulator/`: Virtual IoT Device Simulator emitting ESP32 MQTT payloads to AWS IoT Core.
- `infrastructure/`: Deployment templates and infrastructure configs.
- `docs/`: System documentation and architectural specs.

## 🛠 Local Development Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Start MongoDB and Redis using Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Install all dependencies:
   ```bash
   npm install
   ```

4. Run type checks and build:
   ```bash
   npm run typecheck
   npm run build
   ```

5. Start dev environment:
   ```bash
   npm run dev
   ```
# Smart-Parking_2.0
