/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * BIP Standard derivation path templates
 */
export enum DerivationStandard {
  /** BIP-44: Legacy P2PKH */
  BIP44 = 'bip44',
  /** BIP-49: Nested SegWit P2SH-P2WPKH */
  BIP49 = 'bip49',
  /** BIP-84: Native SegWit P2WPKH */
  BIP84 = 'bip84',
  /** BIP-86: Taproot P2TR */
  BIP86 = 'bip86',
  /** BIP-48: Multisig */
  BIP48 = 'bip48',
  /** Custom derivation path */
  CUSTOM = 'custom',
}

/**
 * Purpose constants for derivation paths
 */
export const PURPOSE = {
  BIP44: 44,
  BIP49: 49,
  BIP84: 84,
  BIP86: 86,
  BIP48: 48,
};

/**
 * Coin type constants
 */
export const COIN_TYPE = {
  BITCOIN_MAINNET: 0,
  BITCOIN_TESTNET: 1,
};

/**
 * Script type constants for BIP-48 multisig
 */
export const SCRIPT_TYPE = {
  P2SH: 1,
  P2SH_P2WSH: 2,
  P2WSH: 3,
};

/**
 * Derivation path templates
 */
export const DERIVATION_TEMPLATES = {
  // Single-sig paths
  BIP44_MAINNET: "m/44'/0'/0'",
  BIP44_TESTNET: "m/44'/1'/0'",
  BIP49_MAINNET: "m/49'/0'/0'",
  BIP49_TESTNET: "m/49'/1'/0'",
  BIP84_MAINNET: "m/84'/0'/0'",
  BIP84_TESTNET: "m/84'/1'/0'",
  BIP86_MAINNET: "m/86'/0'/0'",
  BIP86_TESTNET: "m/86'/1'/0'",

  // Multisig paths (BIP-48)
  BIP48_P2SH_MAINNET: "m/48'/0'/0'/1'",
  BIP48_P2SH_TESTNET: "m/48'/1'/0'/1'",
  BIP48_P2SH_P2WSH_MAINNET: "m/48'/0'/0'/2'",
  BIP48_P2SH_P2WSH_TESTNET: "m/48'/1'/0'/2'",
  BIP48_P2WSH_MAINNET: "m/48'/0'/0'/3'",
  BIP48_P2WSH_TESTNET: "m/48'/1'/0'/3'",
};

/**
 * Derivation path options for n8n UI
 */
export const DERIVATION_PATH_OPTIONS = [
  {
    name: 'BIP-84 Native SegWit (Default)',
    value: 'bip84',
    description: "m/84'/0'/0' - Recommended for most users",
  },
  {
    name: 'BIP-49 Nested SegWit',
    value: 'bip49',
    description: "m/49'/0'/0' - Compatible with older wallets",
  },
  {
    name: 'BIP-44 Legacy',
    value: 'bip44',
    description: "m/44'/0'/0' - Legacy compatibility",
  },
  {
    name: 'BIP-86 Taproot',
    value: 'bip86',
    description: "m/86'/0'/0' - Taproot addresses",
  },
  {
    name: 'Custom Path',
    value: 'custom',
    description: 'Specify a custom derivation path',
  },
];

/**
 * Multisig derivation path options
 */
export const MULTISIG_PATH_OPTIONS = [
  {
    name: 'BIP-48 Native SegWit (P2WSH)',
    value: 'p2wsh',
    description: "m/48'/0'/0'/2' - Recommended for multisig",
  },
  {
    name: 'BIP-48 Nested SegWit (P2SH-P2WSH)',
    value: 'p2sh-p2wsh',
    description: "m/48'/0'/0'/1' - Compatible with older wallets",
  },
  {
    name: 'BIP-48 Legacy (P2SH)',
    value: 'p2sh',
    description: "m/48'/0'/0'/0' - Legacy multisig",
  },
];

/**
 * Build derivation path from parameters
 */
export function buildDerivationPath(
  purpose: number,
  coinType: number,
  account: number,
  change?: number,
  index?: number,
  scriptType?: number,
): string {
  let path = `m/${purpose}'/${coinType}'/${account}'`;

  if (scriptType !== undefined) {
    path += `/${scriptType}'`;
  }

  if (change !== undefined) {
    path += `/${change}`;
    if (index !== undefined) {
      path += `/${index}`;
    }
  }

  return path;
}

/**
 * Parse derivation path into components
 */
export function parseDerivationPath(path: string): {
  purpose: number;
  coinType: number;
  account: number;
  scriptType?: number;
  change?: number;
  index?: number;
} {
  const parts = path.replace(/'/g, '').split('/').slice(1);

  return {
    purpose: parseInt(parts[0], 10),
    coinType: parseInt(parts[1], 10),
    account: parseInt(parts[2], 10),
    scriptType: parts[3] ? parseInt(parts[3], 10) : undefined,
    change: parts[4] ? parseInt(parts[4], 10) : undefined,
    index: parts[5] ? parseInt(parts[5], 10) : undefined,
  };
}

/**
 * Validate derivation path format
 */
export function isValidDerivationPath(path: string): boolean {
  const regex = /^m(\/\d+'?)+$/;
  return regex.test(path);
}

/**
 * Get derivation path for standard and network
 */
export function getStandardPath(
  standard: DerivationStandard,
  network: 'mainnet' | 'testnet' = 'mainnet',
  account: number = 0,
): string {
  const coinType = network === 'mainnet' ? COIN_TYPE.BITCOIN_MAINNET : COIN_TYPE.BITCOIN_TESTNET;

  switch (standard) {
    case DerivationStandard.BIP44:
      return buildDerivationPath(PURPOSE.BIP44, coinType, account);
    case DerivationStandard.BIP49:
      return buildDerivationPath(PURPOSE.BIP49, coinType, account);
    case DerivationStandard.BIP84:
      return buildDerivationPath(PURPOSE.BIP84, coinType, account);
    case DerivationStandard.BIP86:
      return buildDerivationPath(PURPOSE.BIP86, coinType, account);
    default:
      return buildDerivationPath(PURPOSE.BIP84, coinType, account);
  }
}
