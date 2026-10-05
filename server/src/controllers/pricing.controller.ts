import { Request, Response } from 'express';
import { PricingService } from '../services/pricing.service.js';
import { CalculatePricingInput } from '@smart-parking/shared';

export const handleCalculatePricing = async (req: Request, res: Response) => {
  try {
    const input = req.body as CalculatePricingInput;
    const result = await PricingService.calculatePricing(input);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(400).json({
      error: 'Pricing calculation failed',
      message: (error as Error).message,
    });
  }
};

export const handleGetPricingForLocation = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parkingLocationId } = req.params;
    const result = await PricingService.getPricingForLocation(
      parkingLocationId,
      authReq.user.id || authReq.user.userId,
      authReq.user.role
    );

    res.status(200).json({ data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: 'Failed to fetch pricing config',
      message: error.message,
    });
  }
};

export const handleUpdatePricingForLocation = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parkingLocationId } = req.params;
    const result = await PricingService.updatePricingForLocation(
      parkingLocationId,
      req.body,
      authReq.user.id || authReq.user.userId,
      authReq.user.role
    );

    res.status(200).json({
      message: 'Pricing profile and overstay settings updated successfully',
      data: result,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: 'Failed to update pricing config',
      message: error.message,
    });
  }
};

