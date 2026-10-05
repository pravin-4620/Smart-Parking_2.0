import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { PricingProfile } from '../models/pricingProfile.model.js';
import { PricingRule } from '../models/pricingRule.model.js';
import { PaymentTransaction } from '../models/paymentTransaction.model.js';
import { hashPassword } from '../utils/password.js';
import { getAuthorizedSlotsByLocation } from '../services/parking.service.js';
import { ReservationService } from '../services/reservation.service.js';
import { ParkingStatus, ReservationStatus, SessionStatus, SlotStatus, SlotType } from '@smart-parking/shared';

const router = Router();

// Route accessible ONLY by ADMIN
router.get('/admin/system-summary', authenticate, authorize(UserRole.ADMIN), (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    message: 'Admin system summary accessed successfully',
    requestedBy: req.user,
  });
});

// Route accessible by ADMIN and PARKING_MANAGER
router.get('/manager/dashboard-summary', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    message: 'Manager dashboard summary accessed successfully',
    requestedBy: req.user,
  });
});

// Manager Dashboard Data
router.get(
  '/manager/dashboard',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locations = await ParkingLocation.find(
        req.user?.role === UserRole.PARKING_MANAGER
          ? { managerIds: req.user.userId }
          : {}
      );
      const locationIds = locations.map((l) => l._id);

      const totalSlots = await ParkingSlot.countDocuments({ parkingLocationId: { $in: locationIds } });
      const [availableSlots, occupiedSlots, reservedSlots, activeSessions, todayReservations] = await Promise.all([
        ParkingSlot.countDocuments({ parkingLocationId: { $in: locationIds }, status: SlotStatus.AVAILABLE }),
        ParkingSlot.countDocuments({ parkingLocationId: { $in: locationIds }, status: SlotStatus.OCCUPIED }),
        ParkingSlot.countDocuments({ parkingLocationId: { $in: locationIds }, status: SlotStatus.RESERVED }),
        ParkingSession.countDocuments({ parkingLocationId: { $in: locationIds }, status: SessionStatus.ACTIVE }),
        Reservation.countDocuments({
          parkingLocationId: { $in: locationIds },
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          occupancyRate: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
          totalSlots,
          occupiedSlots,
          availableSlots,
          reservedSlots,
          activeSessions,
          todayReservations,
          locationsCount: locations.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch manager dashboard', message: err.message });
    }
  }
);

// Admin Dashboard Data
router.get(
  '/admin/dashboard',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const totalUsers = await User.countDocuments();
      const totalLocations = await ParkingLocation.countDocuments();
      const totalSlots = await ParkingSlot.countDocuments();
      const totalReservations = await Reservation.countDocuments();

      res.status(200).json({
        status: 'success',
        data: {
          totalUsers,
          totalLocations,
          totalSlots,
          totalReservations,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch admin dashboard', message: err.message });
    }
  }
);

// Admin Users List
router.get(
  '/admin/users',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
      res.status(200).json({ status: 'success', data: users });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch users list', message: err.message });
    }
  }
);

const getManagedLocationIds = async (req: AuthenticatedRequest) => {
  const locations = await ParkingLocation.find(
    req.user?.role === UserRole.PARKING_MANAGER ? { managerIds: req.user.userId } : {}
  );
  return { locations, locationIds: locations.map((location) => location._id) };
};

router.get('/manager/parking', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locations, locationIds } = await getManagedLocationIds(req);
  const rows = await Promise.all(locations.map(async (location) => {
    const slots = await ParkingSlot.find({ parkingLocationId: location._id }).sort({ slotNumber: 1 }).lean();
    return {
      ...location.toObject(),
      totalSlots: slots.length,
      availableSlots: slots.filter((slot) => slot.status === SlotStatus.AVAILABLE).length,
      occupiedSlots: slots.filter((slot) => slot.status === SlotStatus.OCCUPIED).length,
      reservedSlots: slots.filter((slot) => slot.status === SlotStatus.RESERVED).length,
      slots,
      devices: await IoTDevice.find({ parkingLocationId: location._id }).sort({ deviceId: 1 }).lean(),
    };
  }));
  res.json({ data: rows, locationIds });
});

router.get('/manager/slots', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  const requestedLocationId = typeof req.query.parkingLocationId === 'string' ? req.query.parkingLocationId : undefined;
  if (requestedLocationId && !locationIds.some((id) => id.toString() === requestedLocationId)) {
    return res.status(403).json({ error: 'Parking facility is not assigned to this manager' });
  }
  const allowedIds = requestedLocationId ? [requestedLocationId] : locationIds;
  res.json({ data: await getAuthorizedSlotsByLocation(allowedIds) });
});

router.patch('/manager/reservations/:reservationId/cancel', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  const reservation = await Reservation.findOne({
    _id: req.params.reservationId,
    parkingLocationId: { $in: locationIds },
  });
  if (!reservation) return res.status(404).json({ error: 'Managed reservation not found' });
  const updated = await ReservationService.cancelReservation(
    reservation._id.toString(),
    req.user!.id,
    req.user!.role
  );
  res.json({ data: updated, message: 'Reservation cancelled successfully' });
});

router.patch('/manager/slots/:slotId', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  const slot = await ParkingSlot.findOneAndUpdate(
    { _id: req.params.slotId, parkingLocationId: { $in: locationIds } },
    { status: req.body.status },
    { new: true }
  );
  if (!slot) return res.status(404).json({ error: 'Managed slot not found' });
  res.json({ data: slot });
});

router.get('/manager/reservations', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  res.json({ data: await Reservation.find({ parkingLocationId: { $in: locationIds } })
    .populate('userId', 'name email').populate('slotId', 'slotNumber slotType')
    .populate('parkingLocationId', 'name').sort({ createdAt: -1 }) });
});

