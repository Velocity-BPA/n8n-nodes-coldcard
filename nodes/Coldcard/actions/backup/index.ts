/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { SDCardHandler } from '../transport/sdCardHandler';
import {
  generateBackupFileName,
  parseBackupFileName,
  calculateFileHash,
  verifyBackupIntegrity,
  generateSeedXORShares,
  generatePasswordHint,
  getBackupRecommendations,
  getCountdownDuration,
} from '../utils/backupUtils';

/**
 * Backup operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');
  const sdPath = credentials.sdCardPath as string;

  try {
    switch (operation) {
      case 'createEncryptedBackup': {
        return {
          created: false,
          message: 'Encrypted backup must be created directly on Coldcard',
          instructions: [
            '1. Insert SD card into Coldcard',
            '2. Navigate to Advanced/Tools > Backup',
            '3. Enter backup password when prompted',
            '4. Backup will be created as .7z file on SD card',
            '5. Remove SD card and store securely',
          ],
          security: [
            'Use a strong, unique password',
            'Store password separately from backup',
            'Create multiple backup copies',
            'Test backup restoration periodically',
          ],
        };
      }

      case 'verifyBackup': {
        const filePath = this.getNodeParameter('filePath', itemIndex) as string;

        const handler = new SDCardHandler(sdPath);
        const content = await handler.readFile(filePath);

        const isValid = await verifyBackupIntegrity(content);
        const hash = await calculateFileHash(content);

        return {
          verified: isValid,
          filePath,
          sha256: hash,
          size: content.length,
          format: isValid ? '7z (AES-256 encrypted)' : 'unknown',
        };
      }

      case 'getBackupInfo': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;

        const parsed = parseBackupFileName(fileName);

        if (!parsed) {
          return {
            valid: false,
            fileName,
            message: 'Could not parse backup file name',
          };
        }

        const handler = new SDCardHandler(sdPath);
        const files = await handler.listFiles();
        const file = files.find((f) => f.name === fileName);

        return {
          valid: true,
          fileName,
          fingerprint: parsed.fingerprint,
          timestamp: parsed.timestamp,
          format: '7z',
          encrypted: true,
          size: file?.size || 0,
          createdAt: file?.createdAt || null,
        };
      }

      case 'exportBackupToSd': {
        const sourcePath = this.getNodeParameter('sourcePath', itemIndex) as string;

        const handler = new SDCardHandler(sdPath);
        const file = await handler.copyToCard(sourcePath);

        return {
          exported: true,
          fileName: file.name,
          size: file.size,
          sha256: file.sha256,
        };
      }

      case 'importBackupFromSd': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;
        const destPath = this.getNodeParameter('destPath', itemIndex) as string;

        const handler = new SDCardHandler(sdPath);
        await handler.copyFromCard(fileName, destPath);

        const content = await handler.readFile(fileName);
        const hash = await calculateFileHash(content);

        return {
          imported: true,
          fileName,
          destPath,
          sha256: hash,
          size: content.length,
        };
      }

      case 'createPaperBackupWords': {
        return {
          created: false,
          message: 'Paper backup (seed words) must be viewed on Coldcard device',
          instructions: [
            '1. On Coldcard, go to Advanced/Tools > View Seed Words',
            '2. Enter PIN when prompted',
            '3. Write down all 24 words in order',
            '4. Verify by re-entering on device',
            '5. Store in secure location',
          ],
          security: [
            'Never photograph or digitize seed words',
            'Use metal backup for fire/water resistance',
            'Store in multiple secure locations',
            'Consider using Seed XOR for additional security',
          ],
        };
      }

      case 'verifyPaperBackup': {
        return {
          verified: false,
          message: 'Paper backup verification must be done on Coldcard device',
          instructions: [
            '1. On Coldcard, go to Advanced/Tools > Verify Seed Words',
            '2. Enter your 24 seed words',
            '3. Device will confirm if words are correct',
          ],
        };
      }

      case 'createSeedXor': {
        const shares = this.getNodeParameter('shares', itemIndex, 2) as number;

        const shareInfo = generateSeedXORShares(shares);

        return {
          created: false,
          shares,
          message: 'Seed XOR must be created on Coldcard device',
          instructions: [
            '1. On Coldcard, go to Advanced/Tools > Seed XOR',
            '2. Select Create Shares',
            `3. Choose ${shares} shares`,
            '4. Device will generate XOR shares',
            '5. Write down each share separately',
            '6. All shares needed to reconstruct seed',
          ],
          shareInfo,
        };
      }

      case 'combineSeedXor': {
        return {
          combined: false,
          message: 'Seed XOR combination must be done on Coldcard device',
          instructions: [
            '1. On Coldcard, go to Advanced/Tools > Seed XOR',
            '2. Select Restore Seed',
            '3. Enter all XOR shares',
            '4. Device will reconstruct original seed',
          ],
        };
      }

      case 'getBackupPasswordHint': {
        const password = this.getNodeParameter('password', itemIndex) as string;

        const hint = generatePasswordHint(password);

        return {
          hint,
          hintType: 'first-letters',
          message: 'This hint shows first letter of each word in your password phrase',
          warning: 'Store this hint separately from your backup',
        };
      }

      case 'countdownBackup': {
        const securityLevel = this.getNodeParameter('securityLevel', itemIndex, 'medium') as string;

        const duration = getCountdownDuration(securityLevel);

        return {
          securityLevel,
          countdownSeconds: duration,
          countdownFormatted: duration > 3600
            ? `${Math.floor(duration / 3600)} hours`
            : duration > 60
              ? `${Math.floor(duration / 60)} minutes`
              : `${duration} seconds`,
          message: 'Countdown backup adds delay before backup creation',
          purpose: 'Prevents quick extraction under duress',
        };
      }

      case 'getBackupRecommendations': {
        const balanceBtc = this.getNodeParameter('balanceBtc', itemIndex, 0) as number;
        const txCount = this.getNodeParameter('txCount', itemIndex, 0) as number;
        const lastBackupDays = this.getNodeParameter('lastBackupDays', itemIndex, 0) as number;

        const recommendations = getBackupRecommendations({
          balanceBtc,
          txCount,
          lastBackupDays,
        });

        return {
          recommendations,
          balanceBtc,
          txCount,
          lastBackupDays,
          urgency: lastBackupDays > 90 ? 'high' : lastBackupDays > 30 ? 'medium' : 'low',
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
      `Backup operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
