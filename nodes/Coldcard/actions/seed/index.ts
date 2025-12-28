/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Seed operations for Coldcard
 * 
 * SECURITY NOTE: Seed operations are intentionally limited.
 * The seed should never leave the Coldcard device.
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  try {
    switch (operation) {
      case 'generateNewSeed': {
        return {
          generated: false,
          message: 'Seed generation must be done directly on Coldcard device',
          instructions: [
            '1. On new Coldcard, select New Wallet',
            '2. Device generates 24 random words',
            '3. Write down all words carefully',
            '4. Verify by re-entering words',
            '5. Set your PIN',
          ],
          security: [
            'Coldcard uses secure element for entropy',
            'Never generate seeds on computers',
            'Verify seed using Verify Seed Words feature',
          ],
        };
      }

      case 'importSeedWords': {
        return {
          imported: false,
          message: 'Seed import must be done directly on Coldcard device',
          instructions: [
            '1. On Coldcard, select Import Existing',
            '2. Choose word count (12, 18, or 24)',
            '3. Enter each word using the wheel',
            '4. Device will validate checksum',
            '5. Set your PIN after import',
          ],
          supportedLengths: [12, 18, 24],
        };
      }

      case 'verifySeedWords': {
        return {
          verified: false,
          message: 'Seed verification must be done on Coldcard device',
          instructions: [
            '1. Go to Advanced/Tools > Verify Seed Words',
            '2. Enter PIN when prompted',
            '3. Enter all seed words',
            '4. Device confirms match or mismatch',
          ],
        };
      }

      case 'getSeedLength': {
        return {
          message: 'Seed length information',
          lengths: {
            12: { entropy: 128, security: 'Good', useCase: 'Standard wallets' },
            18: { entropy: 192, security: 'Better', useCase: 'Enhanced security' },
            24: { entropy: 256, security: 'Best', useCase: 'Maximum security' },
          },
          recommendation: '24 words (256-bit entropy) recommended',
        };
      }

      case 'addPassphrase': {
        return {
          added: false,
          message: 'Passphrase must be set on Coldcard device',
          instructions: [
            '1. Go to Advanced/Tools > Add Passphrase',
            '2. Enter your passphrase',
            '3. This creates a new wallet derived from seed + passphrase',
            '4. Original seed remains accessible without passphrase',
          ],
          security: [
            'Passphrase adds extra security layer',
            'Creates completely different wallet',
            'Cannot be recovered if forgotten',
            'Store passphrase separately from seed',
          ],
        };
      }

      case 'clearPassphrase': {
        return {
          cleared: false,
          message: 'Passphrase is cleared by rebooting Coldcard',
          instructions: [
            '1. Power off Coldcard',
            '2. Power on again',
            '3. Enter main PIN',
            '4. You will be in base wallet (no passphrase)',
          ],
        };
      }

      case 'getPassphraseStatus': {
        return {
          message: 'Passphrase status check',
          info: 'Passphrase status is shown on Coldcard display after login',
          indicator: 'Different fingerprint indicates passphrase is active',
        };
      }

      case 'createTemporarySeed': {
        return {
          created: false,
          message: 'Temporary seed must be created on Coldcard',
          instructions: [
            '1. Go to Advanced/Tools > Temporary Seed',
            '2. Device generates temporary 24-word seed',
            '3. This seed is not stored permanently',
            '4. Lost on reboot',
          ],
          useCase: 'Testing or temporary operations without exposing main seed',
        };
      }

      case 'destroyTemporarySeed': {
        return {
          destroyed: false,
          message: 'Temporary seed is destroyed on reboot',
          instructions: [
            '1. Power off Coldcard',
            '2. Temporary seed is automatically destroyed',
            '3. Power on to return to main wallet',
          ],
        };
      }

      case 'useSecondaryPinWallet': {
        return {
          message: 'Secondary PIN wallet information',
          instructions: [
            '1. Set up secondary PIN in Settings > PIN Options',
            '2. Secondary PIN accesses a different wallet',
            '3. Can be used as decoy wallet',
          ],
          security: 'Secondary wallet can hold small amount as decoy',
        };
      }

      case 'generateSeedXor': {
        const shares = this.getNodeParameter('shares', itemIndex, 2) as number;

        return {
          generated: false,
          message: 'Seed XOR generation must be done on Coldcard',
          shares,
          instructions: [
            '1. Go to Advanced/Tools > Seed XOR',
            '2. Select Split Seed',
            `3. Choose ${shares} shares`,
            '4. Write down each share separately',
            '5. All shares needed to reconstruct',
          ],
          security: [
            'Each share looks like valid seed',
            'XOR combines shares mathematically',
            'Lose one share = lose access',
            'Store shares in different locations',
          ],
        };
      }

      case 'restoreFromSeedXor': {
        return {
          restored: false,
          message: 'Seed XOR restoration must be done on Coldcard',
          instructions: [
            '1. Go to Advanced/Tools > Seed XOR',
            '2. Select Combine Shares',
            '3. Enter each share in order',
            '4. Original seed is reconstructed',
          ],
        };
      }

      case 'getDuressPinWallet': {
        return {
          message: 'Duress PIN wallet information',
          instructions: [
            '1. Set up duress PIN in Settings > PIN Options',
            '2. Duress PIN shows different (decoy) wallet',
            '3. Use under threat to protect real funds',
          ],
          setup: [
            'Choose duress PIN different from main PIN',
            'Duress wallet should look legitimate',
            'Keep small balance in duress wallet',
          ],
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
      `Seed operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
