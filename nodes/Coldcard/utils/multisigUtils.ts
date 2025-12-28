/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as bitcoin from 'bitcoinjs-lib';
import { AddressType } from '../constants/addressTypes';

/**
 * Multisig wallet utilities for Coldcard
 */

/**
 * Co-signer information
 */
export interface CoSigner {
  /** Co-signer name */
  name: string;
  /** Extended public key (xpub/Zpub/etc) */
  xpub: string;
  /** Master fingerprint (XFP) */
  fingerprint: string;
  /** Derivation path */
  derivationPath: string;
  /** Device type (if known) */
  deviceType?: string;
}

/**
 * Multisig wallet configuration
 */
export interface MultisigConfig {
  /** Wallet name */
  name: string;
  /** Required signatures (M) */
  requiredSignatures: number;
  /** Total signers (N) */
  totalSigners: number;
  /** Address type */
  addressType: AddressType;
  /** List of co-signers */
  cosigners: CoSigner[];
  /** Derivation path for addresses */
  derivationPath: string;
  /** Bitcoin network */
  network: 'mainnet' | 'testnet';
  /** Creation timestamp */
  createdAt?: number;
  /** Last modified timestamp */
  modifiedAt?: number;
}

/**
 * BSMS (Bitcoin Secure Multisig Setup) data
 */
export interface BSMSData {
  /** BSMS version */
  version: string;
  /** Path restrictions */
  pathRestrictions: string;
  /** Sortedmulti descriptor */
  descriptor: string;
  /** Token for matching */
  token?: string;
}

/**
 * Multisig address result
 */
export interface MultisigAddress {
  address: string;
  redeemScript?: string;
  witnessScript?: string;
  path: string;
  index: number;
  isChange: boolean;
}

/**
 * Output descriptor format
 */
export interface OutputDescriptor {
  descriptor: string;
  checksum: string;
  full: string;
}

/**
 * Create M-of-N multisig configuration
 */