router.get('/manager/sessions', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  res.json({ data: await ParkingSession.find({ parkingLocationId: { $in: locationIds } })
    .populate('userId', 'name email').populate('slotId', 'slotNumber slotType')
    .populate('parkingLocationId', 'name').sort({ checkInTime: -1 }) });
});

router.get('/manager/devices', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  res.json({ data: await IoTDevice.find({ parkingLocationId: { $in: locationIds } })
    .populate('parkingLocationId', 'name').sort({ deviceId: 1 }) });
});

router.get('/manager/pricing', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  const profiles = await PricingProfile.find({ parkingLocationId: { $in: locationIds }, isActive: true })
    .populate('parkingLocationId', 'name').lean();
  const profileIds = profiles.map((profile) => profile._id);
  const rules = await PricingRule.find({ pricingProfileId: { $in: profileIds }, isActive: true })
    .sort({ priority: -1 }).lean();
  res.json({ data: profiles.map((profile) => ({
    ...profile,
    rules: rules.filter((rule) => rule.pricingProfileId.toString() === profile._id.toString()),
  })) });
});

router.get('/admin/managers', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  const managers = await User.find({ role: UserRole.PARKING_MANAGER }, '-passwordHash').lean();
  const locations = await ParkingLocation.find({ managerIds: { $in: managers.map((manager) => manager._id) } }, 'name address city managerIds').lean();
  res.json({ data: managers.map((manager) => ({
    ...manager,
    assignedParking: locations.filter((location) => location.managerIds.some((id) => id.toString() === manager._id.toString())),
  })) });
});

router.post('/admin/managers', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const { name, email, phone, password, parkingLocationId } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (await User.exists({ email: String(email).toLowerCase() })) return res.status(409).json({ error: 'Email is already registered' });
  if (parkingLocationId && !(await ParkingLocation.exists({ _id: parkingLocationId }))) return res.status(404).json({ error: 'Parking facility not found' });
  const manager = await User.create({ name, email: String(email).toLowerCase(), phone, passwordHash: await hashPassword(password), role: UserRole.PARKING_MANAGER, isActive: true });
  if (parkingLocationId) await ParkingLocation.findByIdAndUpdate(parkingLocationId, { $addToSet: { managerIds: manager._id } });
  res.status(201).json({ data: { id: manager._id, name: manager.name, email: manager.email, phone: manager.phone, role: manager.role, isActive: manager.isActive } });
});

router.put('/admin/managers/:managerId/assignment', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const manager = await User.findOne({ _id: req.params.managerId, role: UserRole.PARKING_MANAGER });
  if (!manager) return res.status(404).json({ error: 'Manager not found' });
  const location = await ParkingLocation.findById(req.body.parkingLocationId);
  if (!location) return res.status(404).json({ error: 'Parking facility not found' });
  await ParkingLocation.updateMany({ managerIds: manager._id }, { $pull: { managerIds: manager._id } });
  await ParkingLocation.findByIdAndUpdate(location._id, { $addToSet: { managerIds: manager._id } });
  res.json({ data: { managerId: manager._id, parkingLocationId: location._id } });
});

router.get('/admin/parking', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  const locations = await ParkingLocation.find().populate('managerIds', 'name email isActive').lean();
  const rows = await Promise.all(locations.map(async (location) => ({
    ...location,
    slots: await ParkingSlot.find({ parkingLocationId: location._id }).sort({ slotNumber: 1 }).lean(),
    devices: await IoTDevice.find({ parkingLocationId: location._id }).sort({ deviceId: 1 }).lean(),
  })));
  res.json({ data: rows });
});

router.post('/admin/parking', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const { name, address, city, state = '', country = 'India', postalCode = '', latitude, longitude, totalSlots = 3, managerId } = req.body;
  if (!name || !address || !city || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return res.status(400).json({ error: 'Name, address, city, latitude, and longitude are required' });
  const slotCount = Math.max(1, Math.min(500, Number(totalSlots)));
  const location = await ParkingLocation.create({ name, address, city, state, country, postalCode, geoLocation: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] }, operatingHours: { openTime: '00:00', closeTime: '23:59', is24x7: true }, features: [], status: ParkingStatus.ACTIVE, managerIds: managerId ? [managerId] : [] });
  await ParkingSlot.insertMany(Array.from({ length: slotCount }, (_, index) => ({ parkingLocationId: location._id, slotNumber: `SLOT-${String(index + 1).padStart(2, '0')}`, slotType: SlotType.REGULAR, status: SlotStatus.AVAILABLE, isActive: true })));
  res.status(201).json({ data: location });
});

router.patch('/admin/parking/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const { latitude, longitude, managerId, ...updates } = req.body;
  if (latitude !== undefined || longitude !== undefined) {
    const existing = await ParkingLocation.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Parking facility not found' });
    updates.geoLocation = { type: 'Point', coordinates: [Number(longitude ?? existing.geoLocation.coordinates[0]), Number(latitude ?? existing.geoLocation.coordinates[1])] };
  }
  if (managerId !== undefined) updates.managerIds = managerId ? [managerId] : [];
  const location = await ParkingLocation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!location) return res.status(404).json({ error: 'Parking facility not found' });
  res.json({ data: location });
});

router.get('/admin/devices', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  res.json({ data: await IoTDevice.find().populate('parkingLocationId', 'name').sort({ deviceId: 1 }) });
});

router.get('/admin/payments', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  res.json({ data: await PaymentTransaction.find().populate('userId', 'name email').populate('reservationId').sort({ createdAt: -1 }) });
});

export default router;
