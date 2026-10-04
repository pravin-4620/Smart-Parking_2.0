import mongoose, { Types } from 'mongoose';
import { ParkingLocation, IParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot, IParkingSlot } from '../models/parkingSlot.model.js';
import { PricingProfile } from '../models/pricingProfile.model.js';
import {
  CreateParkingLocationInput,
  UpdateParkingLocationInput,
  CreateParkingSlotInput,
  UpdateParkingSlotInput,
  NearbyQueryInput,
  NearbyParkingResponse,
  UserRole,
  SlotStatus,
  ParkingStatus,
} from '@smart-parking/shared';

// Utility to check if a location is currently open based on operating hours
const isLocationOpen = (operatingHours?: { openTime: string; closeTime: string; is24x7: boolean }): 'OPEN' | 'CLOSED' => {
  if (!operatingHours || operatingHours.is24x7) return 'OPEN';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = operatingHours.openTime.split(':').map(Number);
  const [closeH, closeM] = operatingHours.closeTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (openMinutes <= closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes ? 'OPEN' : 'CLOSED';
  } else {
    // Overnight operating hours e.g. 20:00 to 06:00
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes ? 'OPEN' : 'CLOSED';
  }
};

export const getNearbyParkingLocations = async (
  query: NearbyQueryInput
): Promise<NearbyParkingResponse[]> => {
  const { lat, lng, radius = 10, slotType } = query;
  const radiusInMeters = radius * 1000;

  // Aggregation pipeline using $geoNear
  const pipeline: any[] = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'distanceInMeters',
        maxDistance: radiusInMeters,
        spherical: true,
      },
    },
    {
      $lookup: {
        from: 'parkingslots',
        localField: '_id',
        foreignField: 'parkingLocationId',
        as: 'slots',
      },
    },
    {
      $lookup: {
        from: 'pricingprofiles',
        localField: '_id',
        foreignField: 'parkingLocationId',
        as: 'pricing',
      },
    },
  ];

  const locations = await ParkingLocation.aggregate(pipeline);

  return locations.map((loc: any) => {
    let slots = loc.slots || [];
    if (slotType) {
      slots = slots.filter((s: any) => s.slotType === slotType);
    }

    const activeSlots = slots.filter((s: any) => s.isActive !== false);
    const totalSlots = activeSlots.length;
    const availableSlots = activeSlots.filter((s: any) => s.status === SlotStatus.AVAILABLE).length;
    const occupancy = totalSlots > 0 ? Math.round(((totalSlots - availableSlots) / totalSlots) * 100) : 0;

    const pricing = loc.pricing && loc.pricing.length > 0 ? loc.pricing[0] : null;
    const startingPrice = pricing ? pricing.baseHourlyRate : 40;

    const distanceInKm = Math.round((loc.distanceInMeters / 1000) * 100) / 100;

    return {
      parkingId: loc._id.toString(),
      name: loc.name,
      description: loc.description,
      distance: distanceInKm,
      address: loc.address,
      city: loc.city,
      coordinates: loc.geoLocation.coordinates,
      availableSlots,
      totalSlots,
      occupancy,
      startingPrice,
      status: loc.status || ParkingStatus.ACTIVE,
      operatingStatus: isLocationOpen(loc.operatingHours),
      operatingHours: loc.operatingHours || { openTime: '00:00', closeTime: '23:59', is24x7: true },
      features: loc.features || [],
    };
  });
};

export const getParkingLocationById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid Parking Location ID');
  }

  const location = await ParkingLocation.findById(id).lean();
  if (!location) {
    throw new Error('Parking location not found');
  }

  const slots = await ParkingSlot.find({ parkingLocationId: id }).lean();
  const pricingProfile = await PricingProfile.findOne({ parkingLocationId: id, isActive: true }).lean();

  const totalSlots = slots.length;
  const availableSlots = slots.filter((s) => s.status === SlotStatus.AVAILABLE && s.isActive).length;
  const occupiedSlots = slots.filter((s) => s.status === SlotStatus.OCCUPIED && s.isActive).length;
  const reservedSlots = slots.filter((s) => s.status === SlotStatus.RESERVED && s.isActive).length;

  return {
    ...location,
    id: location._id.toString(),
    operatingStatus: isLocationOpen(location.operatingHours),
    pricingProfile,
    slots,
    slotStats: {
      total: totalSlots,
      available: availableSlots,
      occupied: occupiedSlots,
      reserved: reservedSlots,
    },
  };
};

