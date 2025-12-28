/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Bitcoin Address Types supported by Coldcard
 */
export enum AddressType {
  /** Legacy P2PKH (starts with 1) */
  LEGACY = 'p2pkh',
  /** Nested SegWit P2SH-P2WPKH (starts with 3) */
  NESTED_SEGWIT = 'p2sh-p2wpkh',
  /** Native SegWit P2WPKH (starts with bc1q) */
  NATIVE_SEGWIT = 'p2wpkh',
  /** Taproot P2TR (starts with bc1p) */
  TAPROOT = 'p2tr',
  /** Multisig P2SH */
  MULTISIG_LEGACY = 'p2sh',
  /** Multisig Native SegWit P2WSH */
  MULTISIG_SEGWIT = 'p2wsh',
  /** Multisig Nested SegWit P2SH-P2WSH */
  MULTISIG_NESTED = 'p2sh-p2wsh',
}

/**
 * Address type display names for n8n UI
 */
export const ADDRESS_TYPE_OPTIONS = [
  {
    name: 'Native SegWit (bc1q...)',
    value: AddressType.NATIVE_SEGWIT,
    description: 'BIP-84 native SegWit addresses - recommended',
  },
  {
    name: 'Nested SegWit (3...)',
    value: AddressType.NESTED_SEGWIT,
    description: 'BIP-49 wrapped SegWit addresses',
  },
  {
    name: 'Legacy (1...)',
    value: AddressType.LEGACY,
    description: 'BIP-44 legacy addresses',
  },
  {
    name: 'Taproot (bc1p...)',
    value: AddressType.TAPROOT,
    description: 'BIP-86 Taproot addresses',
  },
];

/**
 * Multisig address type options
 */
export const MULTISIG_ADDRESS_TYPE_OPTIONS = [
  {
    name: 'Native SegWit Multisig (bc1q...)',
    value: AddressType.MULTISIG_SEGWIT,
    description: 'P2WSH native SegWit multisig - recommended',
  },
  {
    name: 'Nested SegWit Multisig (3...)',
    value: AddressType.MULTISIG_NESTED,
    description: 'P2SH-P2WSH wrapped SegWit multisig',
  },
  {
    name: 'Legacy Multisig (3...)',
    value: AddressType.MULTISIG_LEGACY,
    description: 'P2SH legacy multisig',
  },
];

/**
 * Address prefixes by network
 */
export const ADDRESS_PREFIXES = {
  mainnet: {
    [AddressType.LEGACY]: '1',
    [AddressType.NESTED_SEGWIT]: '3',
    [AddressType.NATIVE_SEGWIT]: 'bc1q',
    [AddressType.TAPROOT]: 'bc1p',
    [AddressType.MULTISIG_LEGACY]: '3',
    [AddressType.MULTISIG_SEGWIT]: 'bc1q',
    [AddressType.MULTISIG_NESTED]: '3',
  },
  testnet: {
    [AddressType.LEGACY]: 'm',
    [AddressType.NESTED_SEGWIT]: '2',
    [AddressType.NATIVE_SEGWIT]: 'tb1q',
    [AddressType.TAPROOT]: 'tb1p',
    [AddressType.MULTISIG_LEGACY]: '2',
    [AddressType.MULTISIG_SEGWIT]: 'tb1q',
    [AddressType.MULTISIG_NESTED]: '2',
  },
  signet: {
    [AddressType.LEGACY]: 'm',
    [AddressType.NESTED_SEGWIT]: '2',
    [AddressType.NATIVE_SEGWIT]: 'tb1q',
    [AddressType.TAPROOT]: 'tb1p',
    [AddressType.MULTISIG_LEGACY]: '2',
    [AddressType.MULTISIG_SEGWIT]: 'tb1q',
    [AddressType.MULTISIG_NESTED]: '2',
  },
  regtest: {
    [AddressType.LEGACY]: 'm',
    [AddressType.NESTED_SEGWIT]: '2',
    [AddressType.NATIVE_SEGWIT]: 'bcrt1q',
    [AddressType.TAPROOT]: 'bcrt1p',
    [AddressType.MULTISIG_LEGACY]: '2',
    [AddressType.MULTISIG_SEGWIT]: 'bcrt1q',
    [AddressType.MULTISIG_NESTED]: '2',
  },
};

/**
 * Extended public key version bytes
 */
export const XPUB_VERSIONS = {
  mainnet: {
    xpub: '0488b21e', // BIP-44 P2PKH
    ypub: '049d7cb2', // BIP-49 P2SH-P2WPKH
    zpub: '04b24746', // BIP-84 P2WPKH
    Ypub: '0295b43f', // Multisig P2SH-P2WSH
    Zpub: '02aa7ed3', // Multisig P2WSH
  },
  testnet: {
    tpub: '043587cf', // BIP-44 P2PKH
    upub: '044a5262', // BIP-49 P2SH-P2WPKH
    vpub: '045f1cf6', // BIP-84 P2WPKH
    Upub: '024289ef', // Multisig P2SH-P2WSH
    Vpub: '02575483', // Multisig P2WSH
  },
};
