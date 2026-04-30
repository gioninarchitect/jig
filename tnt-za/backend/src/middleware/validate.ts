import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { z } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ success: false, error: `Validation failed: ${messages}` });
      }
      next(err);
    }
  };
}

// ── Schemas ──

export const registerPlantSchema = z.object({
  strain: z.string().min(1, 'Strain is required'),
  facilityId: z.string().uuid(),
  zoneId: z.string().uuid(),
  motherPlantId: z.string().uuid().optional(),
});

export const transitionPhaseSchema = z.object({
  weight: z.number().positive().optional(),
});

export const flagPlantSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const registerContainerSchema = z.object({
  containerType: z.enum(['BIN', 'RACK', 'BAG', 'JAR', 'PACKAGE', 'CUSTOM']),
  facilityId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
});

export const containerEventSchema = z.object({
  weight: z.number().positive('Weight must be positive'),
  weightUnit: z.string().default('g'),
  zoneId: z.string().uuid().optional(),
  toZoneId: z.string().uuid().optional(),
  incomingHandlerId: z.string().uuid().optional(),
});

export const submitLabResultSchema = z.object({
  batchId: z.string().uuid(),
  testType: z.enum(['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER']),
  resultData: z.object({}).passthrough(),
  passed: z.boolean(),
});

export const createBatchSchema = z.object({
  plantIds: z.array(z.string().uuid()).min(1, 'At least one plant required'),
});

export const resolveAnomalySchema = z.object({
  investigationNotes: z.string().min(1, 'Investigation notes are required'),
});

export const requestPinSchema = z.object({
  email: z.string().email('Valid email required'),
});

export const verifyPinSchema = z.object({
  email: z.string().email(),
  pin: z.string().length(6, 'PIN must be 6 digits'),
});