export const createParkingLocation = async (
  input: CreateParkingLocationInput
): Promise<IParkingLocation> => {
  const { longitude, latitude, ...rest } = input;

  const location = await ParkingLocation.create({
    ...rest,
    geoLocation: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  });

  // Create default pricing profile for location
  await PricingProfile.create({
    parkingLocationId: location._id,
    name: `${location.name} Standard Rates`,
    version: 1,
    baseHourlyRate: 50,
    minimumCharge: 20,
    maximumDailyCharge: 500,
    isActive: true,
  });

  return location;
};

export const updateParkingLocation = async (
  id: string,
  input: UpdateParkingLocationInput,
  user: { userId: string; role: UserRole }
) => {
  const location = await ParkingLocation.findById(id);
  if (!location) {
    throw new Error('Parking location not found');
  }

  // Check authorization: PARKING_MANAGER can only update assigned parking location
  if (user.role === UserRole.PARKING_MANAGER) {
    const isAssigned = location.managerIds.some((mId) => mId.toString() === user.userId);
    if (!isAssigned) {
      throw new Error('Forbidden: You are not assigned to manage this parking location');
    }
  }

  const { longitude, latitude, ...rest } = input;

  if (longitude !== undefined && latitude !== undefined) {
    location.geoLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }

  Object.assign(location, rest);
  await location.save();
  return location;
};

export const deleteParkingLocation = async (id: string) => {
  const location = await ParkingLocation.findByIdAndDelete(id);
  if (!location) {
    throw new Error('Parking location not found');
  }
  await ParkingSlot.deleteMany({ parkingLocationId: id });
  return location;
};

export const getSlotsByLocation = async (locationId: string) => {
  return ParkingSlot.find({ parkingLocationId: locationId }).sort({ slotNumber: 1 });
};

export const createParkingSlot = async (
  locationId: string,
  input: CreateParkingSlotInput,
  user: { userId: string; role: UserRole }
) => {
  const location = await ParkingLocation.findById(locationId);
  if (!location) {
    throw new Error('Parking location not found');
  }

  if (user.role === UserRole.PARKING_MANAGER) {
    const isAssigned = location.managerIds.some((mId) => mId.toString() === user.userId);
    if (!isAssigned) {
      throw new Error('Forbidden: You are not assigned to manage this parking location');
    }
  }

  return ParkingSlot.create({
    parkingLocationId: location._id,
    slotNumber: input.slotNumber,
    slotType: input.slotType || 'REGULAR',
    sensorId: input.sensorId,
    deviceId: input.deviceId ? new Types.ObjectId(input.deviceId) : undefined,
    isActive: input.isActive ?? true,
    status: SlotStatus.AVAILABLE,
  });
};

export const createBatchParkingSlots = async (
  locationId: string,
  prefix: string,
  count: number,
  slotType: string,
  user: { userId: string; role: UserRole }
) => {
  const location = await ParkingLocation.findById(locationId);
  if (!location) {
    throw new Error('Parking location not found');
  }

  if (user.role === UserRole.PARKING_MANAGER) {
    const isAssigned = location.managerIds.some((mId) => mId.toString() === user.userId);
    if (!isAssigned) {
      throw new Error('Forbidden: You are not assigned to manage this parking location');
    }
  }

  const slotsToCreate = [];
  for (let i = 1; i <= count; i++) {
    const slotNumber = `${prefix}${100 + i}`;
    slotsToCreate.push({
      parkingLocationId: location._id,
      slotNumber,
      slotType: slotType || 'REGULAR',
      status: SlotStatus.AVAILABLE,
      isActive: true,
    });
  }

  return ParkingSlot.insertMany(slotsToCreate);
};

export const updateParkingSlot = async (
  slotId: string,
  input: UpdateParkingSlotInput,
  user: { userId: string; role: UserRole }
) => {
  const slot = await ParkingSlot.findById(slotId);
  if (!slot) {
    throw new Error('Parking slot not found');
  }

  const location = await ParkingLocation.findById(slot.parkingLocationId);
  if (location && user.role === UserRole.PARKING_MANAGER) {
    const isAssigned = location.managerIds.some((mId) => mId.toString() === user.userId);
    if (!isAssigned) {
      throw new Error('Forbidden: You are not assigned to manage this parking location');
    }
  }

  Object.assign(slot, input);
  await slot.save();
  return slot;
};
