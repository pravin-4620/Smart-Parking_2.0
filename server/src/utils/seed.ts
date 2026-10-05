import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { PricingProfile } from '../models/pricingProfile.model.js';
import { PricingRule } from '../models/pricingRule.model.js';
import { SensorEvent } from '../models/sensorEvent.model.js';
import { Reservation } from '../models/reservation.model.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { RFIDEvent } from '../models/rfidEvent.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { PaymentTransaction } from '../models/paymentTransaction.model.js';
import { hashPassword } from './password.js';
import { UserRole, SlotStatus, SlotType, ParkingStatus, PricingRuleType } from '@smart-parking/shared';
import { connectDatabase } from '../config/database.js';

export const seedDatabase = async () => {
  console.log('🌱 Starting Seed Script...');

  // Ensure DB connection
  if (mongoose.connection.readyState === 0) {
    await connectDatabase();
  }

  // Clear existing collections
  await User.deleteMany({});
  await ParkingLocation.deleteMany({});
  await ParkingSlot.deleteMany({});
  await PricingProfile.deleteMany({});
  await PricingRule.deleteMany({});
  await SensorEvent.deleteMany({});
  await Reservation.deleteMany({});
  await RFIDCard.deleteMany({});
  await RFIDEvent.deleteMany({});
  await ParkingSession.deleteMany({});
  await PaymentTransaction.deleteMany({});

  console.log('🧹 Cleaned existing database records.');

  // Create Users
  const passwordHash = await hashPassword('password123');

  const adminUser = await User.create({
    name: 'System Admin',
    email: 'admin@smartpark.com',
    passwordHash,
    role: UserRole.ADMIN,
    phone: '+919999900000',
    isActive: true,
    emailVerified: true,
    mobileVerified: true,
  });

  const managerUser = await User.create({
    name: 'Central Manager',
    email: 'manager@smartpark.com',
    passwordHash,
    role: UserRole.PARKING_MANAGER,
    phone: '+919888811111',
    isActive: true,
    emailVerified: true,
    mobileVerified: true,
  });

  const regularUser = await User.create({
    name: 'John Driver',
    email: 'user@smartpark.com',
    passwordHash,
    role: UserRole.USER,
    phone: '+919777722222',
    isActive: true,
    emailVerified: true,
    mobileVerified: true,
  });

  console.log('👤 Created Admin, Manager, and Standard Users.');

  // 1. Central Mall Parking (Bangalore City Center: 12.9716, 77.5946)
  const centralMall = await ParkingLocation.create({
    name: 'Central Mall Smart Parking',
    description: 'Multi-level covered parking facility with EV fast chargers and automated boom barriers.',
    address: '12 MG Road, Brigade Junction',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560001',
    geoLocation: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
    },
    operatingHours: { openTime: '08:00', closeTime: '23:00', is24x7: false },
    features: ['EV Charging', 'CCTV Security', 'Covered Parking', 'Valet Available', 'Wheelchair Access'],
    status: ParkingStatus.ACTIVE,
    managerIds: [managerUser._id],
  });

  const centralPricingProfile = await PricingProfile.create({
    parkingLocationId: centralMall._id,
    name: 'Central Mall Standard Tariff',
    version: 1,
    baseHourlyRate: 60,
    minimumCharge: 30,
    maximumDailyCharge: 600,
    isActive: true,
  });

  await PricingRule.create([
    {
      pricingProfileId: centralPricingProfile._id,
      ruleName: 'Weekday Morning Peak',
      ruleType: PricingRuleType.PEAK,
      multiplier: 1.5,
      fixedFee: 0,
      startTime: '08:00',
      endTime: '10:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      priority: 20,
      isActive: true,
    },
    {
      pricingProfileId: centralPricingProfile._id,
      ruleName: 'Night Off-Peak',
      ruleType: PricingRuleType.OFF_PEAK,
      multiplier: 0.8,
      fixedFee: 0,
      startTime: '22:00',
      endTime: '06:00',
      daysOfWeek: [],
      priority: 10,
      isActive: true,
    },
    {
      pricingProfileId: centralPricingProfile._id,
      ruleName: 'Weekend Rate',
      ruleType: PricingRuleType.WEEKEND,
      multiplier: 1.25,
      fixedFee: 0,
      daysOfWeek: [0, 6],
      priority: 30,
      isActive: true,
    },
  ]);

  const centralMallSlots = [];
  for (let i = 1; i <= 12; i++) {
    const slotType = i <= 2 ? SlotType.EV_CHARGING : i === 3 ? SlotType.HANDICAPPED : i === 4 ? SlotType.VIP : SlotType.REGULAR;
    const status = i % 3 === 0 ? SlotStatus.OCCUPIED : SlotStatus.AVAILABLE;
    centralMallSlots.push({
      parkingLocationId: centralMall._id,
      slotNumber: `A-${100 + i}`,
      slotType,
      status,
      isActive: true,
    });
  }
  const createdCentralSlots = await ParkingSlot.insertMany(centralMallSlots);

  await SensorEvent.create({
    deviceId: 'ESP32-SEED-001',
    parkingLocationId: centralMall._id,
    slotId: createdCentralSlots[0]._id,
    occupied: createdCentralSlots[0].status === SlotStatus.OCCUPIED,
    timestamp: new Date(),
    payload: { source: 'demo-seed' },
  });

  // 2. Tech Park Zone A Parking (Outer Ring Road: 12.9279, 77.6974)
  const techPark = await ParkingLocation.create({
    name: 'Tech Park Zone A Facility',
    description: '24x7 High-capacity smart parking lot for tech professionals and visitors.',
    address: 'Outer Ring Road, Kadubeesanahalli',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560103',
    geoLocation: {
      type: 'Point',
      coordinates: [77.6974, 12.9279],
    },
    operatingHours: { openTime: '00:00', closeTime: '23:59', is24x7: true },
    features: ['24x7 Access', 'RFID Automated Entry', 'EV Fast Charging', 'Security Patrol'],
    status: ParkingStatus.ACTIVE,
    managerIds: [managerUser._id],
  });

  await PricingProfile.create({
    parkingLocationId: techPark._id,
    name: 'Tech Park Enterprise Rate',
    version: 1,
    baseHourlyRate: 40,
    minimumCharge: 20,
    maximumDailyCharge: 300,
    isActive: true,
  });

  const techParkSlots = [];
  for (let i = 1; i <= 15; i++) {
    const slotType = i <= 3 ? SlotType.EV_CHARGING : SlotType.REGULAR;
    const status = i % 4 === 0 ? SlotStatus.OCCUPIED : SlotStatus.AVAILABLE;
    techParkSlots.push({
      parkingLocationId: techPark._id,
      slotNumber: `B-${100 + i}`,
      slotType,
      status,
      isActive: true,
    });
  }
  await ParkingSlot.insertMany(techParkSlots);

  // 3. Metro Station Plaza Parking (MG Road Metro: 12.9783, 77.6080)
  const metroPlaza = await ParkingLocation.create({
    name: 'Metro Station Plaza Parking',
    description: 'Convenient park-and-ride facility adjoining the central transit hub.',
    address: 'Plaza Metro Concourse, MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560001',
    geoLocation: {
      type: 'Point',
      coordinates: [77.6080, 12.9783],
    },
    operatingHours: { openTime: '05:00', closeTime: '23:30', is24x7: false },
    features: ['Park & Ride Discount', 'Covered Walkway', 'CCTV Cameras'],
    status: ParkingStatus.ACTIVE,
    managerIds: [adminUser._id],
  });

  await PricingProfile.create({
    parkingLocationId: metroPlaza._id,
    name: 'Metro Transit Special Rate',
    version: 1,
    baseHourlyRate: 30,
    minimumCharge: 15,
    maximumDailyCharge: 200,
    isActive: true,
  });

  const metroPlazaSlots = [];
  for (let i = 1; i <= 10; i++) {
    metroPlazaSlots.push({
      parkingLocationId: metroPlaza._id,
      slotNumber: `C-${100 + i}`,
      slotType: i === 1 ? SlotType.HANDICAPPED : SlotType.REGULAR,
      status: SlotStatus.AVAILABLE,
      isActive: true,
    });
  }
  await ParkingSlot.insertMany(metroPlazaSlots);

  console.log('✅ Seed completed! Created 3 Parking Locations with >10 slots each.');
};

// Allow executing directly via node/tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed Error:', err);
      process.exit(1);
    });
}
