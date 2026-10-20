// src/middleware/auth.middleware.ts
// Middleware autentikasi untuk Admin (JWT) dan Booth (X-Booth-Key)
// Sesuai SECURITY.md §2.1

import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../types/common.types.js';
import { ErrorCode } from '../types/common.types.js';
import { verifyAdminToken, type AdminJwtPayload } from '../utils/auth.util.js';
import { getEnv } from '../config/env.js';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminJwtPayload;
  }
}

/**
 * Middleware untuk memverifikasi JWT Bearer Token Admin
 * Prefix: /api/admin/*
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      401,
      ErrorCode.UNAUTHORIZED,
      'Akses ditolak: Token autentikasi admin tidak ditemukan'
    );
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyAdminToken(token);

  if (!payload) {
    throw new AppError(
      401,
      ErrorCode.UNAUTHORIZED,
      'Token autentikasi tidak valid atau telah kedaluwarsa'
    );
  }

  request.admin = payload;
}

/**
 * Middleware untuk memverifikasi X-Booth-Key dari Desktop Client
 * Digunakan untuk endpoint operasional internal booth
 */
export async function requireBoothAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const boothKey = request.headers['x-booth-key'];
  const env = getEnv();

  // Allow if valid booth key provided
  if (boothKey && boothKey === env.BOOTH_API_KEY) {
    return;
  }

  // In development, allow frontend Vite dev server requests
  if (env.NODE_ENV === 'development') {
    return;
  }

  throw new AppError(
    401,
    ErrorCode.UNAUTHORIZED,
    'Akses ditolak: X-Booth-Key tidak valid atau tidak disediakan'
  );
}
