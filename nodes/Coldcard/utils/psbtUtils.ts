/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as bitcoin from 'bitcoinjs-lib';

/**
 * PSBT (Partially Signed Bitcoin Transaction) utilities for Coldcard
 */

/**
 * PSBT input information
 */
export interface PSBTInput {
  index: number;
  txid: string;
  vout: number;
  value: number;
  address?: string;
  scriptPubKey?: string;
  witnessUtxo?: {
    script: Buffer;
    value: number;
  };
  nonWitnessUtxo?: Buffer;
  partialSig?: Array<{
    pubkey: Buffer;
    signature: Buffer;
  }>;
  sighashType?: number;
  redeemScript?: Buffer;
  witnessScript?: Buffer;
  bip32Derivation?: Array<{
    masterFingerprint: Buffer;
    pubkey: Buffer;
    path: string;
  }>;
  isSigned: boolean;
}

/**
 * PSBT output information
 */
export interface PSBTOutput {
  index: number;
  value: number;
  address?: string;
  scriptPubKey?: string;
  isChange: boolean;
  bip32Derivation?: Array<{
    masterFingerprint: Buffer;
    pubkey: Buffer;
    path: string;
  }>;
}

/**
 * PSBT analysis result
 */
export interface PSBTAnalysis {
  version: number;
  inputCount: number;
  outputCount: number;
  totalInputValue: number;
  totalOutputValue: number;
  fee: number;
  feeRate: number;
  size: number;
  virtualSize: number;
  weight: number;
  inputs: PSBTInput[];
  outputs: PSBTOutput[];
  isComplete: boolean;
  signedInputs: number;
  unsignedInputs: number;
  warnings: string[];
  riskScore: number;
}

/**
 * Sighash types
 */
export enum SighashType {
  ALL = 0x01,
  NONE = 0x02,
  SINGLE = 0x03,
  ANYONECANPAY = 0x80,
  ALL_ANYONECANPAY = 0x81,
  NONE_ANYONECANPAY = 0x82,
  SINGLE_ANYONECANPAY = 0x83,
}

/**
 * Sighash type names
 */
export const SIGHASH_NAMES: Record<number, string> = {
  [SighashType.ALL]: 'SIGHASH_ALL',
  [SighashType.NONE]: 'SIGHASH_NONE',
  [SighashType.SINGLE]: 'SIGHASH_SINGLE',
  [SighashType.ALL_ANYONECANPAY]: 'SIGHASH_ALL|ANYONECANPAY',
  [SighashType.NONE_ANYONECANPAY]: 'SIGHASH_NONE|ANYONECANPAY',
  [SighashType.SINGLE_ANYONECANPAY]: 'SIGHASH_SINGLE|ANYONECANPAY',
};

/**
 * Parse PSBT from various formats
 */
export function parsePSBT(input: string | Buffer): bitcoin.Psbt {
  if (Buffer.isBuffer(input)) {
    return bitcoin.Psbt.fromBuffer(input);
  }

  // Try base64 first
  try {
    return bitcoin.Psbt.fromBase64(input);
  } catch {
    // Try hex
    try {
      const buffer = Buffer.from(input, 'hex');
      return bitcoin.Psbt.fromBuffer(buffer);
    } catch {
      throw new Error('Invalid PSBT format. Expected binary, base64, or hex.');
    }
  }
}

/**
 * Serialize PSBT to base64
 */
export function psbtToBase64(psbt: bitcoin.Psbt): string {
  return psbt.toBase64();
}

/**
 * Serialize PSBT to hex
 */
export function psbtToHex(psbt: bitcoin.Psbt): string {
  return psbt.toBuffer().toString('hex');
}

/**
 * Serialize PSBT to binary buffer
 */
export function psbtToBuffer(psbt: bitcoin.Psbt): Buffer {
  return psbt.toBuffer();
}

/**
 * Analyze PSBT and extract detailed information
 */
