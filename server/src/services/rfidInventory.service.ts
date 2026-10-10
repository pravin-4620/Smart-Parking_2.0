import { Types } from 'mongoose';
import { RFIDCard } from '../models/rfidCard.model.js';
import { Vehicle } from '../models/vehicle.model.js';

export class RFIDInventoryService {
  static async claimForCustomer(userId: Types.ObjectId, vehicleId: Types.ObjectId) {
    const existing = await RFIDCard.findOne({ userId, isActive: true });
    if (existing) return existing;

    const card = await RFIDCard.findOneAndUpdate(
      { isActive: true, userId: { $exists: false } },
      { $set: { userId, vehicleId, assignedAt: new Date() }, $unset: { releasedAt: 1 } },
      { new: true, sort: { createdAt: 1 } },
    );
    if (!card) return null;

    await Vehicle.updateOne({ _id: vehicleId, userId }, { $set: { rfidCardId: card._id } });
    return card;
  }

  static async release(cardId: string) {
    const card = await RFIDCard.findById(cardId);
    if (!card) return null;
    if (card.vehicleId) await Vehicle.updateOne({ _id: card.vehicleId, rfidCardId: card._id }, { $unset: { rfidCardId: 1 } });
    card.userId = undefined;
    card.vehicleId = undefined;
    card.assignedAt = undefined;
    card.releasedAt = new Date();
    await card.save();
    return card;
  }
}
