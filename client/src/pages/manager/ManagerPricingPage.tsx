import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { managerService } from '../../services/managerService.js';

interface LocationOption { _id: string; name: string; address: string; }
interface PricingRule { _id?: string; ruleName: string; ruleType: 'PEAK' | 'OFF_PEAK' | 'WEEKEND'; multiplier: number; fixedFee: number; startTime?: string; endTime?: string; daysOfWeek?: number[]; priority: number; isActive: boolean; }
interface PricingSlot { _id: string; slotNumber: string; slotType: string; hourlyRateOverride?: number; }
interface PricingConfig { profile: { basePrice?: number; baseHourlyRate: number; minimumCharge: number; maximumDailyCharge: number; }; rules: PricingRule[]; slots: PricingSlot[]; overstayConfig: { gracePeriodMinutes: number; fineIntervalMinutes: number; fineAmountPerInterval: number; maximumFineAmount: number; }; }
interface PricingForm { basePrice: number; baseHourlyRate: number; minimumCharge: number; maximumDailyCharge: number; peakMultiplier: number; offPeakMultiplier: number; weekendMultiplier: number; gracePeriodMinutes: number; fineIntervalMinutes: number; fineAmountPerInterval: number; maximumFineAmount: number; slotPrices: Record<string, string>; }

const ruleMultiplier = (rules: PricingRule[], type: PricingRule['ruleType'], fallback: number) => rules.find((rule) => rule.ruleType === type)?.multiplier ?? fallback;
const toForm = (config: PricingConfig): PricingForm => ({
  basePrice: config.profile.basePrice ?? 0, baseHourlyRate: config.profile.baseHourlyRate, minimumCharge: config.profile.minimumCharge, maximumDailyCharge: config.profile.maximumDailyCharge,
  peakMultiplier: ruleMultiplier(config.rules, 'PEAK', 1.5), offPeakMultiplier: ruleMultiplier(config.rules, 'OFF_PEAK', 0.8), weekendMultiplier: ruleMultiplier(config.rules, 'WEEKEND', 1.25),
  gracePeriodMinutes: config.overstayConfig.gracePeriodMinutes, fineIntervalMinutes: config.overstayConfig.fineIntervalMinutes, fineAmountPerInterval: config.overstayConfig.fineAmountPerInterval, maximumFineAmount: config.overstayConfig.maximumFineAmount,
  slotPrices: Object.fromEntries(config.slots.map((slot) => [slot._id, slot.hourlyRateOverride?.toString() ?? ''])),
});
const messageFromError = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
    if (error.response?.status === 403) return 'You are not allowed to edit pricing for this facility.';
    return error.response?.data.message ?? error.response?.data.error ?? 'Pricing could not be saved.';
  }
  return error instanceof Error ? error.message : 'Pricing could not be saved.';
};

