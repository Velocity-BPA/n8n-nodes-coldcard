/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { PIN_TYPES, TRICK_BEHAVIORS, LOCKOUT_ACTIONS, isValidPIN } from '../constants/pinTypes';

/**
 * PIN operations for Coldcard
 * 
 * SECURITY NOTE: PIN operations are device-only for security.
 * This node provides information and configuration guidance.
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  try {
    switch (operation) {
      case 'changePin': {
        return {
          changed: false,
          message: 'PIN must be changed directly on Coldcard device',
          instructions: [
            '1. Go to Settings > PIN Options > Change PIN',
            '2. Enter current PIN',
            '3. Enter new PIN twice',
            '4. PIN change is immediate',
          ],
          requirements: {
            minLength: 4,
            maxLength: 12,
            characters: 'Digits 0-9',
          },
        };
      }

      case 'getPinAttemptsRemaining': {
        return {
          message: 'PIN attempts information',
          maxAttempts: 13,
          info: 'After 13 wrong attempts, device is bricked',
          current: 'Check device screen for current count',
          warning: 'Attempts counter shown after wrong PIN entry',
        };
      }

      case 'setSecondaryPin': {
        return {
          set: false,
          message: 'Secondary PIN setup on Coldcard',
          instructions: [
            '1. Go to Settings > PIN Options > Secondary PIN',
            '2. Enter main PIN to authorize',
            '3. Set secondary PIN',
            '4. Secondary PIN accesses different wallet',
          ],
          useCase: 'Create separate wallet for different purpose',
        };
      }

      case 'setDuressPin': {
        return {
          set: false,
          message: 'Duress PIN setup on Coldcard',
          type: PIN_TYPES.DURESS,
          instructions: [
            '1. Go to Settings > PIN Options > Duress PIN',
            '2. Enter main PIN to authorize',
            '3. Set duress PIN',
            '4. Duress PIN shows decoy wallet',
          ],
          useCase: 'Protection under physical threat',
          security: [
            'Decoy wallet looks legitimate',
            'Put small amount in decoy',
            'Cannot be distinguished from real',
          ],
        };
      }

      case 'getPinPolicy': {
        return {
          policy: {
            minLength: 4,
            maxLength: 12,
            allowedCharacters: '0-9',
            maxAttempts: 13,
            lockoutAction: LOCKOUT_ACTIONS.BRICK,
            antiPhishing: true,
          },
          pinTypes: Object.values(PIN_TYPES),
          lockoutActions: Object.values(LOCKOUT_ACTIONS),
        };
      }

      case 'getLoginCountdown': {
        return {
          message: 'Login countdown information',
          info: 'Countdown delays login after PIN prefix',
          purpose: 'Prevents quick extraction under threat',
          durations: {
            low: '0 seconds',
            medium: '1 hour',
            high: '24 hours',
          },
          setup: 'Configure in Settings > Login Countdown',
        };
      }

      case 'setBrickPin': {
        return {
          set: false,
          message: 'Brick PIN setup on Coldcard',
          type: PIN_TYPES.BRICK,
          instructions: [
            '1. Go to Settings > PIN Options > Brick Me PIN',
            '2. Enter main PIN to authorize',
            '3. Set brick PIN',
            '4. This PIN destroys the device permanently',
          ],
          warning: 'IRREVERSIBLE - Device becomes permanently unusable',
          useCase: 'Emergency destruction under extreme threat',
        };
      }

      case 'setCountdownPolicy': {
        const level = this.getNodeParameter('level', itemIndex, 'medium') as string;

        const durations: Record<string, number> = {
          none: 0,
          low: 60,
          medium: 3600,
          high: 86400,
        };

        return {
          set: false,
          level,
          durationSeconds: durations[level] || 0,
          message: 'Countdown policy must be set on device',
          instructions: [
            '1. Go to Settings > Login Countdown',
            '2. Select countdown duration',
            '3. Countdown activates after PIN prefix',
          ],
        };
      }

      case 'getTrickPins': {
        return {
          message: 'Trick PIN information',
          type: PIN_TYPES.TRICK,
          behaviors: Object.values(TRICK_BEHAVIORS),
          info: 'Trick PINs trigger specific behaviors',
          examples: {
            decoy: 'Show decoy wallet with small balance',
            wipe: 'Wipe device after countdown',
            blank: 'Show blank/empty wallet',
            fake: 'Show fake countdown',
          },
          setup: 'Configure in Settings > Trick PINs',
        };
      }

      case 'configureTrickPin': {
        const behavior = this.getNodeParameter('behavior', itemIndex, 'decoy') as string;

        return {
          configured: false,
          behavior,
          message: 'Trick PIN must be configured on device',
          instructions: [
            '1. Go to Settings > Trick PINs',
            '2. Add new trick PIN',
            `3. Select behavior: ${behavior}`,
            '4. Set the PIN digits',
          ],
          behaviors: TRICK_BEHAVIORS,
        };
      }

      case 'validatePin': {
        const pin = this.getNodeParameter('pin', itemIndex) as string;

        const isValid = isValidPIN(pin);
        const length = pin.length;

        return {
          valid: isValid,
          length,
          issues: !isValid
            ? [
                length < 4 ? 'PIN too short (min 4 digits)' : null,
                length > 12 ? 'PIN too long (max 12 digits)' : null,
                !/^\d+$/.test(pin) ? 'PIN must contain only digits' : null,
              ].filter(Boolean)
            : [],
          strength: length >= 8 ? 'strong' : length >= 6 ? 'medium' : 'weak',
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
      `PIN operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
