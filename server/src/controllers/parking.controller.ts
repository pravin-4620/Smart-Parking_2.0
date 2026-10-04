import { Request, Response } from 'express';
import {
  getNearbyParkingLocations,
  getParkingLocationById,
  createParkingLocation,
  updateParkingLocation,
  deleteParkingLocation,
  getSlotsByLocation,
  createParkingSlot,
  createBatchParkingSlots,
  updateParkingSlot,
} from '../services/parking.service.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';

export const getNearbyParking = async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radius ? Number(req.query.radius) : 10;
    const slotType = req.query.slotType as any;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid latitude (lat) and longitude (lng) are required' });
    }

    const nearby = await getNearbyParkingLocations({ lat, lng, radius, slotType });
    res.status(200).json({ count: nearby.length, data: nearby });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search nearby parking', message: (error as Error).message });
  }
};

export const getAllParkingLocations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let filter = {};
    if (req.user && req.user.role === UserRole.PARKING_MANAGER) {
      filter = { managerIds: req.user.id };
    }

    const locations = await ParkingLocation.find(filter).lean();
    res.status(200).json({ count: locations.length, data: locations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parking locations' });
  }
};

export const getParkingLocationDetails = async (req: Request, res: Response) => {
  try {
    const location = await getParkingLocationById(req.params.id);
    res.status(200).json({ data: location });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
};

export const handleCreateParkingLocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const location = await createParkingLocation(req.body);
    res.status(201).json({ message: 'Parking location created successfully', data: location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create parking location', message: (error as Error).message });
  }
};

export const handleUpdateParkingLocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const location = await updateParkingLocation(req.params.id, req.body, {
      userId: req.user.id,
      role: req.user.role,
    });

    res.status(200).json({ message: 'Parking location updated successfully', data: location });
  } catch (error) {
    const status = (error as Error).message.includes('Forbidden') ? 403 : 500;
    res.status(status).json({ error: (error as Error).message });
  }
};

export const handleDeleteParkingLocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deleteParkingLocation(req.params.id);
    res.status(200).json({ message: 'Parking location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const handleGetSlots = async (req: Request, res: Response) => {
  try {
    const slots = await getSlotsByLocation(req.params.locationId);
    res.status(200).json({ count: slots.length, data: slots });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

export const handleCreateSlot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const slot = await createParkingSlot(req.params.locationId, req.body, {
      userId: req.user.id,
      role: req.user.role,
    });

    res.status(201).json({ message: 'Slot created successfully', data: slot });
  } catch (error) {
    const status = (error as Error).message.includes('Forbidden') ? 403 : 500;
    res.status(status).json({ error: (error as Error).message });
  }
};

export const handleBatchCreateSlots = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { prefix = 'A-', count = 10, slotType = 'REGULAR' } = req.body;
    const slots = await createBatchParkingSlots(req.params.locationId, prefix, count, slotType, {
      userId: req.user.id,
      role: req.user.role,
    });

    res.status(201).json({ message: `${slots.length} slots created successfully`, data: slots });
  } catch (error) {
    const status = (error as Error).message.includes('Forbidden') ? 403 : 500;
    res.status(status).json({ error: (error as Error).message });
  }
};

export const handleUpdateSlot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const slot = await updateParkingSlot(req.params.slotId, req.body, {
      userId: req.user.id,
      role: req.user.role,
    });

    res.status(200).json({ message: 'Slot updated successfully', data: slot });
  } catch (error) {
    const status = (error as Error).message.includes('Forbidden') ? 403 : 500;
    res.status(status).json({ error: (error as Error).message });
  }
};