export function createMultisigConfig(
  name: string,
  m: number,
  n: number,
  addressType: AddressType,
  cosigners: CoSigner[],
  network: 'mainnet' | 'testnet' = 'mainnet',
): MultisigConfig {
  if (m > n) {
    throw new Error(`Required signatures (${m}) cannot exceed total signers (${n})`);
  }

  if (cosigners.length !== n) {
    throw new Error(`Expected ${n} cosigners, got ${cosigners.length}`);
  }

  // Determine derivation path based on address type
  let derivationPath: string;
  const coinType = network === 'mainnet' ? 0 : 1;

  switch (addressType) {
    case AddressType.MULTISIG_SEGWIT:
      derivationPath = `m/48'/${coinType}'/0'/2'`;
      break;
    case AddressType.MULTISIG_NESTED:
      derivationPath = `m/48'/${coinType}'/0'/1'`;
      break;
    case AddressType.MULTISIG_LEGACY:
      derivationPath = `m/45'`;
      break;
    default:
      derivationPath = `m/48'/${coinType}'/0'/2'`;
  }

  return {
    name,
    requiredSignatures: m,
    totalSigners: n,
    addressType,
    cosigners,
    derivationPath,
    network,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
}

/**
 * Generate Coldcard multisig config file content
 */
export function generateColdcardMultisigConfig(config: MultisigConfig): string {
  const lines: string[] = [];

  lines.push(`# Coldcard Multisig Wallet: ${config.name}`);
  lines.push(`Name: ${config.name}`);
  lines.push(`Policy: ${config.requiredSignatures} of ${config.totalSigners}`);
  lines.push(`Derivation: ${config.derivationPath}`);

  // Format based on address type
  let format: string;
  switch (config.addressType) {
    case AddressType.MULTISIG_SEGWIT:
      format = 'P2WSH';
      break;
    case AddressType.MULTISIG_NESTED:
      format = 'P2SH-P2WSH';
      break;
    case AddressType.MULTISIG_LEGACY:
      format = 'P2SH';
      break;
    default:
      format = 'P2WSH';
  }
  lines.push(`Format: ${format}`);
  lines.push('');

  // Add cosigners
  config.cosigners.forEach((cosigner, index) => {
    lines.push(`# Cosigner ${index + 1}: ${cosigner.name}`);
    lines.push(`${cosigner.fingerprint}: ${cosigner.xpub}`);
  });

  return lines.join('\n');
}

/**
 * Parse Coldcard multisig config file
 */
export function parseColdcardMultisigConfig(content: string): MultisigConfig {
  const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

  let name = '';
  let requiredSignatures = 0;
  let totalSigners = 0;
  let derivationPath = '';
  let addressType = AddressType.MULTISIG_SEGWIT;
  const cosigners: CoSigner[] = [];

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    switch (key.trim().toLowerCase()) {
      case 'name':
        name = value;
        break;
      case 'policy':
        const match = value.match(/(\d+)\s+of\s+(\d+)/i);
        if (match) {
          requiredSignatures = parseInt(match[1], 10);
          totalSigners = parseInt(match[2], 10);
        }
        break;
      case 'derivation':
        derivationPath = value;
        break;
      case 'format':
        switch (value.toUpperCase()) {
          case 'P2WSH':
            addressType = AddressType.MULTISIG_SEGWIT;
            break;
          case 'P2SH-P2WSH':
            addressType = AddressType.MULTISIG_NESTED;
            break;
          case 'P2SH':
            addressType = AddressType.MULTISIG_LEGACY;
            break;
        }
        break;
      default:
        // Check if this is a cosigner line (fingerprint: xpub)
        if (/^[0-9a-fA-F]{8}$/.test(key.trim())) {
          cosigners.push({
            name: `Cosigner ${cosigners.length + 1}`,
            xpub: value,
            fingerprint: key.trim(),
            derivationPath,
          });
        }
    }
  }

  return {
    name,
    requiredSignatures,
    totalSigners,
    addressType,
    cosigners,
    derivationPath,
    network: 'mainnet',
  };
}

/**
 * Generate output descriptor for multisig wallet
 */
export function generateOutputDescriptor(
  config: MultisigConfig,
  change: boolean = false,
): OutputDescriptor {
  const keys = config.cosigners
    .map((c) => `[${c.fingerprint}${c.derivationPath.slice(1)}]${c.xpub}/${change ? 1 : 0}/*`)
    .sort()
    .join(',');

  let descriptor: string;

  switch (config.addressType) {
    case AddressType.MULTISIG_SEGWIT:
      descriptor = `wsh(sortedmulti(${config.requiredSignatures},${keys}))`;
      break;
    case AddressType.MULTISIG_NESTED:
      descriptor = `sh(wsh(sortedmulti(${config.requiredSignatures},${keys})))`;
      break;
    case AddressType.MULTISIG_LEGACY:
      descriptor = `sh(sortedmulti(${config.requiredSignatures},${keys}))`;
      break;
    default:
      descriptor = `wsh(sortedmulti(${config.requiredSignatures},${keys}))`;
  }

  const checksum = calculateDescriptorChecksum(descriptor);

  return {
    descriptor,
    checksum,
    full: `${descriptor}#${checksum}`,
  };
}

/**
 * Calculate descriptor checksum
 */
