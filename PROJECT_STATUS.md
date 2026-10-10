# Project Status: Smart Parking IoT Framework

**Project Title:** An IoT-Cloud-Web Framework for Smart Parking with Real-Time Occupancy Prediction and Dynamic Allocation  
**Target Deadline:** October 10, 2026  
**Status:** Initializing Architecture & Phase 0  

---

## 🏗 System Architecture Overview

```
[ User ]
   │
   ▼
[ React Web Application (TypeScript + Vite + Tailwind) ]
   │                              ▲
   │ (REST API)                   │ (Socket.IO Real-time Events)
   ▼                              │
[ Node.js / Express API Backend (TypeScript) ]
   │                              │
   ├──────► [ MongoDB ] ──────────┤
   │                              │
   └──────► [ Redis / BullMQ ] ───┘
                  ▲
                  │ (AWS SDK / MQTT Bridge / IoT Processing)
                  │
[ AWS IoT Core / MQTT Broker ]
   ▲                      ▲
   │ (MQTT)               │ (MQTT)
[ Authenticated ESP32 Hardware ]
```

---

## 👥 Roles & Role-Based Access Control (RBAC)

1. **`USER`**: Register, browse nearby parking lots, map view, real-time slot availability, automatic/manual slot selection, dynamic pricing view, spot reservation, Razorpay sandbox payment, booking history, RFID association to vehicle, notifications & receipts.
2. **`PARKING_MANAGER`**: View assigned parking locations, slot management, active reservations & sessions, rate rules & dynamic pricing configuration, IoT device management, sensor event logs, live occupancy monitoring, analytics & reports.
3. **`ADMIN`**: Platform-wide user management, manager assignments, full parking lot creation/edits, slot allocation rules, system-wide pricing, device management, financial overview & payments, audit logs, global system configuration.

---

## 📦 Project Structure Strategy

- `backend/`: Express, TypeScript, Mongoose, Socket.IO, Zod validation, JWT/bcrypt, BullMQ/Redis, AWS SDK v3.
- `frontend/`: React 18/19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router, Socket.IO Client, Recharts, Framer Motion.
- `iot-simulator/`: Test-only publisher gated by `NODE_ENV=test`, a separate broker URL, and an explicit enable flag.
- `docker-compose.yml`: Local infrastructure orchestration (MongoDB, Redis, authenticated Mosquitto).

---

## 🚦 Execution Roadmap & Phases

- [x] **Phase 0: Project Architecture & Setup** (Repository inspection, architectural blueprint, status tracking setup)
- [ ] **Phase 1: Project Initialization & Monorepo/Workspace Config** (Package management, tsconfigs, ESLint/Prettier, Docker Compose baseline)
- [ ] **Phase 2: Backend Core, Database Models & RBAC Authentication** (User/Manager/Admin schemas, JWT auth, Zod validation middleware)
- [x] **Phase 3: Physical IoT Ingestion Gateway** (authenticated MQTT, enrolled device and slot authorization, sensor state engine)
- [ ] **Phase 4: Real-Time Event Engine & Socket.IO Telemetry** (Real-time slot updates, state changes broadcast to frontend)
- [ ] **Phase 5: Core Parking Management & Dynamic Allocation Logic** (Parking lots, slots, spatial allocation algorithms, dynamic pricing engine)
- [ ] **Phase 6: User Reservations, Booking Workflow & Razorpay Sandbox** (Slot hold timer, Razorpay order/payment verification, booking receipts)
- [ ] **Phase 7: Frontend Web Application Development** (React + Vite + Tailwind dashboard views for User, Manager, Admin)
- [ ] **Phase 8: Real-Time Occupancy Prediction & Analytics** (Time-series data processing, predictive occupancy algorithms, manager/admin charts)
- [ ] **Phase 9: Comprehensive Integration, Testing & Verification** (End-to-end simulation test suite, verification against compilation & runtime requirements)

---

## 📝 Recent Activity
- Initialized `PROJECT_STATUS.md` with full architecture design and execution plan.
- Prepared workspace for modular step-by-step implementation.
