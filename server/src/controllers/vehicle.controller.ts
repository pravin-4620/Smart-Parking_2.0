import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Vehicle } from '../models/vehicle.model.js';
import { Types } from 'mongoose';

export const getVehicles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const vehicles = await Vehicle.find({ userId: new Types.ObjectId(userId) }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({ data: vehicles });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch vehicles', message: err.message });
  }
};

export const createVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { licensePlate, make, model, color, vehicleType, isDefault } = req.body;

    if (isDefault) {
      await Vehicle.updateMany({ userId: new Types.ObjectId(userId) }, { $set: { isDefault: false } });
    }

    const vehicle = await Vehicle.create({
      userId: new Types.ObjectId(userId),
      licensePlate,
      make,
      model,
      color,
      vehicleType,
      isDefault: !!isDefault,
    });

    res.status(201).json({ message: 'Vehicle added successfully', data: vehicle });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to add vehicle', message: err.message });
  }
};

export const updateVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { make, model, color, vehicleType, isDefault } = req.body;

    if (isDefault) {
      await Vehicle.updateMany({ userId: new Types.ObjectId(userId) }, { $set: { isDefault: false } });
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: { make, model, color, vehicleType, isDefault } },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.status(200).json({ message: 'Vehicle updated successfully', data: vehicle });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to update vehicle', message: err.message });
  }
};

export const deleteVehicle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const vehicle = await Vehicle.findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.status(200).json({ message: 'Vehicle removed successfully' });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to delete vehicle', message: err.message });
  }
};
