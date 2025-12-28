/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * PIN types and security configurations for Coldcard
 *
 * Coldcard supports multiple PIN types for different security scenarios:
 * - Main PIN: Primary device access
 * - Secondary PIN: Alternative wallet access
 * - Duress PIN: Decoy wallet under coercion
 * - Brick PIN: Destroy device if entered
 * - Trick PINs: Various decoy behaviors
 */

/**
 * PIN types supported by Coldcard
 */
export enum PINType {
  /** Main device PIN */
  MAIN = 'main',
  /** Secondary wallet PIN */
  SECONDARY = 'secondary',
  /** Duress PIN (decoy wallet under threat) */
  DURESS = 'duress',
  /** Brick PIN (destroys device) */
  BRICK = 'brick',
  /** Trick PIN (configurable decoy) */
  TRICK = 'trick',
}

/**
 * Trick PIN behaviors
 */
export enum TrickPINBehavior {
  /** Show a specific decoy wallet */
  DECOY_WALLET = 'decoy_wallet',
  /** Wipe device immediately */
  WIPE = 'wipe',
  /** Show empty wallet */
  EMPTY = 'empty',
  /** Countdown then wipe */
  COUNTDOWN_WIPE = 'countdown_wipe',
  /** Fake login attempt counter */
  FAKE_COUNTER = 'fake_counter',
  /** Delta mode (offset from main) */
  DELTA = 'delta',
  /** Look blank/unused */
  BLANK = 'blank',
}

/**
 * PIN policy configuration
 */
export interface PINPolicy {
  /** Minimum PIN length */
  minLength: number;
  /** Maximum PIN length */
  maxLength: number;
  /** Number of wrong attempts before action */
  maxAttempts: number;
  /** Action after max attempts */
  lockoutAction: LockoutAction;
  /** Lockout duration in seconds (if applicable) */
  lockoutDuration?: number;
  /** Enable login countdown */
  loginCountdown: boolean;
  /** Countdown duration in seconds */
  countdownDuration?: number;
}

/**
 * Lockout actions after failed PIN attempts
 */
export enum LockoutAction {
  /** Temporary lockout */
  TEMPORARY = 'temporary',
  /** Require countdown */
  COUNTDOWN = 'countdown',
  /** Brick device */
  BRICK = 'brick',
  /** Wipe device */
  WIPE = 'wipe',
}

/**
 * PIN attempt status
 */
export interface PINAttemptStatus {
  /** Number of attempts remaining */
  attemptsRemaining: number;
  /** Whether device is locked */
  isLocked: boolean;
  /** Lockout end time (if applicable) */
  lockoutEnds?: number;
  /** Countdown active */
  countdownActive: boolean;
  /** Countdown remaining (seconds) */
  countdownRemaining?: number;
}

/**
 * Trick PIN configuration
 */
export interface TrickPINConfig {
  /** PIN digits */
  pin: string;
  /** Behavior when entered */
  behavior: TrickPINBehavior;
  /** Custom wallet to show (if decoy) */
  decoyWallet?: string;
  /** Countdown before action (seconds) */
  countdownSeconds?: number;
  /** Delta offset from main PIN */
  deltaOffset?: number;
  /** Description for user */
  description?: string;
}

/**
 * PIN type options for n8n UI
 */
export const PIN_TYPE_OPTIONS = [
  {
    name: 'Main PIN',
    value: PINType.MAIN,
    description: 'Primary device access PIN',
  },
  {
    name: 'Secondary PIN',
    value: PINType.SECONDARY,
    description: 'Alternative wallet access',
  },
  {
    name: 'Duress PIN',
    value: PINType.DURESS,
    description: 'Decoy wallet under coercion',
  },
  {
    name: 'Brick PIN',
    value: PINType.BRICK,
    description: 'Destroys device when entered - USE WITH CAUTION',
  },
  {
    name: 'Trick PIN',
    value: PINType.TRICK,
    description: 'Custom decoy behavior',
  },
];

/**
 * Trick PIN behavior options for n8n UI
 */
export const TRICK_PIN_BEHAVIOR_OPTIONS = [
  {
    name: 'Decoy Wallet',
    value: TrickPINBehavior.DECOY_WALLET,
    description: 'Show a specific decoy wallet',
  },
  {
    name: 'Wipe Device',
    value: TrickPINBehavior.WIPE,
    description: 'Immediately wipe the device',
  },
  {
    name: 'Empty Wallet',
    value: TrickPINBehavior.EMPTY,
    description: 'Show an empty wallet',
  },
  {
    name: 'Countdown Wipe',
    value: TrickPINBehavior.COUNTDOWN_WIPE,
    description: 'Start countdown then wipe',
  },
  {
    name: 'Fake Counter',
    value: TrickPINBehavior.FAKE_COUNTER,
    description: 'Show fake login attempt counter',
  },
  {
    name: 'Delta Mode',
    value: TrickPINBehavior.DELTA,
    description: 'Offset from main PIN seed',
  },
  {
    name: 'Look Blank',
    value: TrickPINBehavior.BLANK,
    description: 'Device appears unused',
  },
];

/**
 * Lockout action options for n8n UI
 */
export const LOCKOUT_ACTION_OPTIONS = [
  {
    name: 'Temporary Lockout',
    value: LockoutAction.TEMPORARY,
    description: 'Lock for a set duration',
  },
  {
    name: 'Require Countdown',
    value: LockoutAction.COUNTDOWN,
    description: 'Force countdown before next attempt',
  },
  {
    name: 'Brick Device',
    value: LockoutAction.BRICK,
    description: 'Permanently destroy device',
  },
  {
    name: 'Wipe Device',
    value: LockoutAction.WIPE,
    description: 'Wipe all data from device',
  },
];

/**
 * Default PIN policy
 */
export const DEFAULT_PIN_POLICY: PINPolicy = {
  minLength: 4,
  maxLength: 12,
  maxAttempts: 13,
  lockoutAction: LockoutAction.COUNTDOWN,
  loginCountdown: false,
  countdownDuration: 0,
};

/**
 * PIN validation constraints
 */
export const PIN_CONSTRAINTS = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 12,
  MAX_PREFIX_LENGTH: 6,
  MAX_SUFFIX_LENGTH: 6,
  ALLOWED_CHARACTERS: '0123456789',
};

/**
 * Validate PIN format
 */
export function isValidPIN(pin: string): boolean {
  if (pin.length < PIN_CONSTRAINTS.MIN_LENGTH || pin.length > PIN_CONSTRAINTS.MAX_LENGTH) {
    return false;
  }

  return /^\d+$/.test(pin);
}

/**
 * Format PIN for display (partial masking)
 */
export function maskPIN(pin: string): string {
  if (pin.length <= 2) {
    return '*'.repeat(pin.length);
  }
  return pin[0] + '*'.repeat(pin.length - 2) + pin[pin.length - 1];
}
