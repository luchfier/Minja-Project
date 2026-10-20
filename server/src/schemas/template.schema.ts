// src/schemas/template.schema.ts
// Zod schemas untuk Template Foto 4R & Custom Canvas
// Sesuai API_CONTRACT.md §3.4

import { z } from 'zod';

export const templateSlotSchema = z.object({
  id: z.string().optional(),
  index: z.number().int().min(0).optional(),
  x: z.number().min(0, 'Posisi x tidak boleh negatif'),
  y: z.number().min(0, 'Posisi y tidak boleh negatif'),
  width: z.number().positive('Lebar slot harus lebih dari 0'),
  height: z.number().positive('Tinggi slot harus lebih dari 0'),
  rotation: z.number().optional().default(0),
  layerIndex: z.number().optional().default(1),
});

export const createTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama template wajib diisi').max(100),
    thumbnailUrl: z.string().optional().default(''),
    frameOverlayUrl: z.string().min(1, 'Frame overlay wajib ada'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    slotsCount: z.number().int().min(1).max(50).optional(),
    slots: z.array(templateSlotSchema).min(1, 'Minimal harus ada 1 slot foto'),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    slotsCount: data.slotsCount ?? data.slots.length,
  }))
  .refine((data) => data.slots.length === data.slotsCount, {
    message: 'Panjang array slots harus sama persis dengan slotsCount',
    path: ['slots'],
  })
  .refine(
    (data) => {
      // Mendukung kanvas standar 4R (1200x1800) hingga format resolusi tinggi (4800x4800)
      const maxWidth = 4800;
      const maxHeight = 4800;

      return data.slots.every(
        (slot) => slot.x <= maxWidth && slot.y <= maxHeight
      );
    },
    {
      message: 'Koordinat slot melampaui batas kanvas maksimum (4800px)',
      path: ['slots'],
    }
  );

export const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    thumbnailUrl: z.string().optional(),
    frameOverlayUrl: z.string().optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    slotsCount: z.number().int().min(1).max(50).optional(),
    slots: z.array(templateSlotSchema).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .transform((data) => {
    if (data.slots && data.slotsCount === undefined) {
      return { ...data, slotsCount: data.slots.length };
    }
    return data;
  });

