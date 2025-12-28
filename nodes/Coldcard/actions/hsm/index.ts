/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { USBTransport } from '../transport/usbTransport';
import { SDCardHandler } from '../transport/sdCardHandler';
import { HSM_MODES, HSM_RULE_TYPES, VELOCITY_PERIODS } from '../constants/hsmOptions';

/**
 * HSM Mode operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');

  try {
    switch (operation) {
      case 'enableHsmMode': {
        const policyFile = this.getNodeParameter('policyFile', itemIndex, '') as string;

        const transport = new USBTransport();
        try {
          await transport.connect(credentials.devicePath as string);

          // HSM mode enabling would require policy upload
          return {
            enabled: false,
            message: 'HSM mode activation requires policy file upload via SD card',
            instructions: [
              '1. Create HSM policy JSON file',
              '2. Copy policy to SD card',
              '3. Insert SD card into Coldcard',
              '4. Navigate to Settings > HSM Mode',
              '5. Select and activate policy',
            ],
          };
        } finally {
          await transport.disconnect();
        }
      }

      case 'disableHsmMode': {
        const transport = new USBTransport();
        try {
          await transport.connect(credentials.devicePath as string);

          return {
            disabled: false,
            message: 'HSM mode can only be disabled from the device directly',
            instructions: [
              '1. On Coldcard, navigate to Settings > HSM Mode',
              '2. Select Disable HSM',
              '3. Confirm with PIN',
            ],
          };
        } finally {
          await transport.disconnect();
        }
      }

      case 'getHsmPolicy': {
        // HSM policy retrieval
        return {
          policy: null,
          message: 'HSM policy must be retrieved from device or SD card',
        };
      }

      case 'uploadHsmPolicy': {
        const policyJson = this.getNodeParameter('policy', itemIndex) as string;

        const policy = JSON.parse(policyJson);

        // Validate policy structure
        if (!policy.rules || !Array.isArray(policy.rules)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid HSM policy: missing rules array',
            { itemIndex },
          );
        }

        const sdPath = credentials.sdCardPath as string;
        if (!sdPath) {
          throw new NodeOperationError(
            this.getNode(),
            'SD card path required for HSM policy upload',
            { itemIndex },
          );
        }

        const handler = new SDCardHandler(sdPath);
        const fileName = `hsm-policy-${Date.now()}.json`;
        await handler.writeFile(fileName, Buffer.from(JSON.stringify(policy, null, 2)));

        return {
          uploaded: true,
          fileName,
          sdPath,
          rulesCount: policy.rules.length,
          message: 'Policy written to SD card. Activate on Coldcard.',
        };
      }

      case 'getHsmStatus': {
        const transport = new USBTransport();
        try {
          await transport.connect(credentials.devicePath as string);

          // HSM status would come from device
          return {
            mode: HSM_MODES.DISABLED,
            active: false,
            policyLoaded: false,
            lastActivity: null,
            message: 'HSM status check requires device query',
          };
        } finally {
          await transport.disconnect();
        }
      }

      case 'getHsmUsers': {
        return {
          users: [],
          message: 'HSM users are configured in the policy file',
          example: {
            users: [
              { name: 'admin', authMode: 'totp' },
              { name: 'operator', authMode: 'hotp' },
            ],
          },
        };
      }

      case 'addHsmUser': {
        const userName = this.getNodeParameter('userName', itemIndex) as string;
        const authMode = this.getNodeParameter('authMode', itemIndex, 'totp') as string;
        const existingPolicy = this.getNodeParameter('existingPolicy', itemIndex, '{}') as string;

        const policy = JSON.parse(existingPolicy);
        policy.users = policy.users || [];
        policy.users.push({
          name: userName,
          authMode,
          createdAt: new Date().toISOString(),
        });

        return {
          added: true,
          userName,
          authMode,
          totalUsers: policy.users.length,
          updatedPolicy: JSON.stringify(policy, null, 2),
        };
      }

      case 'removeHsmUser': {
        const userName = this.getNodeParameter('userName', itemIndex) as string;
        const existingPolicy = this.getNodeParameter('existingPolicy', itemIndex, '{}') as string;

        const policy = JSON.parse(existingPolicy);
        policy.users = policy.users || [];
        const initialCount = policy.users.length;
        policy.users = policy.users.filter((u: { name: string }) => u.name !== userName);

        return {
          removed: policy.users.length < initialCount,
          userName,
          remainingUsers: policy.users.length,
          updatedPolicy: JSON.stringify(policy, null, 2),
        };
      }

      case 'getHsmVelocity': {
        const policyJson = this.getNodeParameter('policy', itemIndex, '{}') as string;

        const policy = JSON.parse(policyJson);
        const velocity = policy.velocity || {};

        return {
          velocity: {
            maxAmount: velocity.maxAmount || 0,
            period: velocity.period || VELOCITY_PERIODS.DAY,
            maxTxCount: velocity.maxTxCount || 0,
            currentUsage: velocity.currentUsage || 0,
            periodReset: velocity.periodReset || null,
          },
          periodOptions: Object.values(VELOCITY_PERIODS),
        };
      }

      case 'getHsmWhitelist': {
        const policyJson = this.getNodeParameter('policy', itemIndex, '{}') as string;

        const policy = JSON.parse(policyJson);
        const whitelist = policy.whitelist || { addresses: [] };

        return {
          whitelist: whitelist.addresses,
          count: whitelist.addresses.length,
          required: whitelist.required || false,
          allowChange: whitelist.allowChange !== false,
        };
      }

      case 'addToWhitelist': {
        const address = this.getNodeParameter('address', itemIndex) as string;
        const label = this.getNodeParameter('label', itemIndex, '') as string;
        const existingPolicy = this.getNodeParameter('existingPolicy', itemIndex, '{}') as string;

        const policy = JSON.parse(existingPolicy);
        policy.whitelist = policy.whitelist || { addresses: [] };
        policy.whitelist.addresses.push({
          address,
          label,
          addedAt: new Date().toISOString(),
        });

        return {
          added: true,
          address,
          label,
          totalAddresses: policy.whitelist.addresses.length,
          updatedPolicy: JSON.stringify(policy, null, 2),
        };
      }

      case 'removeFromWhitelist': {
        const address = this.getNodeParameter('address', itemIndex) as string;
        const existingPolicy = this.getNodeParameter('existingPolicy', itemIndex, '{}') as string;

        const policy = JSON.parse(existingPolicy);
        policy.whitelist = policy.whitelist || { addresses: [] };
        const initialCount = policy.whitelist.addresses.length;
        policy.whitelist.addresses = policy.whitelist.addresses.filter(
          (a: { address: string }) => a.address !== address,
        );

        return {
          removed: policy.whitelist.addresses.length < initialCount,
          address,
          remainingAddresses: policy.whitelist.addresses.length,
          updatedPolicy: JSON.stringify(policy, null, 2),
        };
      }

      case 'getHsmLimits': {
        const policyJson = this.getNodeParameter('policy', itemIndex, '{}') as string;

        const policy = JSON.parse(policyJson);

        return {
          limits: {
            perTransaction: policy.perTxLimit || null,
            velocity: policy.velocity || null,
            pathRestrictions: policy.pathRestrictions || null,
          },
          ruleTypes: Object.values(HSM_RULE_TYPES),
        };
      }

      case 'getHsmLog': {
        return {
          logs: [],
          message: 'HSM logs are stored on the Coldcard device',
          instructions: [
            '1. Connect to Coldcard',
            '2. Navigate to Settings > HSM Mode',
            '3. Select View Log',
            '4. Export to SD card if needed',
          ],
        };
      }

      case 'testHsmPolicy': {
        const policyJson = this.getNodeParameter('policy', itemIndex) as string;
        const testAmount = this.getNodeParameter('testAmount', itemIndex, 100000) as number;
        const testAddress = this.getNodeParameter('testAddress', itemIndex, '') as string;

        const policy = JSON.parse(policyJson);

        const results: string[] = [];
        let wouldApprove = true;

        // Check velocity limits
        if (policy.velocity) {
          if (testAmount > policy.velocity.maxAmount) {
            results.push(`FAIL: Amount ${testAmount} exceeds velocity limit ${policy.velocity.maxAmount}`);
            wouldApprove = false;
          } else {
            results.push(`PASS: Amount within velocity limit`);
          }
        }

        // Check whitelist
        if (policy.whitelist && policy.whitelist.required) {
          const isWhitelisted = policy.whitelist.addresses.some(
            (a: { address: string }) => a.address === testAddress,
          );
          if (!isWhitelisted) {
            results.push(`FAIL: Address ${testAddress} not in whitelist`);
            wouldApprove = false;
          } else {
            results.push(`PASS: Address is whitelisted`);
          }
        }

        // Check per-tx limits
        if (policy.perTxLimit && testAmount > policy.perTxLimit) {
          results.push(`FAIL: Amount exceeds per-transaction limit`);
          wouldApprove = false;
        }

        return {
          wouldApprove,
          testAmount,
          testAddress,
          results,
          policy: {
            hasVelocity: !!policy.velocity,
            hasWhitelist: !!policy.whitelist,
            hasPerTxLimit: !!policy.perTxLimit,
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
      `HSM operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