export function calculateDescriptorChecksum(descriptor: string): string {
  const INPUT_CHARSET =
    '0123456789()[],\'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#"\\ ';
  const CHECKSUM_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

  function polymod(c: bigint, val: number): bigint {
    const c0 = Number(c >> 35n);
    c = ((c & 0x7ffffffffn) << 5n) ^ BigInt(val);
    if (c0 & 1) {
      c ^= 0xf5dee51989n;
    }
    if (c0 & 2) {
      c ^= 0xa9fdca3312n;
    }
    if (c0 & 4) {
      c ^= 0x1bab10e32dn;
    }
    if (c0 & 8) {
      c ^= 0x3706b1677an;
    }
    if (c0 & 16) {
      c ^= 0x644d626ffdn;
    }
    return c;
  }

  let c = 1n;
  let cls = 0;
  let clscount = 0;

  for (const ch of descriptor) {
    const pos = INPUT_CHARSET.indexOf(ch);
    if (pos === -1) {
      return '';
    }
    c = polymod(c, pos & 31);
    cls = cls * 3 + (pos >> 5);
    clscount++;
    if (clscount === 3) {
      c = polymod(c, cls);
      cls = 0;
      clscount = 0;
    }
  }

  if (clscount > 0) {
    c = polymod(c, cls);
  }

  for (let i = 0; i < 8; i++) {
    c = polymod(c, 0);
  }

  c ^= 1n;

  let result = '';
  for (let i = 0; i < 8; i++) {
    result += CHECKSUM_CHARSET[Number((c >> BigInt(5 * (7 - i))) & 31n)];
  }

  return result;
}

/**
 * Generate BSMS (Bitcoin Secure Multisig Setup) format
 */
export function generateBSMS(config: MultisigConfig): BSMSData {
  const descriptor = generateOutputDescriptor(config);

  return {
    version: 'BSMS 1.0',
    pathRestrictions: `/0/*,/1/*`,
    descriptor: descriptor.full,
    token: generateBSMSToken(),
  };
}

/**
 * Generate random BSMS token
 */
function generateBSMSToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Parse BSMS file content
 */
export function parseBSMS(content: string): BSMSData {
  const lines = content.split('\n').map((l) => l.trim());

  return {
    version: lines[0] || 'BSMS 1.0',
    pathRestrictions: lines[1] || '/0/*,/1/*',
    descriptor: lines[2] || '',
    token: lines[3],
  };
}

/**
 * Validate multisig configuration
 */
export function validateMultisigConfig(config: MultisigConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name) {
    errors.push('Wallet name is required');
  }

  if (config.requiredSignatures < 1) {
    errors.push('Required signatures must be at least 1');
  }

  if (config.totalSigners < config.requiredSignatures) {
    errors.push('Total signers must be >= required signatures');
  }

  if (config.cosigners.length !== config.totalSigners) {
    errors.push(`Expected ${config.totalSigners} cosigners, got ${config.cosigners.length}`);
  }

  // Validate each cosigner
  config.cosigners.forEach((cosigner, index) => {
    if (!cosigner.xpub) {
      errors.push(`Cosigner ${index + 1} missing xpub`);
    }
    if (!cosigner.fingerprint || !/^[0-9a-fA-F]{8}$/.test(cosigner.fingerprint)) {
      errors.push(`Cosigner ${index + 1} has invalid fingerprint`);
    }
  });

  // Check for duplicate fingerprints
  const fingerprints = config.cosigners.map((c) => c.fingerprint);
  const uniqueFingerprints = new Set(fingerprints);
  if (uniqueFingerprints.size !== fingerprints.length) {
    errors.push('Duplicate cosigner fingerprints detected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get quorum description string
 */
export function getQuorumDescription(m: number, n: number): string {
  return `${m}-of-${n} multisig`;
}

/**
 * Check if config is sortedmulti (lexicographically sorted keys)
 */
export function isSortedMulti(config: MultisigConfig): boolean {
  const xpubs = config.cosigners.map((c) => c.xpub);
  const sorted = [...xpubs].sort();
  return xpubs.every((xpub, i) => xpub === sorted[i]);
}

/**
 * Sort cosigners by xpub (for sortedmulti)
 */
export function sortCosigners(cosigners: CoSigner[]): CoSigner[] {
  return [...cosigners].sort((a, b) => a.xpub.localeCompare(b.xpub));
}
