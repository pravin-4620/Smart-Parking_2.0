import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { IoTDevice } from '../models/ioTDevice.model.js';

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
      const occupiedSlots = await ParkingSlot.countDocuments({ parkingLocationId: { $in: locationIds }, status: 'OCCUPIED' });
      const activeReservations = await Reservation.countDocuments({ parkingLocationId: { $in: locationIds }, status: 'CONFIRMED' });

      res.status(200).json({
        status: 'success',
        data: {
          occupancyRate: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
          totalSlots,
          occupiedSlots,
          activeReservations,
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
  const rows = await Promise.all(locations.map(async (location) => ({
    ...location.toObject(),
    totalSlots: await ParkingSlot.countDocuments({ parkingLocationId: location._id }),
    availableSlots: await ParkingSlot.countDocuments({ parkingLocationId: location._id, status: 'AVAILABLE' }),
  })));
  res.json({ data: rows, locationIds });
});

router.get('/manager/slots', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  const requestedLocationId = typeof req.query.parkingLocationId === 'string' ? req.query.parkingLocationId : undefined;
  const allowedIds = requestedLocationId && locationIds.some((id) => id.toString() === requestedLocationId)
    ? [requestedLocationId]
    : locationIds;
  res.json({ data: await ParkingSlot.find({ parkingLocationId: { $in: allowedIds } }).sort({ slotNumber: 1 }) });
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
  res.json({ data: await Reservation.find({ parkingLocationId: { $in: locationIds } }).sort({ createdAt: -1 }) });
});

router.get('/manager/sessions', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  res.json({ data: await ParkingSession.find({ parkingLocationId: { $in: locationIds } }).sort({ checkInTime: -1 }) });
});

router.get('/manager/devices', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  const { locationIds } = await getManagedLocationIds(req);
  res.json({ data: await IoTDevice.find({ parkingLocationId: { $in: locationIds } }).sort({ deviceId: 1 }) });
});

export default router;
