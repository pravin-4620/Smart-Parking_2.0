import mqtt, { MqttClient } from 'mqtt';
import { logger } from '../utils/logger.js';
import { IoTIngestionService } from './iotIngestion.service.js';
import { IoTTelemetryPayload } from '@smart-parking/shared';
import { RFIDService } from '../services/rfid.service.js';
import { env } from '../config/env.js';

let client: MqttClient | null = null;

export const initializeMqttClient = (): MqttClient | null => {
  const mqttBrokerUrl = env.MQTT_BROKER_URL;

  try {
    logger.info('🔌 Connecting to MQTT Broker / AWS IoT Core');

    client = mqtt.connect(mqttBrokerUrl, {
      clientId: `smart_parking_server_${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 10000,
    });

    client.on('connect', () => {
      logger.info('✅ MQTT Client Connected Successfully');
      // Subscribe to all hardware telemetry topics
      client?.subscribe('parking/+/device/+/+', (err) => {
        if (!err) {
          logger.info('📡 Subscribed to MQTT topic: parking/+/device/+/+');
        } else {
          logger.error('Failed to subscribe to MQTT telemetry topic:', err);
        }
      });
    });

    client.on('message', async (topic, message) => {
      try {
        const payload: IoTTelemetryPayload = JSON.parse(message.toString());
        const topicParts = topic.split('/');
        if (!payload.parkingId && !payload.parkingLocationId && topicParts.length >= 5) {
          payload.parkingId = topicParts[1];
        }
        if (!payload.deviceId && topicParts.length >= 5) {
          payload.deviceId = topicParts[3];
        }
        logger.info(`📥 Received MQTT message on topic ${topic}`);
        if (topicParts[4] === 'rfid' && payload.rfidUid && payload.eventType) {
          await RFIDService.processRFIDTap({
            parkingLocationId: payload.parkingId || payload.parkingLocationId || topicParts[1],
            deviceId: payload.deviceId,
            rfidUid: payload.rfidUid,
            eventType: payload.eventType,
          });
        } else {
          await IoTIngestionService.processTelemetry(payload);
        }
      } catch (err) {
        logger.error(`Error processing MQTT message on ${topic}:`, err);
      }
    });

    client.on('error', (err) => {
      logger.warn(`MQTT Connection warning/error: ${err.message}. Using REST ingestion fallback.`);
    });

    return client;
  } catch (err) {
    logger.warn(`Could not initialize MQTT client: ${(err as Error).message}`);
    return null;
  }
};

export const getMqttClient = (): MqttClient | null => client;

export const publishMqttMessage = (topic: string, message: object): Promise<boolean> => {
  return new Promise((resolve) => {
    if (client && client.connected) {
      client.publish(topic, JSON.stringify(message), { qos: 0 }, (err) => {
        if (err) {
          logger.error(`Failed to publish MQTT message to ${topic}:`, err);
          resolve(false);
        } else {
          logger.info(`📤 Published MQTT message to ${topic}`);
          resolve(true);
        }
      });
    } else {
      logger.info(`MQTT client not connected. Triggering internal direct ingestion for topic ${topic}`);
      // Fallback: direct ingestion when MQTT broker is offline
      IoTIngestionService.processTelemetry(message as IoTTelemetryPayload)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    }
  });
};
