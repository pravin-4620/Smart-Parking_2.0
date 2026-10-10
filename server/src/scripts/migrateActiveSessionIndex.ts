import mongoose from 'mongoose';
import { SessionStatus } from '@smart-parking/shared';
import { connectDatabase } from '../config/database.js';

const activeStatuses = [SessionStatus.ACTIVE, SessionStatus.CHECKOUT_PENDING, SessionStatus.OVERSTAY];

try {
  if (!(await connectDatabase())) throw new Error('Database connection failed');
  const collection = mongoose.connection.collection('parkingsessions');
  const duplicates = await collection.aggregate([
    { $match: { status: { $in: activeStatuses } } },
    { $group: { _id: '$slotId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicates.length) throw new Error('Migration refused: duplicate active sessions exist for at least one slot');
  const indexes = await collection.indexes();
  const legacy = indexes.find((index) => index.name === 'slotId_1' && index.unique !== true && JSON.stringify(index.key) === JSON.stringify({ slotId: 1 }));
  if (legacy) await collection.dropIndex('slotId_1');
  await collection.createIndex(
    { slotId: 1 },
    { name: 'unique_active_session_per_slot', unique: true, partialFilterExpression: { status: { $in: activeStatuses } } }
  );
  console.log('Active-session uniqueness index is installed.');
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
