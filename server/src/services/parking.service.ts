import mongoose, { Types } from 'mongoose';
import { ParkingLocation, IParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot, IParkingSlot } from '../models/parkingSlot.model.js';
import { PricingProfile } from '../models/pricingProfile.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { User } from '../models/user.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { env } from '../config/env.js';
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
  ReservationStatus,
  SessionStatus,
  AuthorizedSlotDetails,
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
    {
      $lookup: {
        from: 'reservations',
        let: { locationId: '$_id' },
        pipeline: [{ $match: { $expr: { $eq: ['$parkingLocationId', '$$locationId'] }, status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE, ReservationStatus.CHECKOUT_PENDING] }, endTime: { $gt: new Date() } } }],
        as: 'blockingReservations',
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
    const blockedSlotIds = new Set((loc.blockingReservations || []).map((reservation: any) => reservation.slotId.toString()));
    const occupiedSessionSlotIds = new Set((loc.blockingReservations || []).filter((reservation: any) => reservation.status === ReservationStatus.ACTIVE || reservation.status === ReservationStatus.CHECKOUT_PENDING).map((reservation: any) => reservation.slotId.toString()));
    const totalSlots = activeSlots.length;
    const availableSlots = activeSlots.filter((s: any) => s.status !== SlotStatus.UNKNOWN && !blockedSlotIds.has(s._id.toString())).length;
    const occupiedSlots = activeSlots.filter((s: any) => occupiedSessionSlotIds.has(s._id.toString())).length;
    const unknownSlots = activeSlots.filter((s: any) => s.status === SlotStatus.UNKNOWN).length;
    const knownPhysicalSlots = availableSlots + occupiedSlots;
    const occupancy = knownPhysicalSlots > 0 ? Math.round((occupiedSlots / knownPhysicalSlots) * 100) : null;
    const telemetryStatus = unknownSlots === totalSlots ? 'UNAVAILABLE' : unknownSlots > 0 ? 'PARTIAL' : 'LIVE';

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
      unknownSlots,
      occupancy,
      telemetryStatus,
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
  const blockedSlotIds = new Set((await Reservation.distinct('slotId', { parkingLocationId: id, status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE, ReservationStatus.CHECKOUT_PENDING] } })).map((slotId) => slotId.toString()));
  const pricingProfile = await PricingProfile.findOne({ parkingLocationId: id, isActive: true }).lean();

  const totalSlots = slots.length;
  const availableSlots = slots.filter((s) => s.status === SlotStatus.AVAILABLE && !blockedSlotIds.has(s._id.toString()) && s.isActive).length;
  const occupiedSlots = slots.filter((s) => s.status === SlotStatus.OCCUPIED && s.isActive).length;
  const reservedSlots = slots.filter((s) => blockedSlotIds.has(s._id.toString()) && s.isActive).length;
  const unknownSlots = slots.filter((s) => s.status === SlotStatus.UNKNOWN && s.isActive).length;

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
      unknown: unknownSlots,
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
  const slots = await ParkingSlot.find({ parkingLocationId: locationId })
    .select('_id parkingLocationId slotNumber status slotType isActive sensorId deviceId lastSensorUpdate currentReservationId')
    .sort({ slotNumber: 1 }).lean();
  const blockingReservations = await Reservation.find({
    parkingLocationId: locationId,
    endTime: { $gt: new Date() },
    status: { $in: [ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.PENDING_PAYMENT, ReservationStatus.PAYMENT_FAILED, ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE, ReservationStatus.CHECKOUT_PENDING] },
  }).select('slotId status').lean();
  const reservationBySlot = new Map(blockingReservations.map((reservation) => [reservation.slotId.toString(), reservation.status]));
  const devices = await IoTDevice.find({ parkingLocationId: locationId, isActive: true }).select('_id deviceId status lastHeartbeat lastMessageAt').lean();
  const deviceById = new Map(devices.map((device) => [device._id.toString(), device]));
  const now = Date.now();
  return slots.map(({ currentReservationId, ...slot }) => ({
    ...slot,
    ...(() => {
      const reservationStatus = reservationBySlot.get(slot._id.toString());
      const device = slot.deviceId ? deviceById.get(slot.deviceId.toString()) : undefined;
      const telemetryFresh = Boolean(slot.lastSensorUpdate && now - slot.lastSensorUpdate.getTime() <= env.SENSOR_FRESHNESS_MS);
      const physicalStatus = !device || device.status !== 'ONLINE' || !telemetryFresh ? SlotStatus.UNKNOWN : slot.status;
      const reservationBlocked = reservationStatus === ReservationStatus.PENDING_CONFIRMATION || reservationStatus === ReservationStatus.CONFIRMED || reservationStatus === ReservationStatus.ACTIVE || reservationStatus === ReservationStatus.CHECKOUT_PENDING;
      const displayStatus = reservationStatus === ReservationStatus.ACTIVE || reservationStatus === ReservationStatus.CHECKOUT_PENDING
        ? SlotStatus.OCCUPIED
        : reservationBlocked
          ? SlotStatus.RESERVED
          : physicalStatus === SlotStatus.UNKNOWN ? SlotStatus.UNKNOWN : SlotStatus.AVAILABLE;
      const bookingBlocked = Boolean(reservationStatus);
      const available = slot.isActive && physicalStatus !== SlotStatus.UNKNOWN && !bookingBlocked;
      return {
        physicalStatus,
        reservationStatus: reservationStatus ?? null,
        reservationBlocked,
        bookingBlocked,
        deviceId: device?.deviceId ?? null,
        deviceStatus: device?.status ?? 'OFFLINE',
        lastTelemetryAt: slot.lastSensorUpdate?.toISOString() ?? null,
        telemetryFresh,
        available,
        status: displayStatus,
      };
    })(),
  }));
};

