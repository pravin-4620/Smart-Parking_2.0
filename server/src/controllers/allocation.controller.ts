import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AllocationService } from '../services/allocation.service.js';
import { AutoAllocateSlotInput } from '@smart-parking/shared';

export const handleAutoAllocateSlot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = req.body as AutoAllocateSlotInput;
    const userId = req.user?.id;

    const allocationResult = await AllocationService.autoAllocateSlot(input, userId);

    res.status(200).json({
      data: {
        allocatedSlot: {
          id: allocationResult.allocatedSlot._id,
          slotNumber: allocationResult.allocatedSlot.slotNumber,
          slotType: allocationResult.allocatedSlot.slotType,
          status: allocationResult.allocatedSlot.status,
        },
        reason: allocationResult.reason,
        strategy: allocationResult.strategy,
        timestamp: allocationResult.timestamp,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'Slot allocation failed',
      message: error.message,
    });
  }
};

