/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Hardware Security Module (HSM) mode configuration for Coldcard
 *
 * HSM mode allows automated signing with policy-based rules,
 * enabling unattended operation while maintaining security.
 */

/**
 * HSM operation modes
 */
export enum HSMMode {
  /** HSM disabled - manual signing only */
  DISABLED = 'disabled',
  /** HSM enabled with policy */
  ENABLED = 'enabled',
  /** HSM in paused state */
  PAUSED = 'paused',
}

/**
 * HSM velocity period options
 */
export enum VelocityPeriod {
  /** Per hour limits */
  HOUR = 'hour',
  /** Per day limits */
  DAY = 'day',
  /** Per week limits */
  WEEK = 'week',
  /** Per month limits */
  MONTH = 'month',
}

/**
 * HSM rule types
 */
export enum HSMRuleType {
  /** Whitelist specific addresses */
  WHITELIST = 'whitelist',
  /** Set velocity (spending) limits */
  VELOCITY = 'velocity',
  /** Require minimum confirmations */
  CONFIRMATIONS = 'confirmations',
  /** Limit per-transaction amount */
  PER_TX_LIMIT = 'per_tx_limit',
  /** Time-based restrictions */
  TIME_LOCK = 'time_lock',
  /** User authorization required */
  USER_AUTH = 'user_auth',
  /** Path restrictions */
  PATH_RESTRICTION = 'path_restriction',
}

/**
 * HSM policy structure
 */
export interface HSMPolicy {
  /** Policy version */
  version: number;
  /** Policy name */
  name: string;
  /** Whether HSM is enabled */
  enabled: boolean;
  /** List of rules */
  rules: HSMRule[];
  /** Authorized users */
  users?: HSMUser[];
  /** Global velocity limits */
  velocity?: VelocityLimit;
  /** Whitelist configuration */
  whitelist?: WhitelistConfig;
  /** Boot-to-HSM settings */
  bootToHSM?: boolean;
  /** Allow arbitrary message signing */
  allowMsgSign?: boolean;
  /** Must include change output */
  mustHaveChange?: boolean;
  /** Warn on unusual PSBTs */
  warnOnUnusual?: boolean;
}

/**
 * HSM rule definition
 */
export interface HSMRule {
  /** Rule type */
  type: HSMRuleType;
  /** Rule configuration */
  config: Record<string, unknown>;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Rule description */
  description?: string;
}

/**
 * HSM user definition
 */
export interface HSMUser {
  /** User identifier */
  id: string;
  /** User name */
  name: string;
  /** User's public key for authorization */
  pubkey?: string;
  /** Per-user velocity limits */
  velocity?: VelocityLimit;
  /** User-specific whitelist */
  whitelist?: string[];
  /** Whether user is active */
  active: boolean;
}

/**
 * Velocity (spending) limit configuration
 */
export interface VelocityLimit {
  /** Maximum amount per period (in satoshis) */
  maxAmount: number;
  /** Time period for limit */
  period: VelocityPeriod;
  /** Maximum number of transactions per period */
  maxTxCount?: number;
  /** Current period usage */
  currentUsage?: number;
  /** Period reset timestamp */
  periodReset?: number;
}

/**
 * Whitelist configuration
 */
export interface WhitelistConfig {
  /** Whitelisted addresses */
  addresses: string[];
  /** Whether to require whitelist match */
  required: boolean;
  /** Allow change to non-whitelisted (own) addresses */
  allowChange: boolean;
}

/**
 * HSM status information
 */
export interface HSMStatus {
  /** Current HSM mode */
  mode: HSMMode;
  /** Active policy name */
  policyName?: string;
  /** Time HSM was enabled */
  enabledAt?: number;
  /** Number of signatures performed */
  signatureCount: number;
  /** Current velocity usage */
  velocityUsage?: VelocityLimit;
  /** Last signing timestamp */
  lastSignature?: number;
  /** Any warnings */
  warnings?: string[];
}

/**
 * HSM mode options for n8n UI
 */
export const HSM_MODE_OPTIONS = [
  {
    name: 'Disabled',
    value: HSMMode.DISABLED,
    description: 'HSM mode off - manual signing required',
  },
  {
    name: 'Enabled',
    value: HSMMode.ENABLED,
    description: 'HSM mode active with policy enforcement',
  },
  {
    name: 'Paused',
    value: HSMMode.PAUSED,
    description: 'HSM mode temporarily paused',
  },
];

/**
 * Velocity period options for n8n UI
 */
export const VELOCITY_PERIOD_OPTIONS = [
  {
    name: 'Per Hour',
    value: VelocityPeriod.HOUR,
    description: 'Reset velocity limits every hour',
  },
  {
    name: 'Per Day',
    value: VelocityPeriod.DAY,
    description: 'Reset velocity limits every 24 hours',
  },
  {
    name: 'Per Week',
    value: VelocityPeriod.WEEK,
    description: 'Reset velocity limits every 7 days',
  },
  {
    name: 'Per Month',
    value: VelocityPeriod.MONTH,
    description: 'Reset velocity limits every 30 days',
  },
];

/**
 * HSM rule type options for n8n UI
 */
export const HSM_RULE_TYPE_OPTIONS = [
  {
    name: 'Address Whitelist',
    value: HSMRuleType.WHITELIST,
    description: 'Only sign to approved addresses',
  },
  {
    name: 'Velocity Limit',
    value: HSMRuleType.VELOCITY,
    description: 'Set spending limits per period',
  },
  {
    name: 'Per-Transaction Limit',
    value: HSMRuleType.PER_TX_LIMIT,
    description: 'Maximum amount per transaction',
  },
  {
    name: 'User Authorization',
    value: HSMRuleType.USER_AUTH,
    description: 'Require specific user approval',
  },
  {
    name: 'Path Restriction',
    value: HSMRuleType.PATH_RESTRICTION,
    description: 'Restrict signing to specific paths',
  },
  {
    name: 'Time Lock',
    value: HSMRuleType.TIME_LOCK,
    description: 'Time-based signing restrictions',
  },
];

/**
 * Default HSM policy template
 */
export const DEFAULT_HSM_POLICY: HSMPolicy = {
  version: 1,
  name: 'Default Policy',
  enabled: false,
  rules: [],
  bootToHSM: false,
  allowMsgSign: false,
  mustHaveChange: true,
  warnOnUnusual: true,
};

/**
 * Convert satoshis to BTC for display
 */
export function satoshisToBTC(satoshis: number): number {
  return satoshis / 100000000;
}

/**
 * Convert BTC to satoshis for storage
 */
export function btcToSatoshis(btc: number): number {
  return Math.round(btc * 100000000);
}