export const getAuthorizedSlotsByLocation = async (
  locationIds: (string | Types.ObjectId)[]
): Promise<AuthorizedSlotDetails[]> => {
  const objectIds = locationIds.map((id) => (typeof id === 'string' ? new Types.ObjectId(id) : id));
  const slots = await ParkingSlot.find({ parkingLocationId: { $in: objectIds } })
    .sort({ slotNumber: 1 })
    .lean();

  if (slots.length === 0) return [];

  const slotIds = slots.map((s) => s._id);

  // 1. Fetch active/confirmed reservations for these slots
  const reservationFilter: Record<string, any> = {
    slotId: { $in: slotIds },
    status: { $in: [ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PAYMENT, ReservationStatus.ACTIVE, ReservationStatus.CHECKOUT_PENDING] },
  };
  const reservations = await Reservation.find(reservationFilter).sort({ createdAt: -1 }).lean();

  // 2. Fetch active sessions for these slots
  const sessions = await ParkingSession.find({
    slotId: { $in: slotIds },
    status: { $in: [SessionStatus.ACTIVE, SessionStatus.CHECKOUT_PENDING, SessionStatus.OVERSTAY] },
  })
    .sort({ checkInTime: -1 })
    .lean();

  // 3. Collect userIds & vehicleIds to batch fetch
  const userIds = new Set<string>();
  const vehicleIds = new Set<string>();

  reservations.forEach((r) => {
    if (r.userId) userIds.add(r.userId.toString());
    if (r.vehicleId) vehicleIds.add(r.vehicleId.toString());
  });

  sessions.forEach((s) => {
    if (s.userId) userIds.add(s.userId.toString());
    if (s.vehicleId) vehicleIds.add(s.vehicleId.toString());
  });

  const [users, vehicles] = await Promise.all([
    User.find(
      { _id: { $in: Array.from(userIds).map((id) => new Types.ObjectId(id)) } },
      'name email phone'
    ).lean(),
    Vehicle.find({
      _id: { $in: Array.from(vehicleIds).map((id) => new Types.ObjectId(id)) },
    }).lean(),
  ]);

  // Fallback vehicles for users who didn't attach vehicleId directly to reservation
  const usersWithoutVehicle = Array.from(userIds).filter(
    (uId) => !vehicles.some((v) => v.userId.toString() === uId)
  );
  let fallbackVehicles: any[] = [];
  if (usersWithoutVehicle.length > 0) {
    fallbackVehicles = await Vehicle.find({
      userId: { $in: usersWithoutVehicle.map((id) => new Types.ObjectId(id)) },
    }).lean();
  }

  const userMap = new Map<string, any>();
  users.forEach((u) => userMap.set(u._id.toString(), u));

  const vehicleMap = new Map<string, any>();
  vehicles.forEach((v) => vehicleMap.set(v._id.toString(), v));

  const userFallbackVehicleMap = new Map<string, any>();
  [...vehicles, ...fallbackVehicles].forEach((v) => {
    if (!userFallbackVehicleMap.has(v.userId.toString()) || v.isDefault) {
      userFallbackVehicleMap.set(v.userId.toString(), v);
    }
  });

  // Map reservation per slot
  const slotReservationMap = new Map<string, any>();
  reservations.forEach((r) => {
    const sId = r.slotId?.toString();
    if (sId && !slotReservationMap.has(sId)) {
      slotReservationMap.set(sId, r);
    }
  });
  // Map session per slot
  const slotSessionMap = new Map<string, any>();
  sessions.forEach((s) => {
    const sId = s.slotId?.toString();
    if (sId && !slotSessionMap.has(sId)) {
      slotSessionMap.set(sId, s);
    }
  });

  // Construct authorized slot details DTOs
  return slots.map((slot) => {
    const sId = slot._id.toString();
    const reservation =
      slot.status === SlotStatus.RESERVED || slot.status === SlotStatus.OCCUPIED
        ? slotReservationMap.get(sId)
        : null;
    const session = slot.status === SlotStatus.OCCUPIED ? slotSessionMap.get(sId) : null;

    let resDetails = null;
    if (reservation) {
      const resUser = userMap.get(reservation.userId?.toString());
      const resVehicle = reservation.vehicleId
        ? vehicleMap.get(reservation.vehicleId.toString())
        : userFallbackVehicleMap.get(reservation.userId?.toString());

      resDetails = {
        reservationId: reservation._id.toString(),
        status: reservation.status,
        startTime: reservation.startTime ? new Date(reservation.startTime).toISOString() : '',
        endTime: reservation.endTime ? new Date(reservation.endTime).toISOString() : '',
        duration: reservation.duration,
        customer: {
          id: resUser?._id.toString() || reservation.userId.toString(),
          name: resUser?.name || 'Customer',
          email: resUser?.email || '',
          phone: resUser?.phone || '',
        },
        vehicle: resVehicle
          ? {
              id: resVehicle._id.toString(),
              licensePlate: resVehicle.licensePlate,
              vehicleType: resVehicle.vehicleType,
              make: resVehicle.make || '',
              model: resVehicle.model || '',
              color: resVehicle.color || '',
            }
          : null,
      };
    }

    let sessionDetails = null;
    if (session) {
      const sesUser = userMap.get(session.userId?.toString());
      const sesVehicle = session.vehicleId
        ? vehicleMap.get(session.vehicleId.toString())
        : userFallbackVehicleMap.get(session.userId?.toString());

      sessionDetails = {
        sessionId: session._id.toString(),
        status: session.status,
        checkInTime: session.checkInTime ? new Date(session.checkInTime).toISOString() : '',
        customer: {
          id: sesUser?._id.toString() || session.userId.toString(),
          name: sesUser?.name || 'Customer',
          email: sesUser?.email || '',
          phone: sesUser?.phone || '',
        },
        vehicle: sesVehicle
          ? {
              id: sesVehicle._id.toString(),
              licensePlate: sesVehicle.licensePlate,
              vehicleType: sesVehicle.vehicleType,
              make: sesVehicle.make || '',
              model: sesVehicle.model || '',
              color: sesVehicle.color || '',
            }
          : null,
      };
    }

    return {
      _id: slot._id.toString(),
      parkingLocationId: slot.parkingLocationId.toString(),
      slotNumber: slot.slotNumber,
      status: slot.status,
      slotType: slot.slotType,
      isActive: slot.isActive,
      sensorId: slot.sensorId,
      maintenanceReason: slot.maintenanceReason,
      reservation: resDetails,
      activeSession: sessionDetails,
    };
  });
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
    status: SlotStatus.UNKNOWN,
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
      status: SlotStatus.UNKNOWN,
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
