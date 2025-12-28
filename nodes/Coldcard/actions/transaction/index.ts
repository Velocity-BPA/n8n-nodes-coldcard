/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import { USBTransport } from '../transport/usbTransport';
import { SDCardHandler } from '../transport/sdCardHandler';
import {
  parsePSBT,
  analyzePSBT,
  validatePSBT,
  isPSBTFinalized,
  extractTransaction,
  psbtToBase64,
  psbtToHex,
} from '../utils/psbtUtils';

/**
 * Transaction (PSBT) operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');
  const fileCredentials = await this.getCredentials('coldcardFile').catch(() => null);

  try {
    switch (operation) {
      case 'importPsbtFile': {
        const filePath = this.getNodeParameter('filePath', itemIndex) as string;

        const content = await fs.promises.readFile(filePath);
        const psbt = parsePSBT(content);
        const analysis = analyzePSBT(psbt);

        return {
          imported: true,
          source: 'file',
          filePath,
          size: content.length,
          analysis,
          base64: psbtToBase64(content),
        };
      }

      case 'importPsbtBase64': {
        const base64 = this.getNodeParameter('psbtBase64', itemIndex) as string;

        const buffer = Buffer.from(base64, 'base64');
        const psbt = parsePSBT(buffer);
        const analysis = analyzePSBT(psbt);

        return {
          imported: true,
          source: 'base64',
          size: buffer.length,
          analysis,
          hex: psbtToHex(buffer),
        };
      }

      case 'importPsbtHex': {
        const hex = this.getNodeParameter('psbtHex', itemIndex) as string;

        const buffer = Buffer.from(hex, 'hex');
        const psbt = parsePSBT(buffer);
        const analysis = analyzePSBT(psbt);

        return {
          imported: true,
          source: 'hex',
          size: buffer.length,
          analysis,
          base64: psbtToBase64(buffer),
        };
      }

      case 'signPsbt': {
        const connectionType = credentials.connectionType as string;
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else if (inputFormat === 'hex') {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        } else {
          psbtBuffer = await fs.promises.readFile(psbtInput);
        }

        // Validate PSBT before signing
        const validation = validatePSBT(parsePSBT(psbtBuffer));
        if (!validation.valid) {
          throw new NodeOperationError(
            this.getNode(),
            `Invalid PSBT: ${validation.errors.join(', ')}`,
            { itemIndex },
          );
        }

        if (connectionType === 'usb') {
          const transport = new USBTransport();
          try {
            await transport.connect(credentials.devicePath as string);
            const signedPsbt = await transport.signPSBT(psbtBuffer);

            return {
              signed: true,
              method: 'usb',
              base64: psbtToBase64(signedPsbt),
              hex: psbtToHex(signedPsbt),
              size: signedPsbt.length,
            };
          } finally {
            await transport.disconnect();
          }
        } else if (connectionType === 'sdCard') {
          const sdPath = credentials.sdCardPath as string;
          const handler = new SDCardHandler(sdPath);

          const fileName = `unsigned-${Date.now()}.psbt`;
          await handler.writeFile(fileName, psbtBuffer);

          return {
            signed: false,
            method: 'sdCard',
            status: 'pending',
            fileName,
            sdPath,
            message: 'PSBT written to SD card. Insert into Coldcard to sign.',
            instructions: [
              '1. Safely eject SD card from computer',
              '2. Insert SD card into Coldcard',
              '3. Navigate to Ready To Sign',
              '4. Review and approve transaction',
              '5. Return SD card to computer',
              '6. Use exportSignedPsbt to retrieve signed PSBT',
            ],
          };
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unsupported connection type for signing: ${connectionType}`,
            { itemIndex },
          );
        }
      }

      case 'exportSignedPsbt': {
        const connectionType = credentials.connectionType as string;

        if (connectionType === 'sdCard') {
          const sdPath = credentials.sdCardPath as string;
          const unsignedFileName = this.getNodeParameter('unsignedFileName', itemIndex) as string;
          const handler = new SDCardHandler(sdPath);

          const signedPsbt = await handler.exportSignedPSBT(unsignedFileName);

          if (!signedPsbt) {
            return {
              found: false,
              message: 'Signed PSBT not found. Make sure the Coldcard has signed the transaction.',
            };
          }

          const analysis = analyzePSBT(parsePSBT(signedPsbt));

          return {
            found: true,
            base64: psbtToBase64(signedPsbt),
            hex: psbtToHex(signedPsbt),
            size: signedPsbt.length,
            analysis,
          };
        } else {
          throw new NodeOperationError(
            this.getNode(),
            'Export signed PSBT is only available for SD card connection',
            { itemIndex },
          );
        }
      }

      case 'getPsbtInfo': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else if (inputFormat === 'hex') {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        } else {
          psbtBuffer = await fs.promises.readFile(psbtInput);
        }

        const psbt = parsePSBT(psbtBuffer);
        const analysis = analyzePSBT(psbt);

        return {
          ...analysis,
          isFinalized: isPSBTFinalized(psbt),
          validation: validatePSBT(psbt),
        };
      }

      case 'analyzePsbt': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);
        const analysis = analyzePSBT(psbt);

        return {
          summary: {
            inputs: analysis.inputCount,
            outputs: analysis.outputCount,
            totalInput: analysis.totalInputValue,
            totalOutput: analysis.totalOutputValue,
            fee: analysis.fee,
            feeRate: analysis.feeRate,
          },
          size: {
            current: analysis.size,
            virtual: analysis.virtualSize,
            weight: analysis.weight,
          },
          security: {
            warnings: analysis.warnings,
            riskScore: analysis.riskScore,
          },
          isFinalized: isPSBTFinalized(psbt),
        };
      }

      case 'getPsbtInputs': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);

        return {
          inputs: psbt.inputs,
          count: psbt.inputs.length,
        };
      }

      case 'getPsbtOutputs': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);

        return {
          outputs: psbt.outputs,
          count: psbt.outputs.length,
        };
      }

      case 'getSigningProgress': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);

        let signedInputs = 0;
        let totalInputs = psbt.inputs.length;

        for (const input of psbt.inputs) {
          if (
            (input.partialSig && input.partialSig.length > 0) ||
            input.finalScriptSig ||
            input.finalScriptWitness
          ) {
            signedInputs++;
          }
        }

        const progress = totalInputs > 0 ? (signedInputs / totalInputs) * 100 : 0;

        return {
          signedInputs,
          totalInputs,
          progress: Math.round(progress),
          complete: signedInputs === totalInputs,
          isFinalized: isPSBTFinalized(psbt),
        };
      }

      case 'finalizePsbt': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);

        if (!isPSBTFinalized(psbt)) {
          // Note: Actual finalization would require bitcoinjs-lib
          return {
            finalized: false,
            message: 'PSBT finalization requires all signatures. Use bitcoinjs-lib for full implementation.',
          };
        }

        return {
          finalized: true,
          base64: psbtInput,
        };
      }

      case 'extractTransaction': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);

        if (!isPSBTFinalized(psbt)) {
          throw new NodeOperationError(
            this.getNode(),
            'Cannot extract transaction from unfinalized PSBT',
            { itemIndex },
          );
        }

        const txHex = extractTransaction(psbt);

        return {
          extracted: true,
          transactionHex: txHex,
          size: txHex.length / 2,
        };
      }

      case 'broadcastTransaction': {
        const txHex = this.getNodeParameter('transactionHex', itemIndex) as string;

        // Broadcasting would require network connection
        // This is a placeholder for the structure
        return {
          broadcast: false,
          transactionHex: txHex,
          message: 'Transaction broadcasting requires network configuration. Configure Electrum or Bitcoin Core RPC in network credentials.',
        };
      }

      case 'getPsbtWarnings': {
        const psbtInput = this.getNodeParameter('psbt', itemIndex) as string;
        const inputFormat = this.getNodeParameter('inputFormat', itemIndex, 'base64') as string;

        let psbtBuffer: Buffer;
        if (inputFormat === 'base64') {
          psbtBuffer = Buffer.from(psbtInput, 'base64');
        } else {
          psbtBuffer = Buffer.from(psbtInput, 'hex');
        }

        const psbt = parsePSBT(psbtBuffer);
        const analysis = analyzePSBT(psbt);
        const validation = validatePSBT(psbt);

        return {
          warnings: analysis.warnings,
          errors: validation.errors,
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskScore > 50 ? 'high' : analysis.riskScore > 20 ? 'medium' : 'low',
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
      `Transaction operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
