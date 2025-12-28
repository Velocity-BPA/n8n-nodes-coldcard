/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * File formats supported by Coldcard
 */
export enum FileFormat {
  /** Partially Signed Bitcoin Transaction */
  PSBT = 'psbt',
  /** PSBT in Base64 encoding */
  PSBT_BASE64 = 'psbt-base64',
  /** PSBT in Hexadecimal encoding */
  PSBT_HEX = 'psbt-hex',
  /** Raw transaction in hex */
  TRANSACTION_HEX = 'tx-hex',
  /** JSON format */
  JSON = 'json',
  /** Electrum wallet format */
  ELECTRUM = 'electrum',
  /** Wasabi wallet format */
  WASABI = 'wasabi',
  /** Sparrow wallet format */
  SPARROW = 'sparrow',
  /** Specter Desktop format */
  SPECTER = 'specter',
  /** Bitcoin Core descriptor */
  CORE_DESCRIPTOR = 'core-descriptor',
  /** Bitcoin Secure Multisig Setup */
  BSMS = 'bsms',
  /** Generic JSON export */
  GENERIC_JSON = 'generic-json',
  /** Coldcard backup format (7z encrypted) */
  BACKUP = 'backup',
  /** Plain text */
  TEXT = 'text',
}

/**
 * File extensions by format
 */
export const FILE_EXTENSIONS: Record<FileFormat, string> = {
  [FileFormat.PSBT]: '.psbt',
  [FileFormat.PSBT_BASE64]: '.psbt',
  [FileFormat.PSBT_HEX]: '.psbt',
  [FileFormat.TRANSACTION_HEX]: '.txn',
  [FileFormat.JSON]: '.json',
  [FileFormat.ELECTRUM]: '.json',
  [FileFormat.WASABI]: '.json',
  [FileFormat.SPARROW]: '.json',
  [FileFormat.SPECTER]: '.json',
  [FileFormat.CORE_DESCRIPTOR]: '.txt',
  [FileFormat.BSMS]: '.bsms',
  [FileFormat.GENERIC_JSON]: '.json',
  [FileFormat.BACKUP]: '.7z',
  [FileFormat.TEXT]: '.txt',
};

/**
 * MIME types by format
 */
export const MIME_TYPES: Record<FileFormat, string> = {
  [FileFormat.PSBT]: 'application/octet-stream',
  [FileFormat.PSBT_BASE64]: 'text/plain',
  [FileFormat.PSBT_HEX]: 'text/plain',
  [FileFormat.TRANSACTION_HEX]: 'text/plain',
  [FileFormat.JSON]: 'application/json',
  [FileFormat.ELECTRUM]: 'application/json',
  [FileFormat.WASABI]: 'application/json',
  [FileFormat.SPARROW]: 'application/json',
  [FileFormat.SPECTER]: 'application/json',
  [FileFormat.CORE_DESCRIPTOR]: 'text/plain',
  [FileFormat.BSMS]: 'text/plain',
  [FileFormat.GENERIC_JSON]: 'application/json',
  [FileFormat.BACKUP]: 'application/x-7z-compressed',
  [FileFormat.TEXT]: 'text/plain',
};

/**
 * Wallet export format options for n8n UI
 */
export const WALLET_EXPORT_OPTIONS = [
  {
    name: 'Electrum',
    value: FileFormat.ELECTRUM,
    description: 'Electrum wallet JSON format',
  },
  {
    name: 'Wasabi',
    value: FileFormat.WASABI,
    description: 'Wasabi wallet JSON format',
  },
  {
    name: 'Sparrow',
    value: FileFormat.SPARROW,
    description: 'Sparrow wallet JSON format',
  },
  {
    name: 'Specter Desktop',
    value: FileFormat.SPECTER,
    description: 'Specter Desktop JSON format',
  },
  {
    name: 'Bitcoin Core Descriptor',
    value: FileFormat.CORE_DESCRIPTOR,
    description: 'Bitcoin Core output descriptor',
  },
  {
    name: 'Generic JSON',
    value: FileFormat.GENERIC_JSON,
    description: 'Generic JSON with all account details',
  },
];

/**
 * PSBT format options
 */
export const PSBT_FORMAT_OPTIONS = [
  {
    name: 'Binary PSBT',
    value: FileFormat.PSBT,
    description: 'Raw binary PSBT file',
  },
  {
    name: 'Base64 PSBT',
    value: FileFormat.PSBT_BASE64,
    description: 'Base64 encoded PSBT',
  },
  {
    name: 'Hex PSBT',
    value: FileFormat.PSBT_HEX,
    description: 'Hexadecimal encoded PSBT',
  },
];

/**
 * Coldcard file naming patterns
 */
export const COLDCARD_FILE_PATTERNS = {
  /** Unsigned PSBT from wallet software */
  UNSIGNED_PSBT: /^.*\.psbt$/i,
  /** Signed PSBT from Coldcard */
  SIGNED_PSBT: /^.*-signed\.psbt$/i,
  /** Finalized transaction */
  FINALIZED_TX: /^.*-final\.txn$/i,
  /** Encrypted backup */
  BACKUP: /^.*\.7z$/i,
  /** Wallet export */
  WALLET_EXPORT: /^.*\.(json|txt)$/i,
  /** Multisig config */
  MULTISIG_CONFIG: /^.*\.txt$/i,
  /** Address export */
  ADDRESS_LIST: /^.*-addresses\.csv$/i,
  /** BSMS file */
  BSMS: /^.*\.bsms$/i,
};

/**
 * Coldcard SD card directory structure
 */
export const SD_CARD_DIRECTORIES = {
  ROOT: '/',
  BACKUPS: '/backups',
  PSBT: '/psbt',
  SIGNED: '/signed',
  EXPORTS: '/exports',
  MULTISIG: '/multisig',
};

/**
 * Coldcard virtual disk file names
 */
export const VIRTUAL_DISK_FILES = {
  /** Ready file indicating Coldcard is ready */
  READY: 'READY.txt',
  /** Command file for virtual disk operations */
  COMMAND: 'command.txt',
  /** Response file from Coldcard */
  RESPONSE: 'response.txt',
  /** Address display request */
  ADDRESS: 'address.txt',
  /** PSBT to sign */
  UNSIGNED_PSBT: 'unsigned.psbt',
  /** Signed PSBT result */
  SIGNED_PSBT: 'signed.psbt',
};
