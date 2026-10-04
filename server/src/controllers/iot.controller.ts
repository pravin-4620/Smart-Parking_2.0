import { Request, Response } from 'express';
import { IoTIngestionService } from '../iot/iotIngestion.service.js';
import { publishMqttMessage } from '../iot/mqttClient.js';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { logger } from '../utils/logger.js';

export class IoTController {
  public static async processTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const result = await IoTIngestionService.processTelemetry(payload);
      res.status(200).json(result);
    } catch (err) {
      logger.error('Telemetry REST ingestion error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  }

  public static async publishTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const parkingLocationId = payload.parkingId || payload.parkingLocationId || 'PARK001';
      const deviceId = payload.deviceId || 'ESP32-001';
      const topic = `parking/${parkingLocationId}/device/${deviceId}/occupancy`;

      await publishMqttMessage(topic, payload);
      res.status(200).json({ status: 'ok', topic, publishedPayload: payload });
    } catch (err) {
      logger.error('MQTT publish error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  }

  public static async listDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await IoTDevice.find().populate('parkingLocationId', 'name city');
      res.status(200).json({ data: devices });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
