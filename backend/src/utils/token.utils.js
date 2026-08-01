import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import env from '../config/env.js';

// ─── Audience constants ─────────────────────────────────────────────────────
// Each token type carries a distinct `aud` claim so that a token issued for
// one purpose cannot be accepted by a verifier expecting a different purpose.
const AUD_ACCESS  = 'capitalscale:access';
const AUD_REFRESH = 'capitalscale:refresh';
const AUD_MFA     = 'capitalscale:mfa';




export const generateAccessToken = (payload, sessionId) => {
  return jwt.sign(
    { ...payload, sessionId },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      jwtid:     uuidv4(),
      audience:  AUD_ACCESS,
    }
  );
};


export const generateRefreshToken = (payload, jti = uuidv4()) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    jwtid:     jti,
    audience:  AUD_REFRESH,
  });
};


// MFA temp token uses its own dedicated secret — completely isolated from access tokens.
export const generateMfaToken = (payload) => {
  return jwt.sign(payload, env.JWT_MFA_SECRET, {
    expiresIn: '5m',
    jwtid:     uuidv4(),
    audience:  AUD_MFA,
  });
};


export const verifyMfaToken = (token) => {
  // Audience assertion ensures an access/refresh token cannot be used here.
  return jwt.verify(token, env.JWT_MFA_SECRET, { audience: AUD_MFA });
};


export const verifyAccessToken = (token) => {
  // Audience assertion ensures an MFA or refresh token cannot be used here.
  return jwt.verify(token, env.JWT_SECRET, { audience: AUD_ACCESS });
};


export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { audience: AUD_REFRESH });
};


export const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,                           // Not accessible from JS
    secure:   env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000,      // 30 days in ms
    path:     '/api/v1/auth',                 // Scoped to auth endpoints only
  });
};


export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path:     '/api/v1/auth',
  });
};


export const buildTokenPayload = (user, type) => ({
  id:            user.id,
  email:         user.email,
  role:          type,
  role_id:       user.role_id,
  bank_name:     user.bank_name,
  admin_name:    user.admin_name,
  business_name: user.business_name,
});


export const sanitizeUser = (user, type) => {
  const obj = { ...user };
  delete obj.password_hash;
  obj.type = type;
  obj.role = type;
  return obj;
};


// ─── OTP hashing helpers ────────────────────────────────────────────────────
// OTPs are hashed with HMAC-SHA256 before storage so plaintext codes are never
// persisted. JWT_MFA_SECRET is used as the HMAC key (semantically related and
// already required). A timing-safe comparison is used during verification.

export const hashOtpCode = (code) =>
  crypto.createHmac('sha256', env.JWT_MFA_SECRET).update(String(code)).digest('hex');

export const verifyOtpCode = (inputCode, storedHash) => {
  const inputHash = hashOtpCode(inputCode);
  if (inputHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
};
