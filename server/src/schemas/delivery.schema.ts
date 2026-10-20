// src/schemas/delivery.schema.ts
// Zod schemas untuk Distribusi Digital (WhatsApp & Cloud Storage Gallery)
// Sesuai ARCHITECTURE.md §4.2, §5.1 & THE_NEXT_STEP.md §6

import { z } from 'zod';

export const sendWhatsAppSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(9, 'Nomor telepon minimal 9 digit')
    .max(18, 'Nomor telepon maksimal 18 digit')
    .regex(/^[0-9+ \-]+$/, 'Format nomor WhatsApp hanya boleh angka dan tanda plus'),
});

export const uploadGalleryFileSchema = z.object({
  fileType: z.enum(['layout_4r', 'gif', 'live_video', 'raw_photo']).default('layout_4r'),
  dataUrl: z.string().min(1, 'Data URL / base64 content wajib disertakan'),
  fileName: z.string().optional(),
});

export type SendWhatsAppInput = z.infer<typeof sendWhatsAppSchema>;
export type UploadGalleryFileInput = z.infer<typeof uploadGalleryFileSchema>;