export const ManagerPricingPage: React.FC = () => {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState('');
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [form, setForm] = useState<PricingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { managerService.getLocations().then((rows: LocationOption[]) => { setLocations(rows); if (rows[0]) setLocationId(rows[0]._id); }).catch((error: unknown) => setNotice({ type: 'error', text: messageFromError(error) })).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!locationId) return; setLoading(true); setNotice(null); managerService.getPricingForLocation(locationId).then((data: PricingConfig) => { setConfig(data); setForm(toForm(data)); setDirty(false); }).catch((error: unknown) => setNotice({ type: 'error', text: messageFromError(error) })).finally(() => setLoading(false)); }, [locationId]);
  const existingRules = useMemo(() => config?.rules ?? [], [config]);
  const changeNumber = (field: keyof Omit<PricingForm, 'slotPrices'>, value: string) => { setForm((current) => current ? { ...current, [field]: Number(value) } : current); setDirty(true); setNotice(null); };
  const selectLocation = (nextId: string) => { if (dirty && !window.confirm('Discard unsaved pricing changes?')) return; setLocationId(nextId); };
  const reset = () => { if (config) setForm(toForm(config)); setDirty(false); setNotice(null); };
  const save = async () => {
    if (!form || !config) return;
    setSaving(true); setNotice(null);
    const buildRule = (type: PricingRule['ruleType'], multiplier: number, defaults: PricingRule): PricingRule => ({ ...defaults, ...existingRules.find((rule) => rule.ruleType === type), multiplier, ruleType: type, isActive: true });
    const rules = [
      buildRule('PEAK', form.peakMultiplier, { ruleName: 'Peak Hours', ruleType: 'PEAK', multiplier: 1.5, fixedFee: 0, startTime: '08:00', endTime: '11:00', daysOfWeek: [1, 2, 3, 4, 5], priority: 10, isActive: true }),
      buildRule('OFF_PEAK', form.offPeakMultiplier, { ruleName: 'Off-Peak Hours', ruleType: 'OFF_PEAK', multiplier: 0.8, fixedFee: 0, startTime: '22:00', endTime: '06:00', daysOfWeek: [], priority: 5, isActive: true }),
      buildRule('WEEKEND', form.weekendMultiplier, { ruleName: 'Weekend', ruleType: 'WEEKEND', multiplier: 1.25, fixedFee: 0, daysOfWeek: [0, 6], priority: 8, isActive: true }),
    ];
    try {
      const updated = await managerService.updatePricing(locationId, { basePrice: form.basePrice, baseHourlyRate: form.baseHourlyRate, minimumCharge: form.minimumCharge, maximumDailyCharge: form.maximumDailyCharge, rules, overstayConfig: { gracePeriodMinutes: form.gracePeriodMinutes, fineIntervalMinutes: form.fineIntervalMinutes, fineAmountPerInterval: form.fineAmountPerInterval, maximumFineAmount: form.maximumFineAmount }, slotPrices: config.slots.map((slot) => ({ slotId: slot._id, hourlyRateOverride: form.slotPrices[slot._id] === '' ? null : Number(form.slotPrices[slot._id]) })) }) as PricingConfig;
      setConfig(updated); setForm(toForm(updated)); setDirty(false); setNotice({ type: 'success', text: 'Pricing saved. New reservations will use these rates.' });
    } catch (error) { setNotice({ type: 'error', text: messageFromError(error) }); } finally { setSaving(false); }
  };
  const numberField = (label: string, field: keyof Omit<PricingForm, 'slotPrices'>, options?: { min?: number; step?: number }) => <label className="space-y-1 text-sm font-semibold text-slate-700"><span>{label}</span><input type="number" min={options?.min ?? 0} step={options?.step ?? 1} required value={form?.[field] ?? 0} onChange={(event) => changeNumber(field, event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>;

  return <div className="p-6 max-w-7xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Manager Pricing</h1><p className="text-sm text-slate-500">Set facility and slot rates used by the server for future reservations.</p></div>
    <label className="block max-w-xl space-y-1 text-sm font-semibold text-slate-700"><span>Parking facility</span><select value={locationId} onChange={(event) => selectLocation(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Select a facility</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name} — {location.address}</option>)}</select></label>
    {notice && <div role="status" className={`rounded-xl border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{notice.text}</div>}
    {loading ? <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div> : form && config ? <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"><h2 className="text-lg font-bold">General and limits</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{numberField('Base / starting price (₹)', 'basePrice', { step: 0.01 })}{numberField('Hourly rate (₹)', 'baseHourlyRate', { step: 0.01 })}{numberField('Minimum charge (₹)', 'minimumCharge', { step: 0.01 })}{numberField('Daily maximum (₹)', 'maximumDailyCharge', { step: 0.01 })}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"><h2 className="text-lg font-bold">Time-based multipliers</h2><div className="grid gap-4 sm:grid-cols-3">{numberField('Peak multiplier', 'peakMultiplier', { min: 0.01, step: 0.05 })}{numberField('Off-peak multiplier', 'offPeakMultiplier', { min: 0.01, step: 0.05 })}{numberField('Weekend multiplier', 'weekendMultiplier', { min: 0.01, step: 0.05 })}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"><h2 className="text-lg font-bold">Overstay</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{numberField('Grace period (minutes)', 'gracePeriodMinutes')}{numberField('Fine interval (minutes)', 'fineIntervalMinutes', { min: 1 })}{numberField('Fine per interval (₹)', 'fineAmountPerInterval', { step: 0.01 })}{numberField('Maximum fine (₹)', 'maximumFineAmount', { step: 0.01 })}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"><div><h2 className="text-lg font-bold">Slot-specific hourly pricing</h2><p className="text-xs text-slate-500">Leave blank to inherit the facility hourly rate.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{config.slots.map((slot) => <label key={slot._id} className="rounded-xl border border-slate-200 p-3 text-sm font-semibold"><span className="flex justify-between"><span>{slot.slotNumber}</span><span className="text-xs text-slate-400">{slot.slotType}</span></span><span className="mt-2 flex items-center gap-2"><span>₹</span><input aria-label={`${slot.slotNumber} hourly price`} type="number" min="0" step="0.01" placeholder={String(form.baseHourlyRate)} value={form.slotPrices[slot._id] ?? ''} onChange={(event) => { const value = event.target.value; setForm((current) => current ? { ...current, slotPrices: { ...current.slotPrices, [slot._id]: value } } : current); setDirty(true); setNotice(null); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /><span className="text-xs text-slate-500">/ hour</span></span></label>)}</div></section>
      <div className="flex gap-3"><button type="button" onClick={save} disabled={saving || !dirty} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button><button type="button" onClick={reset} disabled={saving || !dirty} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Reset</button></div>
    </> : !locationId ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">No assigned parking facilities are available.</div> : null}
  </div>;
};
