import mqtt, { MqttClient } from "mqtt";
import { logger } from "../utils/logger.js";
import { IoTIngestionService } from "./iotIngestion.service.js";
import { IoTTelemetryPayload } from "@smart-parking/shared";
import { env } from "../config/env.js";
import { iotTelemetrySchema, reservationStateAckSchema } from "@smart-parking/shared";
import fs from "node:fs";

let client: MqttClient | null = null;

export const initializeMqttClient = (): MqttClient | null => {
  const mqttBrokerUrl = env.MQTT_BROKER_URL;

  try {
    logger.info("🔌 Connecting to MQTT Broker / AWS IoT Core");

    client = mqtt.connect(mqttBrokerUrl, {
      clientId: env.MQTT_CLIENT_ID,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 10000,
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      ca: env.MQTT_CA_PATH ? fs.readFileSync(env.MQTT_CA_PATH) : undefined,
      cert: env.MQTT_CERT_PATH
        ? fs.readFileSync(env.MQTT_CERT_PATH)
        : undefined,
      key: env.MQTT_KEY_PATH ? fs.readFileSync(env.MQTT_KEY_PATH) : undefined,
    });

    client.on("connect", () => {
      logger.info("✅ MQTT Client Connected Successfully");
      // Includes device telemetry and state acknowledgements. Published state
      // commands are ignored by this consumer.
      client?.subscribe("parking/+/device/+/+", (err) => {
        if (!err) {
          logger.info("📡 Subscribed to MQTT topic: parking/+/device/+/+");
        } else {
          logger.error("Failed to subscribe to MQTT telemetry topic:", err);
        }
      });
    });

    client.on("message", async (topic, message) => {
      try {
        const topicParts = topic.split("/");
        if (
          message.byteLength > env.MQTT_MAX_MESSAGE_BYTES ||
          topicParts.length !== 5 ||
          topicParts[0] !== "parking" ||
          topicParts[2] !== "device"
        ) {
          throw new Error("Invalid MQTT topic or message size");
        }
        if (topicParts[4] === "availability") return;
        if (["state", "rfid-result"].includes(topicParts[4])) return;
        if (!["occupancy", "heartbeat", "rfid", "state-ack"].includes(topicParts[4])) {
          throw new Error("Unsupported MQTT topic suffix");
        }
        const parsed = JSON.parse(message.toString());
        if (topicParts[4] === "state-ack") {
          const ack = reservationStateAckSchema.parse(parsed);
          if (ack.parkingId !== topicParts[1] || ack.deviceId !== topicParts[3]) throw new Error("MQTT acknowledgement topic identity mismatch");
          logger.info(`State acknowledgement received from ${ack.deviceId}; revision=${ack.revision} applied=${ack.applied}`);
          const { ReservationStateService } = await import('./reservationState.service.js');
          await ReservationStateService.recordAck(ack);
          return;
        }
        const payload: IoTTelemetryPayload = iotTelemetrySchema.parse(parsed);
        if (topicParts[4] === "occupancy" && !payload.slots?.length) {
          throw new Error("Occupancy topic requires an explicit slots array");
        }
        if (topicParts[4] === "heartbeat" && payload.heartbeatOnly !== true) {
          throw new Error("Heartbeat topic requires heartbeatOnly=true");
        }
        if (
          (payload.parkingId || payload.parkingLocationId) !== topicParts[1] ||
          payload.deviceId !== topicParts[3]
        ) {
          throw new Error(
            "MQTT topic identity does not match payload identity",
          );
        }
        logger.info(`📥 Received MQTT message on topic ${topic}`);
        if (
          topicParts[4] === "rfid" &&
          payload.rfidUid &&
          payload.scannedSlotId
        ) {
          logger.info(`RFID request received from ${payload.deviceId}; scanId=${payload.scanId} slot=${payload.scannedSlotId}`);
          const result = await IoTIngestionService.processRFIDScan(payload);
          const resultTopic = `parking/${topicParts[1]}/device/${topicParts[3]}/rfid-result`;
          const resultPayload = JSON.stringify({ schemaVersion: 1, scanId: payload.scanId, deviceId: payload.deviceId, parkingId: payload.parkingId || payload.parkingLocationId, allowed: result.allowed, action: result.action, reason: 'reason' in result ? result.reason : undefined });
          client?.publish(resultTopic, resultPayload, { qos: 1, retain: false }, (error) => {
            if (error) logger.error(`RFID result publish failed; scanId=${payload.scanId}: ${error.message}`);
            else logger.info(`RFID result published; scanId=${payload.scanId} allowed=${result.allowed} action=${result.action}${'reason' in result && result.reason ? ` reason=${result.reason}` : ''}`);
          });
        } else if (topicParts[4] === "rfid") {
          throw new Error("RFID topic requires a UID, scanned slot, and scan ID");
        } else {
          await IoTIngestionService.processTelemetry(payload);
          if (topicParts[4] === "heartbeat") {
            const { ReservationStateService } = await import('./reservationState.service.js');
            await ReservationStateService.publishForDevice(payload.deviceId);
          }
        }
      } catch (err) {
        logger.error(`Error processing MQTT message on ${topic}:`, err);
      }
    });

    client.on("error", (err) => {
      logger.warn(
        `MQTT connection warning/error: ${err.message}. Telemetry ingestion is unavailable until MQTT reconnects.`,
      );
    });

    client.on('connect', async () => {
      try {
        const { ReservationStateService } = await import('./reservationState.service.js');
        await ReservationStateService.synchronizeAll();
      } catch (error) {
        logger.warn(`Could not synchronize reservation state after MQTT reconnect: ${(error as Error).message}`);
      }
    });

    return client;
  } catch (err) {
    logger.warn(`Could not initialize MQTT client: ${(err as Error).message}`);
    return null;
  }
};

export const getMqttClient = (): MqttClient | null => client;
