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
import { SDCardHandler, SDCardFileType } from '../transport/sdCardHandler';

/**
 * SD Card operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');
  const sdPath = credentials.sdCardPath as string;

  if (!sdPath && operation !== 'getStatus') {
    throw new NodeOperationError(
      this.getNode(),
      'SD card path is required for this operation',
      { itemIndex },
    );
  }

  const handler = new SDCardHandler(sdPath || '');

  try {
    switch (operation) {
      case 'listFiles': {
        const directory = this.getNodeParameter('directory', itemIndex, '') as string;
        const filterType = this.getNodeParameter('filterType', itemIndex, 'all') as string;

        let files = await handler.listFiles(directory || undefined);

        if (filterType !== 'all') {
          files = files.filter((f) => f.type === filterType);
        }

        return {
          files: files.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            createdAt: f.createdAt,
            modifiedAt: f.modifiedAt,
          })),
          count: files.length,
          directory: directory || sdPath,
        };
      }

      case 'readFile': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;
        const encoding = this.getNodeParameter('encoding', itemIndex, 'utf8') as string;

        const content = await handler.readFile(fileName);

        if (encoding === 'base64') {
          return {
            fileName,
            content: content.toString('base64'),
            encoding: 'base64',
            size: content.length,
          };
        } else if (encoding === 'hex') {
          return {
            fileName,
            content: content.toString('hex'),
            encoding: 'hex',
            size: content.length,
          };
        } else {
          return {
            fileName,
            content: content.toString('utf8'),
            encoding: 'utf8',
            size: content.length,
          };
        }
      }

      case 'writeFile': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;
        const content = this.getNodeParameter('content', itemIndex) as string;
        const encoding = this.getNodeParameter('encoding', itemIndex, 'utf8') as string;

        let buffer: Buffer;
        if (encoding === 'base64') {
          buffer = Buffer.from(content, 'base64');
        } else if (encoding === 'hex') {
          buffer = Buffer.from(content, 'hex');
        } else {
          buffer = Buffer.from(content, 'utf8');
        }

        const file = await handler.writeFile(fileName, buffer);

        return {
          written: true,
          fileName: file.name,
          size: file.size,
          sha256: file.sha256,
        };
      }

      case 'deleteFile': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;

        await handler.deleteFile(fileName);

        return {
          deleted: true,
          fileName,
        };
      }

      case 'getStatus': {
        const status = await handler.getStatus();

        return {
          mounted: status.mounted,
          path: status.path,
          freeSpace: status.freeSpace,
          totalSpace: status.totalSpace,
          usedSpace: status.totalSpace - status.freeSpace,
          usedPercent: status.totalSpace > 0
            ? Math.round(((status.totalSpace - status.freeSpace) / status.totalSpace) * 100)
            : 0,
          fileCount: status.files.length,
        };
      }

      case 'getFreeSpace': {
        const status = await handler.getStatus();

        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        return {
          freeSpace: status.freeSpace,
          totalSpace: status.totalSpace,
          usedSpace: status.totalSpace - status.freeSpace,
          freeSpaceFormatted: formatBytes(status.freeSpace),
          totalSpaceFormatted: formatBytes(status.totalSpace),
        };
      }

      case 'formatCard': {
        return {
          formatted: false,
          message: 'SD card formatting must be done manually for safety',
          instructions: [
            '1. Remove SD card from computer',
            '2. Use system disk utility to format',
            '3. Choose FAT32 format',
            '4. Label as "COLDCARD" (optional)',
          ],
        };
      }

      case 'ejectCard': {
        await handler.eject();

        return {
          ejected: true,
          message: 'Please safely eject the SD card using your operating system',
        };
      }

      case 'importFile': {
        const sourcePath = this.getNodeParameter('sourcePath', itemIndex) as string;
        const destName = this.getNodeParameter('destName', itemIndex, '') as string;

        const file = await handler.copyToCard(sourcePath, destName || undefined);

        return {
          imported: true,
          sourcePath,
          destName: file.name,
          size: file.size,
          sha256: file.sha256,
        };
      }

      case 'exportFile': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;
        const destPath = this.getNodeParameter('destPath', itemIndex) as string;

        await handler.copyFromCard(fileName, destPath);

        return {
          exported: true,
          fileName,
          destPath,
        };
      }

      case 'getFileHash': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;

        const hash = await handler.getFileHash(fileName);

        return {
          fileName,
          sha256: hash,
          algorithm: 'SHA-256',
        };
      }

      case 'verifyFileHash': {
        const fileName = this.getNodeParameter('fileName', itemIndex) as string;
        const expectedHash = this.getNodeParameter('expectedHash', itemIndex) as string;

        const matches = await handler.verifyFileHash(fileName, expectedHash);
        const actualHash = await handler.getFileHash(fileName);

        return {
          fileName,
          matches,
          expectedHash,
          actualHash,
          algorithm: 'SHA-256',
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
      `SD card operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