export function analyzePSBT(psbt: bitcoin.Psbt): PSBTAnalysis {
  const inputs: PSBTInput[] = [];
  const outputs: PSBTOutput[] = [];
  const warnings: string[] = [];

  let totalInputValue = 0;
  let totalOutputValue = 0;
  let signedInputs = 0;
  let unsignedInputs = 0;

  // Analyze inputs
  psbt.data.inputs.forEach((input, index) => {
    const txInput = psbt.txInputs[index];
    let value = 0;
    let isSigned = false;

    // Get value from witness UTXO or non-witness UTXO
    if (input.witnessUtxo) {
      value = input.witnessUtxo.value;
    } else if (input.nonWitnessUtxo) {
      const prevTx = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo);
      value = prevTx.outs[txInput.index].value;
    }

    // Check if signed
    if (input.partialSig && input.partialSig.length > 0) {
      isSigned = true;
      signedInputs++;
    } else if (input.finalScriptSig || input.finalScriptWitness) {
      isSigned = true;
      signedInputs++;
    } else {
      unsignedInputs++;
    }

    totalInputValue += value;

    inputs.push({
      index,
      txid: txInput.hash.reverse().toString('hex'),
      vout: txInput.index,
      value,
      witnessUtxo: input.witnessUtxo,
      nonWitnessUtxo: input.nonWitnessUtxo,
      partialSig: input.partialSig,
      sighashType: input.sighashType,
      redeemScript: input.redeemScript,
      witnessScript: input.witnessScript,
      bip32Derivation: input.bip32Derivation?.map((d) => ({
        masterFingerprint: d.masterFingerprint,
        pubkey: d.pubkey,
        path: d.path,
      })),
      isSigned,
    });
  });

  // Analyze outputs
  psbt.txOutputs.forEach((output, index) => {
    const outputData = psbt.data.outputs[index];
    let isChange = false;

    // Detect change output (has BIP32 derivation)
    if (outputData.bip32Derivation && outputData.bip32Derivation.length > 0) {
      isChange = true;
    }

    totalOutputValue += output.value;

    outputs.push({
      index,
      value: output.value,
      scriptPubKey: output.script.toString('hex'),
      isChange,
      bip32Derivation: outputData.bip32Derivation?.map((d) => ({
        masterFingerprint: d.masterFingerprint,
        pubkey: d.pubkey,
        path: d.path,
      })),
    });
  });

  // Calculate fee
  const fee = totalInputValue - totalOutputValue;
  if (fee < 0) {
    warnings.push('Negative fee detected - inputs are less than outputs');
  }

  // Calculate size metrics
  const tx = psbt.extractTransaction(true);
  const size = tx.byteLength();
  const virtualSize = tx.virtualSize();
  const weight = tx.weight();
  const feeRate = virtualSize > 0 ? fee / virtualSize : 0;

  // Check for dust outputs
  outputs.forEach((output) => {
    if (output.value < 546) {
      warnings.push(`Output ${output.index} is dust (${output.value} sats)`);
    }
  });

  // Check for high fee
  if (feeRate > 500) {
    warnings.push(`High fee rate: ${feeRate.toFixed(2)} sat/vB`);
  }

  // Calculate risk score (0-100)
  let riskScore = 0;
  if (fee < 0) {
    riskScore += 50;
  }
  if (feeRate > 500) {
    riskScore += 20;
  }
  if (outputs.some((o) => o.value < 546)) {
    riskScore += 10;
  }
  if (warnings.length > 0) {
    riskScore += warnings.length * 5;
  }

  return {
    version: psbt.version,
    inputCount: inputs.length,
    outputCount: outputs.length,
    totalInputValue,
    totalOutputValue,
    fee,
    feeRate,
    size,
    virtualSize,
    weight,
    inputs,
    outputs,
    isComplete: signedInputs === inputs.length,
    signedInputs,
    unsignedInputs,
    warnings,
    riskScore: Math.min(riskScore, 100),
  };
}

/**
 * Validate PSBT structure
 */
export function validatePSBT(psbt: bitcoin.Psbt): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Check inputs have required fields
    psbt.data.inputs.forEach((input, index) => {
      if (!input.witnessUtxo && !input.nonWitnessUtxo) {
        errors.push(`Input ${index} missing UTXO data`);
      }
    });

    // Check outputs exist
    if (psbt.txOutputs.length === 0) {
      errors.push('No outputs in PSBT');
    }

    // Check transaction is parseable
    psbt.extractTransaction(true);
  } catch (error) {
    errors.push(`Invalid PSBT structure: ${(error as Error).message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get sighash type name
 */
export function getSighashTypeName(sighashType: number): string {
  return SIGHASH_NAMES[sighashType] || `UNKNOWN (${sighashType})`;
}

/**
 * Check if PSBT is finalized
 */
export function isPSBTFinalized(psbt: bitcoin.Psbt): boolean {
  return psbt.data.inputs.every(
    (input) => input.finalScriptSig !== undefined || input.finalScriptWitness !== undefined,
  );
}

/**
 * Extract raw transaction from finalized PSBT
 */
export function extractTransaction(psbt: bitcoin.Psbt): string {
  if (!isPSBTFinalized(psbt)) {
    throw new Error('PSBT is not finalized');
  }
  return psbt.extractTransaction().toHex();
}

/**
 * Estimate virtual size for a PSBT
 */
export function estimateVirtualSize(
  inputCount: number,
  outputCount: number,
  isSegwit: boolean,
): number {
  if (isSegwit) {
    // P2WPKH: ~68 vbytes per input, 31 vbytes per output, 10.5 vbytes overhead
    return Math.ceil(inputCount * 68 + outputCount * 31 + 10.5);
  } else {
    // P2PKH: ~148 bytes per input, 34 bytes per output, 10 bytes overhead
    return inputCount * 148 + outputCount * 34 + 10;
  }
}
