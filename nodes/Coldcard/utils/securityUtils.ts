/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as crypto from 'crypto';

/**
 * Security utilities for Coldcard operations
 *
 * Implements security checks and validations for hardware wallet operations.
 * Security is paramount - these utilities help ensure safe operation.
 */

/**
 * Device genuineness verification result
 */
export interface GenuinenessResult {
  /** Whether device passed verification */
  genuine: boolean;
  /** Verification timestamp */
  verifiedAt: number;
  /** Certificate chain valid */
  certificateValid: boolean;
  /** Factory certificate present */
  factoryCertificate: boolean;
  /** Batch certificate present */
  batchCertificate: boolean;
  /** Attestation valid */
  attestationValid: boolean;
  /** Error message if not genuine */
  error?: string;
}

/**
 * Anti-phishing words configuration
 */
export interface AntiPhishingWords {
  /** Two words shown on device after PIN prefix */
  words: [string, string];
  /** When words were set */
  setAt: number;
}

/**
 * Tamper detection status
 */
export interface TamperStatus {
  /** Whether any tamper flags are set */
  tampered: boolean;
  /** Specific tamper flags */
  flags: {
    /** Secure element breach detected */
    secureElementBreach: boolean;
    /** Case opening detected */
    caseOpened: boolean;
    /** Firmware modified */
    firmwareModified: boolean;
    /** Boot sequence anomaly */
    bootAnomaly: boolean;
  };
  /** Last check timestamp */
  lastCheck: number;
}

/**
 * Security settings
 */
export interface SecuritySettings {
  /** Login countdown enabled */
  loginCountdown: boolean;
  /** Countdown duration in seconds */
  countdownDuration: number;
  /** USB disabled */
  usbDisabled: boolean;
  /** NFC disabled (Q model) */
  nfcDisabled: boolean;
  /** Virtual disk disabled */
  virtualDiskDisabled: boolean;
  /** Anti-phishing words set */
  antiPhishingEnabled: boolean;
  /** Brick PIN set */
  brickPinSet: boolean;
  /** Duress PIN set */
  duressPinSet: boolean;
}

/**
 * Kill key (emergency wipe) result
 */
export interface KillKeyResult {
  /** Whether wipe was initiated */
  initiated: boolean;
  /** Countdown seconds (if applicable) */
  countdown?: number;
  /** Confirmation required */
  confirmationRequired: boolean;
}

/**
 * Verify device certificate signature
 */
export function verifyCertificateSignature(
  certificate: Buffer,
  signature: Buffer,
  publicKey: Buffer,
): boolean {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(certificate);
    return verify.verify(
      {
        key: publicKey,
        format: 'der',
        type: 'spki',
      },
      signature,
    );
  } catch {
    return false;
  }
}

/**
 * Generate random anti-phishing words
 *
 * Uses a subset of BIP39 words for easy recognition
 */
export function generateAntiPhishingWords(): [string, string] {
  // Simplified word list - in production, use full BIP39 list
  const wordList = [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
    'access',
    'accident',
    'account',
    'accuse',
    'achieve',
    'acid',
    'acoustic',
    'acquire',
    'across',
    'act',
  ];

  const word1 = wordList[Math.floor(Math.random() * wordList.length)];
  let word2 = wordList[Math.floor(Math.random() * wordList.length)];

  // Ensure words are different
  while (word2 === word1) {
    word2 = wordList[Math.floor(Math.random() * wordList.length)];
  }

  return [word1, word2];
}

/**
 * Validate anti-phishing words match expected
 */
export function validateAntiPhishingWords(
  displayed: [string, string],
  expected: [string, string],
): boolean {
  return (
    displayed[0].toLowerCase() === expected[0].toLowerCase() &&
    displayed[1].toLowerCase() === expected[1].toLowerCase()
  );
}

/**
 * Calculate firmware hash
 */
export function calculateFirmwareHash(firmware: Buffer): string {
  // Coldcard uses double SHA256 for firmware verification
  const firstHash = crypto.createHash('sha256').update(firmware).digest();
  return crypto.createHash('sha256').update(firstHash).digest('hex');
}

/**
 * Verify firmware signature
 */
