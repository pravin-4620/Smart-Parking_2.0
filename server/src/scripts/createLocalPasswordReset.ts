import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';

const input = z.object({
  NODE_ENV: z.literal('development'),
  LOCAL_RESET_CONFIRM: z.literal('GENERATE_LOCAL_RESET'),
  LOCAL_RESET_EMAIL: z.string().email(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
}).parse(process.env);

try {
  if (!(await connectDatabase())) throw new Error('Database connection failed');
  const user = await User.findOne({ email: input.LOCAL_RESET_EMAIL.trim().toLowerCase(), isActive: true });
  if (!user) throw new Error('Eligible account not found');
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  user.emailVerificationExpires = new Date(Date.now() + 30 * 60_000);
  await user.save();
  console.log(`${input.CLIENT_URL.replace(/\/$/, '')}/reset-password?token=${token}`);
  console.log('This one-time local-development link expires in 30 minutes. Do not share or log it elsewhere.');
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
