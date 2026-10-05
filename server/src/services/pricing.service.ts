import mongoose, { Types } from 'mongoose';
import { PricingProfile } from '../models/pricingProfile.model.js';
import { PricingRule } from '../models/pricingRule.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import {
  CalculatePricingInput,
  PricingCalculationResult,
  PricingBreakdownItem,
  PricingRuleType,
  SlotType,
  UserRole,
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
  ): Promise<PricingCalculationResult & { effectiveHourlyRate: number }> {
    const { parkingLocationId, slotId, startTime, endTime } = input;
    let slotType = input.slotType || SlotType.REGULAR;
    let slotHourlyRate: number | undefined;

    // Resolve slotType from database if slotId is provided
    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) {
      const slot = await ParkingSlot.findById(slotId);
      if (slot) {
        if (slot.parkingLocationId.toString() !== parkingLocationId) {
          throw new Error('Selected slot does not belong to this parking facility');
        }
        slotType = slot.slotType as SlotType;
        slotHourlyRate = slot.hourlyRateOverride;
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

      const effectiveHourlyRate = slotHourlyRate ?? profile.baseHourlyRate;
      let appliedRate = effectiveHourlyRate;
      let ruleDescription = slotHourlyRate !== undefined
        ? `Slot Hourly Rate (₹${slotHourlyRate}/hr)`
        : `Base Hourly Rate (₹${profile.baseHourlyRate}/hr)`;
      let isPeakSlice = false;

      // Check applicable rules by priority
      for (const rule of rules) {
        const dayMatches =
          !rule.daysOfWeek ||
          rule.daysOfWeek.length === 0 ||
          rule.daysOfWeek.includes(dayOfWeek);

        if (rule.ruleType === PricingRuleType.WEEKEND && isWeekend && dayMatches) {
          appliedRate = effectiveHourlyRate * rule.multiplier + rule.fixedFee;
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
              appliedRate = effectiveHourlyRate * rule.multiplier + rule.fixedFee;
              ruleDescription = `Peak Period Rate (${rule.ruleName}: ${rule.multiplier}x)`;
              isPeakSlice = true;
              break;
            } else if (rule.ruleType === PricingRuleType.OFF_PEAK) {
              appliedRate = effectiveHourlyRate * rule.multiplier + rule.fixedFee;
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

    const startingCharge = profile.basePrice ?? 0;
    if (startingCharge > 0) {
      baseAmountAccumulator += startingCharge;
      breakdown.unshift({
        description: 'Starting charge',
        rate: startingCharge,
        hours: 0,
        amount: startingCharge,
      });
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
      effectiveHourlyRate: slotHourlyRate ?? profile.baseHourlyRate,
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

  public static async getPricingForLocation(
    parkingLocationId: string,
    userId: string,
    role: UserRole
  ) {
    const location = await ParkingLocation.findById(parkingLocationId);
    if (!location) {
      const err: any = new Error('Parking facility not found');
      err.statusCode = 404;
      throw err;
    }

    if (role === UserRole.PARKING_MANAGER) {
      const isAssigned = location.managerIds.some((id) => id.toString() === userId);
      if (!isAssigned) {
        const err: any = new Error('Forbidden: You are not a manager for this parking facility');
        err.statusCode = 403;
        throw err;
      }
    }

    let profile = await PricingProfile.findOne({
      parkingLocationId: new Types.ObjectId(parkingLocationId),
      isActive: true,
    });

    if (!profile) {
      profile = await PricingProfile.create({
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        name: `${location.name} Standard Tariff`,
        version: 1,
        basePrice: 0,
        baseHourlyRate: 50,
        minimumCharge: 20,
        maximumDailyCharge: 500,
        isActive: true,
      });
      location.pricingProfileId = profile._id as Types.ObjectId;
      await location.save();
    }

    const rules = await PricingRule.find({
      pricingProfileId: profile._id,
      isActive: true,
    }).sort({ priority: -1 });

    const slots = await ParkingSlot.find({ parkingLocationId }).sort({ slotNumber: 1 });

    return {
      location,
      profile,
      rules,
      slots,
      overstayConfig: location.overstayConfig || {
        gracePeriodMinutes: 10,
        fineIntervalMinutes: 15,
        fineAmountPerInterval: 20,
        maximumFineAmount: 500,
      },
    };
  }

  public static async updatePricingForLocation(
    parkingLocationId: string,
    data: {
      basePrice?: number;
      baseHourlyRate?: number;
      minimumCharge?: number;
      maximumDailyCharge?: number;
      rules?: Array<{
        ruleName: string;
        ruleType: PricingRuleType;
        multiplier: number;
        fixedFee?: number;
        startTime?: string;
        endTime?: string;
        daysOfWeek?: number[];
        priority?: number;
        isActive?: boolean;
      }>;
      overstayConfig?: {
        gracePeriodMinutes: number;
        fineIntervalMinutes: number;
        fineAmountPerInterval: number;
        maximumFineAmount: number;
      };
      slotPrices?: Array<{ slotId: string; hourlyRateOverride: number | null }>;
    },
    userId: string,
    role: UserRole
  ) {
    const location = await ParkingLocation.findById(parkingLocationId);
    if (!location) {
      const err: any = new Error('Parking facility not found');
      err.statusCode = 404;
      throw err;
    }

    if (role === UserRole.PARKING_MANAGER) {
      const isAssigned = location.managerIds.some((id) => id.toString() === userId);
      if (!isAssigned) {
        const err: any = new Error('Forbidden: You are not a manager for this parking facility');
        err.statusCode = 403;
        throw err;
      }
    } else if (role === UserRole.USER) {
      const err: any = new Error('Forbidden: Normal users cannot update pricing');
      err.statusCode = 403;
      throw err;
    }

    if (data.baseHourlyRate !== undefined && data.baseHourlyRate < 0) {
      throw new Error('baseHourlyRate cannot be negative');
    }
    if (data.basePrice !== undefined && data.basePrice < 0) {
      throw new Error('basePrice cannot be negative');
    }
    if (data.minimumCharge !== undefined && data.minimumCharge < 0) {
      throw new Error('minimumCharge cannot be negative');
    }
    if (data.maximumDailyCharge !== undefined && data.maximumDailyCharge < 0) {
      throw new Error('maximumDailyCharge cannot be negative');
    }

    if (data.overstayConfig) {
      const { gracePeriodMinutes, fineIntervalMinutes, fineAmountPerInterval, maximumFineAmount } =
        data.overstayConfig;
      if (gracePeriodMinutes < 0) throw new Error('gracePeriodMinutes cannot be negative');
      if (fineIntervalMinutes <= 0) throw new Error('fineIntervalMinutes must be greater than 0');
      if (fineAmountPerInterval < 0) throw new Error('fineAmountPerInterval cannot be negative');
      if (maximumFineAmount < 0) throw new Error('maximumFineAmount cannot be negative');
      if (maximumFineAmount < fineAmountPerInterval) {
        throw new Error('maximumFineAmount must be greater than or equal to fineAmountPerInterval');
      }

      location.overstayConfig = {
        gracePeriodMinutes,
        fineIntervalMinutes,
        fineAmountPerInterval,
        maximumFineAmount,
      };
      await location.save();
    }

    let profile = await PricingProfile.findOne({
      parkingLocationId: new Types.ObjectId(parkingLocationId),
      isActive: true,
    });

    if (!profile) {
      profile = await PricingProfile.create({
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        name: `${location.name} Pricing Profile`,
        version: 1,
        basePrice: data.basePrice ?? 0,
        baseHourlyRate: data.baseHourlyRate ?? 50,
        minimumCharge: data.minimumCharge ?? 20,
        maximumDailyCharge: data.maximumDailyCharge ?? 500,
        isActive: true,
      });
      location.pricingProfileId = profile._id as Types.ObjectId;
      await location.save();
    } else {
      if (data.basePrice !== undefined) profile.basePrice = data.basePrice;
      if (data.baseHourlyRate !== undefined) profile.baseHourlyRate = data.baseHourlyRate;
      if (data.minimumCharge !== undefined) profile.minimumCharge = data.minimumCharge;
      if (data.maximumDailyCharge !== undefined) profile.maximumDailyCharge = data.maximumDailyCharge;
      await profile.save();
    }

    if (Array.isArray(data.rules)) {
      for (const rule of data.rules) {
        if (rule.multiplier <= 0) throw new Error('Multiplier must be greater than 0');
        if ((rule.fixedFee ?? 0) < 0) throw new Error('fixedFee cannot be negative');
      }
      await PricingRule.updateMany({ pricingProfileId: profile._id }, { $set: { isActive: false } });

      for (const r of data.rules) {
        await PricingRule.create({
          pricingProfileId: profile._id,
          ruleName: r.ruleName,
          ruleType: r.ruleType,
          multiplier: r.multiplier,
          fixedFee: r.fixedFee ?? 0,
          startTime: r.startTime,
          endTime: r.endTime,
          daysOfWeek: r.daysOfWeek ?? [],
          priority: r.priority ?? 1,
          isActive: r.isActive !== false,
        });
      }
    }

    if (Array.isArray(data.slotPrices)) {
      for (const item of data.slotPrices) {
        if (!Types.ObjectId.isValid(item.slotId)) throw new Error('Invalid slotId');
        if (item.hourlyRateOverride !== null && item.hourlyRateOverride < 0) {
          throw new Error('Slot hourly rate cannot be negative');
        }
      }
      for (const item of data.slotPrices) {
        const update = item.hourlyRateOverride === null
          ? { $unset: { hourlyRateOverride: 1 } }
          : { $set: { hourlyRateOverride: roundCurrency(item.hourlyRateOverride) } };
        const result = await ParkingSlot.updateOne(
          { _id: item.slotId, parkingLocationId: location._id },
          update
        );
        if (result.matchedCount !== 1) throw new Error('Slot does not belong to this parking facility');
      }
    }

    const updatedRules = await PricingRule.find({
      pricingProfileId: profile._id,
      isActive: true,
    }).sort({ priority: -1 });
    const slots = await ParkingSlot.find({ parkingLocationId }).sort({ slotNumber: 1 });

    return {
      location,
      profile,
      rules: updatedRules,
      slots,
      overstayConfig: location.overstayConfig,
    };
  }
}
