/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Backup utilities for Coldcard
 *
 * Coldcard uses 7z (AES-256) encrypted backups with a 12-word
 * backup password derived from the device seed.
 */

/**
 * Backup metadata
 */
export interface BackupInfo {
  /** Backup file path */
  filePath: string;
  /** Backup file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Creation timestamp */
  createdAt: number;
  /** Master fingerprint (XFP) */
  fingerprint?: string;
  /** Device serial number */
  serialNumber?: string;
  /** Firmware version at backup time */
  firmwareVersion?: string;
  /** Whether backup is encrypted */
  isEncrypted: boolean;
  /** SHA256 hash of file */
  sha256?: string;
}

/**
 * Seed XOR share
 */
export interface SeedXORShare {
  /** Share index (1-based) */
  index: number;
  /** Total shares */
  totalShares: number;
  /** Share words (24 words) */
  words: string[];
  /** Share identifier */
  identifier: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Seed XOR configuration
 */
export interface SeedXORConfig {
  /** Number of shares to create */
  shareCount: number;
  /** Original seed length (12 or 24 words) */
  seedLength: 12 | 24;
  /** Whether shares are printed or stored */
  storageMethod: 'print' | 'store';
}

/**
 * Paper backup verification result
 */
export interface PaperBackupVerification {
  /** Whether verification passed */
  verified: boolean;
  /** Number of words verified */
  wordsVerified: number;
  /** Total words */
  totalWords: number;
  /** Errors encountered */
  errors: string[];
}

/**
 * Generate backup file name with timestamp
 */
export function generateBackupFileName(fingerprint: string, extension: string = '7z'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `coldcard-${fingerprint}-${timestamp}.${extension}`;
}

/**
 * Parse backup file name to extract metadata
 */
export function parseBackupFileName(fileName: string): {
  fingerprint?: string;
  timestamp?: Date;
} {
  const match = fileName.match(/coldcard-([0-9A-F]{8})-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/i);

  if (!match) {
    return {};
  }

  const timestampStr = match[2].replace(/-/g, (m, i) => (i > 9 ? ':' : '-'));
  return {
    fingerprint: match[1],
    timestamp: new Date(timestampStr),
  };
}

/**
 * Calculate SHA256 hash of file content
 */
export function calculateFileHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Verify backup file integrity
 */
export function verifyBackupIntegrity(
  content: Buffer,
  expectedHash?: string,
): { valid: boolean; hash: string; error?: string } {
  const hash = calculateFileHash(content);

  if (expectedHash && hash !== expectedHash) {
    return {
      valid: false,
      hash,
      error: 'Hash mismatch - backup may be corrupted',
    };
  }

  // Check for 7z magic bytes
  const magic = content.slice(0, 6).toString('hex');
  if (magic !== '377abcaf271c') {
    return {
      valid: false,
      hash,
      error: 'Invalid 7z file format',
    };
  }

  return { valid: true, hash };
}

/**
 * Generate Seed XOR shares
 *
 * Seed XOR allows splitting a seed into multiple parts where
 * any single part appears to be a valid seed but the original
 * can only be recovered by XORing all parts together.
 */
export function generateSeedXORShares(
  seedWords: string[],
  shareCount: number,
): SeedXORShare[] {
  if (shareCount < 2 || shareCount > 4) {
    throw new Error('Share count must be between 2 and 4');
  }

  if (seedWords.length !== 12 && seedWords.length !== 24) {
    throw new Error('Seed must be 12 or 24 words');
  }

  // This is a simplified representation - actual XOR is done at byte level
  // In practice, Coldcard generates random shares and calculates final share
  const shares: SeedXORShare[] = [];
  const identifier = crypto.randomBytes(4).toString('hex');

  for (let i = 1; i <= shareCount; i++) {
    shares.push({
      index: i,
      totalShares: shareCount,
      words: [], // Would contain actual XOR share words
      identifier,
      createdAt: Date.now(),
    });
  }

  return shares;
}

/**
 * Validate seed XOR share
 */
export function validateSeedXORShare(share: SeedXORShare): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (share.index < 1 || share.index > share.totalShares) {
    errors.push('Invalid share index');
  }

  if (share.words.length !== 12 && share.words.length !== 24) {
    errors.push('Share must have 12 or 24 words');
  }

  if (!share.identifier || share.identifier.length !== 8) {
    errors.push('Invalid share identifier');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate backup password hint
 *
 * Coldcard uses a 12-word password for backup encryption,
 * derived deterministically from the seed. The hint shows
 * first letter of each word.
 */
export function generatePasswordHint(passwordWords: string[]): string {
  if (passwordWords.length !== 12) {
    throw new Error('Backup password must be 12 words');
  }

  return passwordWords.map((word) => word[0].toUpperCase()).join(' ');
}

/**
 * Verify paper backup word count
 */
export function verifyPaperBackup(words: string[], expectedLength: 12 | 24): PaperBackupVerification {
  const errors: string[] = [];

  if (words.length !== expectedLength) {
    errors.push(`Expected ${expectedLength} words, got ${words.length}`);
  }

  // Check each word is valid BIP39
  // Note: In production, would validate against BIP39 wordlist
  const validWords = words.filter((word) => word && word.length >= 3);

  if (validWords.length !== words.length) {
    errors.push(`${words.length - validWords.length} invalid words detected`);
  }

  return {
    verified: errors.length === 0,
    wordsVerified: validWords.length,
    totalWords: expectedLength,
    errors,
  };
}

/**
 * Estimate backup countdown time
 *
 * Coldcard has optional countdown before creating backups
 * to prevent rushed backups under duress.
 */
export function getCountdownDuration(securityLevel: 'low' | 'medium' | 'high'): number {
  switch (securityLevel) {
    case 'low':
      return 0;
    case 'medium':
      return 3600; // 1 hour
    case 'high':
      return 86400; // 24 hours
    default:
      return 0;
  }
}

/**
 * Format countdown time for display
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) {
    return 'Ready';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Get backup recommendations based on wallet activity
 */
export function getBackupRecommendations(
  lastBackupDate: Date | null,
  transactionCount: number,
  balanceSatoshis: number,
): string[] {
  const recommendations: string[] = [];

  // Check backup age
  if (!lastBackupDate) {
    recommendations.push('Create your first backup immediately');
  } else {
    const daysSinceBackup = Math.floor(
      (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceBackup > 90) {
      recommendations.push(`Last backup was ${daysSinceBackup} days ago - consider creating a new backup`);
    }
  }

  // Check balance
  if (balanceSatoshis > 10000000) {
    // > 0.1 BTC
    recommendations.push('High balance detected - ensure multiple backup copies in secure locations');
  }

  if (balanceSatoshis > 100000000) {
    // > 1 BTC
    recommendations.push('Consider using Seed XOR to split your backup');
  }

  // Check transaction activity
  if (transactionCount > 100) {
    recommendations.push('High transaction activity - verify backup periodically');
  }

  return recommendations;
}

/**
 * Validate backup directory path
 */
export function validateBackupPath(backupPath: string): { valid: boolean; error?: string } {
  // Check for suspicious paths
  if (backupPath.includes('..')) {
    return { valid: false, error: 'Path traversal not allowed' };
  }

  // Check for absolute path
  if (!path.isAbsolute(backupPath)) {
    return { valid: false, error: 'Backup path must be absolute' };
  }

  return { valid: true };
}
