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

