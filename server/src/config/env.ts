import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/smart_parking"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().default("default-super-secret-jwt-key"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  MQTT_BROKER_URL: z.string().default("mqtt://localhost:1883"),
  MQTT_CLIENT_ID: z.string().default("smart-parking-backend"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CA_PATH: z.string().optional(),
  MQTT_CERT_PATH: z.string().optional(),
  MQTT_KEY_PATH: z.string().optional(),
  MQTT_MAX_MESSAGE_BYTES: z.coerce.number().int().positive().default(16384),
  IOT_ALLOW_AUTO_ENROLL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  IOT_DEVICE_OFFLINE_AFTER_MS: z.coerce.number().int().positive().default(120000),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_IOT_ENDPOINT: z.string().optional(),
  AWS_IOT_CLIENT_ID: z.string().optional(),
  REQUIRE_FINE_PAYMENT_BEFORE_EXIT: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  RFID_ENTRY_EARLY_MINUTES: z.coerce.number().int().min(0).max(1440).default(15),
  SENSOR_FRESHNESS_MS: z.coerce.number().int().positive().default(120000),
  LOCAL_DEMO_AUTO_CONFIRM: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);
