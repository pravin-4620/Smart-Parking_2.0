import mongoose from 'mongoose';
import { z } from 'zod';
import { UserRole } from '@smart-parking/shared';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { hashPassword } from '../utils/password.js';

const input = z.object({
  MANAGER_BOOTSTRAP_CONFIRM: z.literal('CREATE_INITIAL_MANAGERS'),
  MANAGER_1_NAME: z.string().min(2), MANAGER_1_EMAIL: z.string().email(), MANAGER_1_PASSWORD: z.string().min(12), MANAGER_1_FACILITY_ID: z.string().min(1),
  MANAGER_2_NAME: z.string().min(2), MANAGER_2_EMAIL: z.string().email(), MANAGER_2_PASSWORD: z.string().min(12), MANAGER_2_FACILITY_ID: z.string().min(1),
}).parse(process.env);

try {
  if (!(await connectDatabase())) throw new Error('Database connection failed');
  for (const n of [1, 2] as const) {
    const email = input[`MANAGER_${n}_EMAIL`].trim().toLowerCase();
    let manager = await User.findOne({ email });
    if (manager) {
      if (manager.role !== UserRole.PARKING_MANAGER) throw new Error(`${email} exists but is not a Manager; refusing to alter it`);
    } else {
      manager = await User.create({ name: input[`MANAGER_${n}_NAME`], email, passwordHash: await hashPassword(input[`MANAGER_${n}_PASSWORD`]), role: UserRole.PARKING_MANAGER, isActive: true, emailVerified: true });
    }
    const facility = await ParkingLocation.findById(input[`MANAGER_${n}_FACILITY_ID`]);
    if (!facility) throw new Error(`Manager ${n} facility does not exist`);
    await ParkingLocation.updateOne({ _id: facility._id }, { $addToSet: { managerIds: manager._id } });
    console.log(`Manager ${n} is assigned to ${facility.name}; no credential was logged.`);
  }
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
