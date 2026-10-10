import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { Types } from 'mongoose';
import { RFIDService } from '../services/rfid.service.js';
import { RFIDInventoryService } from '../services/rfidInventory.service.js';
import { Vehicle } from '../models/vehicle.model.js';

export const getRFIDCards = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const cards = await RFIDCard.find({ userId: new Types.ObjectId(userId) }).populate('vehicleId', 'licensePlate').sort({ createdAt: -1 });
    res.status(200).json({ data: cards });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch RFID cards', message: err.message });
  }
};

export const createRFIDCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const objectUserId = new Types.ObjectId(userId);
    const vehicle = await Vehicle.findOne({ userId: objectUserId }).sort({ isDefault: -1, createdAt: 1 });
    if (!vehicle) return res.status(409).json({ error: 'Register a vehicle before requesting an RFID card' });
    const card = await RFIDInventoryService.claimForCustomer(objectUserId, vehicle._id as Types.ObjectId);
    if (!card) return res.status(409).json({ error: 'No physical RFID cards are currently available', assignmentStatus: 'PENDING' });

    res.status(201).json({ message: 'Physical RFID card assigned successfully', assignmentStatus: 'ASSIGNED', data: card });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to link RFID card', message: err.message });
  }
};

export const processRFIDTap = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await RFIDService.processRFIDTap(req.body);
    res.status(result.allowed ? 200 : 403).json({ data: result });
  } catch (err: unknown) {
    res.status((err as any)?.statusCode || 400).json({
      error: 'RFID event processing failed',
      message: err instanceof Error ? err.message : 'Unknown RFID error',
    });
  }
};

export const deleteRFIDCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const card = await RFIDCard.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!card) {
      return res.status(404).json({ error: 'RFID card not found' });
    }

    res.status(200).json({ message: 'RFID Card deactivated. An administrator must release the physical card before reassignment.' });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to unlink RFID card', message: err.message });
  }
};
