import { Request, Response } from "express";
import { IoTDevice } from "../models/ioTDevice.model.js";

export class IoTController {
  public static async listDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await IoTDevice.find().populate(
        "parkingLocationId",
        "name city",
      );
      res.status(200).json({ data: devices });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
