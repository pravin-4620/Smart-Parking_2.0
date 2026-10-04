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
| `RAZORPAY_KEY_ID` | Public identifier | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | Secret | Razorpay test key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret | Razorpay webhook signing secret |
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

The current simulator and backend accept a broker URL but do not yet configure mutual-TLS certificate paths. Adding AWS IoT mutual TLS is a future integration task, not an environment-only deployment step.

## Razorpay sandbox

Keep the key secret and webhook secret only on the backend hosting platform. The backend may return the test key ID to the browser as part of an order response; the secret values must never be included in client code or `VITE_*` variables.

## IoT simulator

Copy `iot-simulator/.env.example` to `iot-simulator/.env` for simulator-only settings. `PARKING_ID`, `DEVICE_ID`, `SLOT_ID`, and `OCCUPIED` describe the simulated event. `MQTT_BROKER_URL` selects the broker and may be sensitive if credentials are embedded in it.
