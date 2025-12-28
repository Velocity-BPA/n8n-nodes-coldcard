/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  parsePSBT,
  analyzePSBT,
  validatePSBT,
  isPSBTFinalized,
} from '../utils/psbtUtils';
import { checkPSBTSecurity } from '../utils/securityUtils';

/**
 * PSBT Analysis operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  try {
    switch (operation) {
      case 'analyzePsbt': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);
        const analysis = analyzePSBT(psbt);

        return {
          ...analysis,
          isFinalized: isPSBTFinalized(psbt),
        };
      }

      case 'getFeeInfo': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);
        const analysis = analyzePSBT(psbt);

        const feeRateLevel = analysis.feeRate > 100 ? 'high'
          : analysis.feeRate > 20 ? 'medium' : 'low';

        return {
          fee: analysis.fee,
          feeRate: analysis.feeRate,
          feeRateLevel,
          virtualSize: analysis.virtualSize,
          weight: analysis.weight,
          totalInput: analysis.totalInputValue,
          totalOutput: analysis.totalOutputValue,
          feePercent: analysis.totalInputValue > 0
            ? ((analysis.fee / analysis.totalInputValue) * 100).toFixed(2)
            : 0,
        };
      }

      case 'getInputSummary': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        return {
          inputs: psbt.inputs.map((input, index) => ({
            index,
            value: input.witnessUtxo?.value || input.nonWitnessUtxo?.value || 0,
            hasSignature: !!(input.partialSig?.length || input.finalScriptSig || input.finalScriptWitness),
            derivationPath: input.bip32Derivation?.[0]?.path || null,
          })),
          totalInputs: psbt.inputs.length,
          signedInputs: psbt.inputs.filter(
            i => i.partialSig?.length || i.finalScriptSig || i.finalScriptWitness
          ).length,
        };
      }

      case 'getOutputSummary': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        return {
          outputs: psbt.outputs.map((output, index) => ({
            index,
            value: output.value || 0,
            isChange: !!output.bip32Derivation,
            derivationPath: output.bip32Derivation?.[0]?.path || null,
          })),
          totalOutputs: psbt.outputs.length,
          changeOutputs: psbt.outputs.filter(o => o.bip32Derivation).length,
        };
      }

      case 'getChangeDetection': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        const changeOutputs = psbt.outputs.filter(o => o.bip32Derivation);
        const regularOutputs = psbt.outputs.filter(o => !o.bip32Derivation);

        return {
          hasChange: changeOutputs.length > 0,
          changeOutputCount: changeOutputs.length,
          regularOutputCount: regularOutputs.length,
          changeTotal: changeOutputs.reduce((sum, o) => sum + (o.value || 0), 0),
          regularTotal: regularOutputs.reduce((sum, o) => sum + (o.value || 0), 0),
        };
      }

      case 'getWarnings': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);
        const analysis = analyzePSBT(psbt);
        const validation = validatePSBT(psbt);

        return {
          warnings: analysis.warnings,
          errors: validation.errors,
          valid: validation.valid,
          riskScore: analysis.riskScore,
        };
      }

      case 'getRiskScore': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);
        const securityCheck = checkPSBTSecurity(psbt);

        return {
          riskScore: securityCheck.riskLevel,
          riskLevel: securityCheck.riskLevel > 50 ? 'high'
            : securityCheck.riskLevel > 20 ? 'medium' : 'low',
          safe: securityCheck.safe,
          warnings: securityCheck.warnings,
          recommendations: securityCheck.recommendations,
        };
      }

      case 'verifyDestinations': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;
        const expectedAddresses = this.getNodeParameter('expectedAddresses', itemIndex, []) as string[];

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        // Note: Full address extraction requires script parsing
        return {
          verified: false,
          message: 'Address verification requires full script parsing implementation',
          expectedAddresses,
          outputs: psbt.outputs.length,
        };
      }

      case 'checkDustOutputs': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;
        const dustThreshold = this.getNodeParameter('dustThreshold', itemIndex, 546) as number;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        const dustOutputs = psbt.outputs.filter(o => (o.value || 0) < dustThreshold);

        return {
          hasDust: dustOutputs.length > 0,
          dustOutputs: dustOutputs.length,
          dustThreshold,
          outputs: psbt.outputs.map((o, i) => ({
            index: i,
            value: o.value || 0,
            isDust: (o.value || 0) < dustThreshold,
          })),
        };
      }

      case 'getScriptAnalysis': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        return {
          inputs: psbt.inputs.map((input, i) => ({
            index: i,
            hasWitnessUtxo: !!input.witnessUtxo,
            hasNonWitnessUtxo: !!input.nonWitnessUtxo,
            hasRedeemScript: !!input.redeemScript,
            hasWitnessScript: !!input.witnessScript,
          })),
          version: psbt.version,
        };
      }

      case 'getSighashTypes': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        const psbtBuffer = inputFormat === 'base64'
          ? Buffer.from(psbtInput, 'base64')
          : Buffer.from(psbtInput, 'hex');

        const psbt = parsePSBT(psbtBuffer);

        return {
          inputs: psbt.inputs.map((input, i) => ({
            index: i,
            sighashType: input.sighashType || 'SIGHASH_ALL (default)',
          })),
          info: {
            SIGHASH_ALL: 'Signs all inputs and outputs (most common)',
            SIGHASH_NONE: 'Signs all inputs, no outputs',
            SIGHASH_SINGLE: 'Signs all inputs, only corresponding output',
            SIGHASH_ANYONECANPAY: 'Signs only this input',
          },
        };
      }

      default:
        throw new NodeOperationError(
          this.getNode(),
          `Unknown operation: ${operation}`,
          { itemIndex },
        );
    }
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `PSBT analysis failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
