import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDatabase } from '../config/database.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { User } from '../models/user.model.js';

z.object({ RFID_INVENTORY_CONFIRM: z.literal('ADD_PHYSICAL_TAGS') }).parse(process.env);
try {
  if (!(await connectDatabase())) throw new Error('Database connection failed');
  for (const uid of ['03:B7:F7:0F', '13:CD:2C:F8']) {
    const result = await RFIDCard.updateOne({ uid }, { $setOnInsert: { uid, isActive: true } }, { upsert: true });
    if (result.upsertedCount) {
      console.log(`${uid}: added as available inventory`);
      continue;
    }
    const card = await RFIDCard.findOne({ uid });
    if (card?.userId && !(await User.exists({ _id: card.userId }))) {
      await RFIDCard.updateOne(
        { _id: card._id, userId: card.userId, isActive: true },
        { $unset: { userId: 1, vehicleId: 1, assignedAt: 1 }, $set: { releasedAt: new Date() } },
      );
      console.log(`${uid}: cleared an orphaned assignment; card is now available`);
    } else {
      console.log(`${uid}: already present (valid assignment/status left unchanged)`);
    }
  }
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
