# Smart Parking Platform

An IoT-Cloud-Web Framework for Smart Parking with Real-Time Occupancy Prediction and Dynamic Allocation.

## One-time secure bootstrap

Public registration always creates a customer. Supply privileged credentials only through the command environment; neither command logs passwords or overwrites existing credentials.

```bash
ADMIN_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN ADMIN_BOOTSTRAP_NAME='Platform Admin' ADMIN_BOOTSTRAP_EMAIL='admin@example.com' ADMIN_BOOTSTRAP_PASSWORD='use-a-unique-long-password' npm run bootstrap:admin --workspace server

MANAGER_BOOTSTRAP_CONFIRM=CREATE_INITIAL_MANAGERS MANAGER_1_NAME='Manager One' MANAGER_1_EMAIL='manager1@example.com' MANAGER_1_PASSWORD='unique-long-password-one' MANAGER_1_FACILITY_ID='<facility-id>' MANAGER_2_NAME='Manager Two' MANAGER_2_EMAIL='manager2@example.com' MANAGER_2_PASSWORD='unique-long-password-two' MANAGER_2_FACILITY_ID='<facility-id>' npm run bootstrap:managers --workspace server

RFID_INVENTORY_CONFIRM=ADD_PHYSICAL_TAGS npm run bootstrap:rfid --workspace server
```

Both managers may be assigned to the same facility if that reflects the real deployment. Never commit the environment values above.

When no email provider is configured, a developer can generate a single-use, 30-minute reset link locally. This command is deliberately disabled outside development and no HTTP endpoint reveals reset tokens:

```bash
NODE_ENV=development LOCAL_RESET_CONFIRM=GENERATE_LOCAL_RESET LOCAL_RESET_EMAIL='customer@example.com' npm run password-reset:local --workspace server
```

## 🚀 Repository Structure

- `client/`: React + TypeScript + Vite + Tailwind CSS Frontend.
- `server/`: Node.js + Express + TypeScript + MongoDB + Redis + Socket.IO Backend.
- `shared/`: Shared TypeScript data models, Zod validation schemas, and enum contracts.
- `iot-simulator/`: Explicitly gated test-only MQTT publisher for an isolated test broker/facility; it is not part of normal startup.
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

Physical occupancy remains sensor-owned and separate from reservation blocking. See `HARDWARE_INTEGRATION.md` for the MQTT state/ack contract, RFID rules, LED priority, and firmware workflow. See `DEPLOYMENT_ENVIRONMENT.md` for secure first-Admin provisioning, Razorpay setup, and checkout policy variables.
# Smart-Parking_2.0
