// src/utils/auth.util.ts
// Utility autentikasi: Argon2id hashing & JWT token management
// Sesuai SECURITY.md §2.2 & §2.4

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';

/**
 * Parameter Argon2id sesuai rekomendasi OWASP & SECURITY.md §2.2
 */
const ARGON2_CONFIG: argon2.HashOptions & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterasi
  parallelism: 4,
  hashLength: 32,
  raw: false,
};

/**
 * Hash PIN menggunakan Argon2id
 */
export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, ARGON2_CONFIG);
}

/**
 * Verifikasi PIN input dengan hash yang tersimpan
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pin);
  } catch {
    return false;
  }
}

export interface AdminJwtPayload {
  sub: string;
  role: 'admin';
  iss: string;
}

/**
 * Terbitkan JWT untuk sesi admin (masa berlaku 4 jam sesuai SECURITY.md §2.4)
 */
export function signAdminToken(adminId: string): { token: string; expiresAt: string } {
  const env = getEnv();
  const expiresInSeconds = 4 * 60 * 60; // 4 jam
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const token = jwt.sign(
    {
      sub: adminId,
      role: 'admin',
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '4h',
      issuer: 'minjaphotobooth',
    }
  );

  return { token, expiresAt };
}

/**
 * Verifikasi JWT token admin
 */
export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'minjaphotobooth',
    }) as AdminJwtPayload;

    return decoded;
  } catch {
    return null;
  }
}
