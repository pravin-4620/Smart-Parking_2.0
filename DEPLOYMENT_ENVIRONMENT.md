# Deployment Environment Configuration

This repository keeps local development defaults unchanged. Copy example files to local, ignored `.env` files as needed; never commit real credentials.

## Vercel frontend

Configure only browser-safe values:

| Variable | Purpose | Local example | Production |
| --- | --- | --- | --- |
| `VITE_API_URL` | Public base URL for REST and Socket.IO | `http://localhost:5000/api` | Public HTTPS URL of the separately hosted backend, ending in `/api` |

Every `VITE_*` value is embedded in the browser bundle. Database URLs, JWT secrets, payment secrets, AWS credentials, and certificate material must never use this prefix.

## Backend hosting platform

Configure these on the backend service, not in Vercel's frontend project:

| Variable | Sensitivity | Production source/purpose |
| --- | --- | --- |
| `PORT` | Public configuration | Usually injected by the hosting platform |
| `NODE_ENV` | Public configuration | `production` |
| `CLIENT_URL` | Public configuration | Deployed Vercel frontend origin, used by CORS |
| `MONGODB_URI` | Secret | MongoDB Atlas connection string |
| `REDIS_URL` | Secret | Hosted Redis connection string, normally including credentials/TLS |
| `JWT_SECRET` | Secret | Long, randomly generated signing secret |
| `JWT_EXPIRES_IN` | Public configuration | Token lifetime such as `7d` |
| `MQTT_BROKER_URL` | Potentially secret | MQTT/AWS IoT broker URL; treat it as secret if it embeds credentials |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | Secret | Backend credentials limited to telemetry reads and reservation-state command writes |
| `IOT_ALLOW_AUTO_ENROLL` | Public configuration | Must remain `false` outside isolated tests |
| `IOT_DEVICE_OFFLINE_AFTER_MS` | Public configuration | Heartbeat timeout before device and assigned occupancy become unavailable |
| `RAZORPAY_KEY_ID` | Public identifier | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | Secret | Razorpay test key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret | Razorpay webhook signing secret |
| `PAYMENT_TEST_MODE` | Public configuration | Must remain `false` outside isolated automated tests |
| `REQUIRE_FINE_PAYMENT_BEFORE_EXIT` | Public configuration | Defaults to `true`; checkout remains blocked until a due fine is verified paid |
| `RFID_ENTRY_EARLY_MINUTES` | Public configuration | Permitted early-entry window; defaults to 15 minutes |
| `SENSOR_FRESHNESS_MS` | Public configuration | Maximum sensor age accepted for booking and physical exit verification |
| `AWS_REGION` | Public configuration | AWS IoT Core region |
| `AWS_IOT_ENDPOINT` | Public configuration | Account-specific AWS IoT data endpoint |
| `AWS_IOT_CLIENT_ID` | Public configuration | Unique backend MQTT client ID |
| `AWS_ACCESS_KEY_ID` | Sensitive identifier | Only if a future server-side AWS SDK integration requires IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | Secret | Only if that future integration requires IAM credentials; prefer an attached workload role |

The current backend MQTT client consumes `MQTT_BROKER_URL`. The `AWS_*` settings are declared for future integration but are not currently consumed by an AWS SDK or used to configure MQTT TLS certificates.

## MongoDB Atlas

Create a database user and network access policy in Atlas, then store the resulting connection string only as the backend host's `MONGODB_URI`. Do not expose it through Vite or commit it to an env file.

## Hosted Redis

Store the provider connection string only as the backend host's `REDIS_URL`. Use the provider's TLS URL when required. Do not expose it to the frontend.

## AWS IoT Core and physical ESP32

The physical device will need its AWS IoT endpoint, a unique client ID, CA certificate, device certificate, and device private key. Provision certificate files directly onto the device through a secure process. They are not frontend variables and must not be committed. The repository ignores common certificate and private-key file extensions and `certs/` directories.

The backend supports username/password authentication for local Mosquitto and optional mutual-TLS certificate paths for a cloud broker. Runtime ingestion always requires an existing active device with an exact facility and slot assignment; there is no fallback facility or automatic enrollment.

## Razorpay

Keep the key secret and webhook secret only on the backend hosting platform. The backend creates real Razorpay orders, verifies checkout signatures using constant-time comparison, verifies webhooks against the raw request body, and processes duplicates idempotently. It may return the public key ID to the browser; secrets must never appear in client code or `VITE_*` variables. If credentials are absent, payment endpoints return service unavailable and never fabricate success. `PAYMENT_TEST_MODE=true` is accepted only under `NODE_ENV=test`.

Configure a Razorpay webhook for `/api/payments/webhook` with `payment.captured` and `payment.failed`. Reservation and fine amounts always come from backend snapshots.

## First Admin bootstrap

Public registration always creates a Customer. When no Admin exists, provision exactly one with this protected environment command. It refuses to run once an Admin exists and never prints the password:

```bash
ADMIN_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN \
ADMIN_BOOTSTRAP_NAME='Platform Administrator' \
ADMIN_BOOTSTRAP_EMAIL='admin@example.com' \
ADMIN_BOOTSTRAP_PASSWORD='<a unique password of at least 12 characters>' \
npm run bootstrap:admin --workspace=server
```

After bootstrap, Admins create and assign Managers through authenticated APIs. Sensitive role, account, and assignment changes are audit logged.

## Google Maps browser configuration

Set `VITE_GOOGLE_MAPS_API_KEY` for the Vite frontend locally and in Vercel. This browser-visible key is public configuration, not a server secret. Restrict it in Google Cloud Console to the Maps JavaScript API and the exact allowed HTTP referrers for local development and production. The Nearby Parking page continues to show facility cards if Maps fails to load or location permission is denied.

## Test-only MQTT publisher

The `iot-simulator` workspace is retained only for isolated automated testing. It refuses to run unless `NODE_ENV=test`, `IOT_TEST_SIMULATOR_ENABLED=true`, and a separate `IOT_TEST_BROKER_URL` are supplied. Never configure it with the live facility or broker.
