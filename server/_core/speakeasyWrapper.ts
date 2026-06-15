// ESM-compatible wrapper for speakeasy
// This module wraps the CommonJS speakeasy library for use in ESM environments

// @ts-ignore - speakeasy doesn't have TypeScript definitions
import speakeasyModule from 'speakeasy';

const speakeasy = speakeasyModule as any;

export interface OTPVerifyOptions {
  secret: string;
  encoding: string;
  token: string;
  window: number;
}

export interface OTPGenerateSecretOptions {
  name: string;
  issuer: string;
  length: number;
}

export interface GeneratedSecret {
  secret: string;
  base32: string;
  otpauth_url: string;
}

export const totpVerify = (options: OTPVerifyOptions): boolean => {
  return speakeasy.totp.verify(options);
};

export const generateSecret = (options: OTPGenerateSecretOptions): GeneratedSecret => {
  return speakeasy.generateSecret(options);
};

export default {
  totp: {
    verify: totpVerify,
  },
  generateSecret,
};