export function verifyFirmwareSignature(
  firmware: Buffer,
  signature: Buffer,
  coinkitePublicKey: Buffer,
): boolean {
  try {
    const hash = calculateFirmwareHash(firmware);
    const verify = crypto.createVerify('SHA256');
    verify.update(Buffer.from(hash, 'hex'));
    return verify.verify(
      {
        key: coinkitePublicKey,
        format: 'der',
        type: 'spki',
      },
      signature,
    );
  } catch {
    return false;
  }
}

/**
 * Generate secure random bytes
 */
export function generateSecureRandom(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Generate entropy for seed generation
 */
export function generateEntropy(bits: 128 | 256 = 256): Buffer {
  return crypto.randomBytes(bits / 8);
}

/**
 * Calculate login countdown remaining time
 */
export function calculateCountdownRemaining(
  countdownStart: number,
  countdownDuration: number,
): number {
  const elapsed = Math.floor((Date.now() - countdownStart) / 1000);
  return Math.max(0, countdownDuration - elapsed);
}

/**
 * Security check for PSBT signing
 */
export interface PSBTSecurityCheck {
  /** Overall security assessment */
  safe: boolean;
  /** Risk level (0-100) */
  riskLevel: number;
  /** Security warnings */
  warnings: string[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Perform security check on PSBT before signing
 */
export function checkPSBTSecurity(
  totalInputValue: number,
  totalOutputValue: number,
  fee: number,
  changeOutputCount: number,
  destinationCount: number,
): PSBTSecurityCheck {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskLevel = 0;

  // Check for negative fee (inputs < outputs)
  if (fee < 0) {
    warnings.push('Transaction creates value from nothing - likely malicious');
    riskLevel += 50;
  }

  // Check for very high fee
  const feePercentage = (fee / totalInputValue) * 100;
  if (feePercentage > 10) {
    warnings.push(`Fee is ${feePercentage.toFixed(1)}% of input value`);
    riskLevel += 20;
  }

  // Check for no change output (sending entire balance)
  if (changeOutputCount === 0 && destinationCount === 1) {
    warnings.push('No change output - sending entire balance minus fee');
    recommendations.push('Verify this is intentional');
    riskLevel += 10;
  }

  // Check for many outputs (potential mixing/coinjoin)
  if (destinationCount > 10) {
    warnings.push(`Transaction has ${destinationCount} outputs`);
    recommendations.push('Verify all destination addresses');
    riskLevel += 15;
  }

  // Check for dust outputs
  if (totalOutputValue < 546) {
    warnings.push('Contains dust outputs below 546 satoshis');
    riskLevel += 5;
  }

  return {
    safe: riskLevel < 30,
    riskLevel: Math.min(100, riskLevel),
    warnings,
    recommendations,
  };
}

/**
 * Sanitize sensitive data for logging
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'pin',
    'password',
    'seed',
    'mnemonic',
    'privateKey',
    'secret',
    'passphrase',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if running in secure environment
 */
export function checkSecureEnvironment(): { secure: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for debug mode
  if (process.env.NODE_ENV === 'development') {
    warnings.push('Running in development mode');
  }

  // Check for insecure memory
  if (process.env.NODE_OPTIONS?.includes('--expose-gc')) {
    warnings.push('Garbage collector exposed - memory may be inspectable');
  }

  return {
    secure: warnings.length === 0,
    warnings,
  };
}

/**
 * Rate limiter for sensitive operations
 */
export class SecurityRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if operation should be allowed
   */
  checkLimit(key: string): { allowed: boolean; remainingAttempts: number; resetMs: number } {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside window
    const validAttempts = attempts.filter((time) => now - time < this.windowMs);
    this.attempts.set(key, validAttempts);

    const allowed = validAttempts.length < this.maxAttempts;
    const remainingAttempts = Math.max(0, this.maxAttempts - validAttempts.length);

    let resetMs = 0;
    if (validAttempts.length > 0) {
      resetMs = Math.max(0, this.windowMs - (now - validAttempts[0]));
    }

    return { allowed, remainingAttempts, resetMs };
  }

  /**
   * Record an attempt
   */
  recordAttempt(key: string): void {
    const attempts = this.attempts.get(key) || [];
    attempts.push(Date.now());
    this.attempts.set(key, attempts);
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}
