import mongoose, { Types } from 'mongoose';
import { PricingProfile } from '../models/pricingProfile.model.js';
import { PricingRule } from '../models/pricingRule.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import {
  CalculatePricingInput,
  PricingCalculationResult,
  PricingBreakdownItem,
  PricingRuleType,
  SlotType,
} from '@smart-parking/shared';

// Round amount safely to 2 decimal places using integer arithmetic (paise)
const roundCurrency = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

// Slot type multipliers
const SLOT_TYPE_MULTIPLIERS: Record<string, number> = {
  [SlotType.REGULAR]: 1.0,
  [SlotType.COMPACT]: 0.9,
  [SlotType.HANDICAPPED]: 0.8,
  [SlotType.EV_CHARGING]: 1.5,
  [SlotType.VIP]: 2.0,
};

export class PricingService {
  public static async calculatePricing(
    input: CalculatePricingInput
  ): Promise<PricingCalculationResult> {
    const { parkingLocationId, slotId, startTime, endTime } = input;
    let slotType = input.slotType || SlotType.REGULAR;

    // Resolve slotType from database if slotId is provided
    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) {
      const slot = await ParkingSlot.findById(slotId);
      if (slot) {
        slotType = slot.slotType as SlotType;
      }
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      throw new Error('endTime must be after startTime');
    }

    // Calculate total duration in milliseconds and hours
    const durationMs = end.getTime() - start.getTime();
    const totalHoursRaw = durationMs / (1000 * 60 * 60);
    // Billable hours rounded up to nearest hour or min 1 hour
    const billableHours = Math.max(1, Math.ceil(totalHoursRaw));

    // Fetch active pricing profile from MongoDB
    let profile = await PricingProfile.findOne({
      parkingLocationId: new Types.ObjectId(parkingLocationId),
      isActive: true,
    }).sort({ version: -1 });

    if (!profile) {
      profile = new PricingProfile({
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        name: 'Standard Default Tariff',
        version: 1,
        baseHourlyRate: 50,
        minimumCharge: 20,
        maximumDailyCharge: 500,
        isActive: true,
      });
    }

    // Fetch active rules sorted by priority descending
    const rules = await PricingRule.find({
      pricingProfileId: profile._id,
      isActive: true,
    }).sort({ priority: -1 });

    const breakdown: PricingBreakdownItem[] = [];
    let baseAmountAccumulator = 0;
    let peakAmountAccumulator = 0;
    let discountAccumulator = 0;

    const slotMultiplier = SLOT_TYPE_MULTIPLIERS[slotType] || 1.0;

    // Process hour-by-hour using UTC getters for timezone consistency
    let currentSliceStart = new Date(start);

    for (let h = 0; h < billableHours; h++) {
      const dayOfWeek = currentSliceStart.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const hourOfDay = currentSliceStart.getUTCHours();
      const minutesOfDay = hourOfDay * 60 + currentSliceStart.getUTCMinutes();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let appliedRate = profile.baseHourlyRate;
      let ruleDescription = `Base Hourly Rate (₹${profile.baseHourlyRate}/hr)`;
      let isPeakSlice = false;

      // Check applicable rules by priority
      for (const rule of rules) {
        const dayMatches =
          !rule.daysOfWeek ||
          rule.daysOfWeek.length === 0 ||
          rule.daysOfWeek.includes(dayOfWeek);

        if (rule.ruleType === PricingRuleType.WEEKEND && isWeekend && dayMatches) {
          appliedRate = profile.baseHourlyRate * rule.multiplier + rule.fixedFee;
          ruleDescription = `Weekend Rate (${rule.ruleName}: ${rule.multiplier}x)`;
          break;
        }

        if (rule.startTime && rule.endTime && dayMatches) {
          const [sH, sM] = rule.startTime.split(':').map(Number);
          const [eH, eM] = rule.endTime.split(':').map(Number);
          const ruleStartMin = sH * 60 + sM;
          const ruleEndMin = eH * 60 + eM;

          const inTimeRange =
            ruleStartMin <= ruleEndMin
              ? minutesOfDay >= ruleStartMin && minutesOfDay < ruleEndMin
              : minutesOfDay >= ruleStartMin || minutesOfDay < ruleEndMin;

          if (inTimeRange) {
            if (rule.ruleType === PricingRuleType.PEAK) {
              appliedRate = profile.baseHourlyRate * rule.multiplier + rule.fixedFee;
              ruleDescription = `Peak Period Rate (${rule.ruleName}: ${rule.multiplier}x)`;
              isPeakSlice = true;
              break;
            } else if (rule.ruleType === PricingRuleType.OFF_PEAK) {
              appliedRate = profile.baseHourlyRate * rule.multiplier + rule.fixedFee;
              ruleDescription = `Off-Peak Rate (${rule.ruleName}: ${rule.multiplier}x)`;
              break;
            }
          }
        }
      }

      // Apply Slot Type Multiplier if not standard 1.0
      if (slotMultiplier !== 1.0) {
        appliedRate = appliedRate * slotMultiplier;
        ruleDescription += ` [Slot Type: ${slotType} (${slotMultiplier}x)]`;
      }

      appliedRate = roundCurrency(appliedRate);

      if (isPeakSlice) {
        peakAmountAccumulator += appliedRate;
      } else {
        baseAmountAccumulator += appliedRate;
      }

      breakdown.push({
        description: `Hour ${h + 1} (${currentSliceStart.toISOString().substring(11, 16)} UTC): ${ruleDescription}`,
        rate: appliedRate,
        hours: 1,
        amount: appliedRate,
      });

      // Advance by 1 hour
      currentSliceStart = new Date(currentSliceStart.getTime() + 60 * 60 * 1000);
    }

    let subtotal = roundCurrency(baseAmountAccumulator + peakAmountAccumulator);

    // Apply Maximum Daily Charge (24-hour cap)
    const daysCount = Math.ceil(billableHours / 24);
    const maxAllowedSubtotal = profile.maximumDailyCharge * daysCount;

    if (subtotal > maxAllowedSubtotal) {
      const capDiscount = roundCurrency(subtotal - maxAllowedSubtotal);
      discountAccumulator += capDiscount;
      subtotal = maxAllowedSubtotal;
      breakdown.push({
        description: `Maximum Daily Cap Applied (Max ₹${profile.maximumDailyCharge}/day)`,
        rate: -capDiscount,
        hours: billableHours,
        amount: -capDiscount,
      });
    }

    // Apply Minimum Charge
    if (subtotal > 0 && subtotal < profile.minimumCharge) {
      const minChargeAdjustment = roundCurrency(profile.minimumCharge - subtotal);
      subtotal = profile.minimumCharge;
      breakdown.push({
        description: `Minimum Charge Threshold Applied (Min ₹${profile.minimumCharge})`,
        rate: minChargeAdjustment,
        hours: billableHours,
        amount: minChargeAdjustment,
      });
    }

    const baseAmount = roundCurrency(baseAmountAccumulator);
    const peakAmount = roundCurrency(peakAmountAccumulator);
    const discount = roundCurrency(discountAccumulator);
    const taxes = 0;
    const finalAmount = roundCurrency(subtotal);

    return {
      baseAmount,
      peakAmount,
      discount,
      taxes,
      finalAmount,
      currency: 'INR',
      durationHours: roundCurrency(totalHoursRaw),
      breakdown,
      pricingRuleVersion: profile.version,
    };
  }
}

