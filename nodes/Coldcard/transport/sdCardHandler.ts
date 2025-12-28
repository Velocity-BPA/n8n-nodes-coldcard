/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * SD Card Handler for Air-Gapped Coldcard Operations
 *
 * Implements file-based communication via MicroSD card for
 * completely air-gapped Bitcoin signing operations.
 */

/**
 * SD card status
 */
export interface SDCardStatus {
  mounted: boolean;
  path: string;
  freeSpace: number;
  totalSpace: number;
  files: SDCardFile[];
}

/**
 * SD card file information
 */
export interface SDCardFile {
  name: string;
  path: string;
  size: number;
  type: SDCardFileType;
  createdAt: Date;
  modifiedAt: Date;
  sha256?: string;
}

/**
 * File types recognized by Coldcard
 */
export enum SDCardFileType {
  PSBT = 'psbt',
  SIGNED_PSBT = 'signed-psbt',
  TRANSACTION = 'transaction',
  WALLET_EXPORT = 'wallet-export',
  MULTISIG_CONFIG = 'multisig-config',
  BACKUP = 'backup',
  ADDRESS_LIST = 'address-list',
  MESSAGE_SIGNATURE = 'signature',
  BSMS = 'bsms',
  UNKNOWN = 'unknown',
}

/**
 * SD Card Handler class
 */
export class SDCardHandler {
  private sdCardPath: string;
  private watchInterval: NodeJS.Timeout | null = null;

  constructor(sdCardPath: string) {
    this.sdCardPath = sdCardPath;
  }

  /**
   * Check if SD card is mounted
   */
  async isMounted(): Promise<boolean> {
    try {
      await fs.promises.access(this.sdCardPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get SD card status
   */
  async getStatus(): Promise<SDCardStatus> {
    const mounted = await this.isMounted();

    if (!mounted) {
      return {
        mounted: false,
        path: this.sdCardPath,
        freeSpace: 0,
        totalSpace: 0,
        files: [],
      };
    }

    const files = await this.listFiles();

    // Get disk space (platform specific)
    let freeSpace = 0;
    let totalSpace = 0;

    try {
      const stats = await fs.promises.statfs(this.sdCardPath);
      freeSpace = stats.bavail * stats.bsize;
      totalSpace = stats.blocks * stats.bsize;
    } catch {
      // statfs may not be available on all platforms
    }

    return {
      mounted,
      path: this.sdCardPath,
      freeSpace,
      totalSpace,
      files,
    };
  }

  /**
   * List files on SD card
   */
  async listFiles(directory?: string): Promise<SDCardFile[]> {
    const targetDir = directory || this.sdCardPath;
    const files: SDCardFile[] = [];

    try {
      const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(targetDir, entry.name);
          const stats = await fs.promises.stat(filePath);

          files.push({
            name: entry.name,
            path: filePath,
            size: stats.size,
            type: this.determineFileType(entry.name),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }

    return files;
  }

  /**
   * Read file from SD card
   */
  async readFile(fileName: string): Promise<Buffer> {
    const filePath = path.join(this.sdCardPath, fileName);

    try {
      return await fs.promises.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to read file ${fileName}: ${(error as Error).message}`);
    }
  }

  /**
   * Write file to SD card
   */
  async writeFile(fileName: string, content: Buffer): Promise<SDCardFile> {
    const filePath = path.join(this.sdCardPath, fileName);

    try {
      await fs.promises.writeFile(filePath, content);

      const stats = await fs.promises.stat(filePath);
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');

      return {
        name: fileName,
        path: filePath,
        size: stats.size,
        type: this.determineFileType(fileName),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        sha256,
      };
    } catch (error) {
      throw new Error(`Failed to write file ${fileName}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file from SD card
   */
  async deleteFile(fileName: string): Promise<boolean> {
    const filePath = path.join(this.sdCardPath, fileName);

    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file ${fileName}: ${(error as Error).message}`);
    }
  }

  /**
   * Copy file to SD card
   */
  async copyToCard(sourcePath: string, destFileName?: string): Promise<SDCardFile> {
    const fileName = destFileName || path.basename(sourcePath);
    const content = await fs.promises.readFile(sourcePath);

    return this.writeFile(fileName, content);
  }

  /**
   * Copy file from SD card
   */
  async copyFromCard(fileName: string, destPath: string): Promise<void> {
    const content = await this.readFile(fileName);
    await fs.promises.writeFile(destPath, content);
  }

  /**
   * Import PSBT for signing
   */
  async importPSBT(psbt: Buffer, name?: string): Promise<SDCardFile> {
    const fileName = name || `unsigned-${Date.now()}.psbt`;
    return this.writeFile(fileName, psbt);
  }

  /**
   * Export signed PSBT
   */
  async exportSignedPSBT(unsignedName: string): Promise<Buffer | null> {
    // Coldcard names signed files with -signed suffix
    const signedName = unsignedName.replace('.psbt', '-signed.psbt');

    try {
      return await this.readFile(signedName);
    } catch {
      // Also try -part suffix for partial signatures
      const partName = unsignedName.replace('.psbt', '-part.psbt');
      try {
        return await this.readFile(partName);
      } catch {
        return null;
      }
    }
  }

  /**
   * Get file hash
   */
  async getFileHash(fileName: string): Promise<string> {
    const content = await this.readFile(fileName);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify file hash
   */
  async verifyFileHash(fileName: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.getFileHash(fileName);
    return actualHash === expectedHash;
  }

  /**
   * Watch for new files (polling based)
   */
  startWatching(
    callback: (files: SDCardFile[]) => void,
    intervalMs: number = 2000,
  ): void {
    if (this.watchInterval) {
      this.stopWatching();
    }

    let previousFiles: string[] = [];

    this.watchInterval = setInterval(async () => {
      try {
        const files = await this.listFiles();
        const currentFiles = files.map((f) => f.name);

        // Check for new files
        const newFiles = files.filter((f) => !previousFiles.includes(f.name));

        if (newFiles.length > 0) {
          callback(newFiles);
        }

        previousFiles = currentFiles;
      } catch {
        // SD card may have been removed
      }
    }, intervalMs);
  }

  /**
   * Stop watching for files
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

  /**
   * Create directory on SD card
   */
  async createDirectory(dirName: string): Promise<void> {
    const dirPath = path.join(this.sdCardPath, dirName);

    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirName}: ${(error as Error).message}`);
    }
  }

  /**
   * Determine file type from name
   */
  private determineFileType(fileName: string): SDCardFileType {
    const lower = fileName.toLowerCase();

    if (lower.endsWith('-signed.psbt')) {
      return SDCardFileType.SIGNED_PSBT;
    }
    if (lower.endsWith('.psbt')) {
      return SDCardFileType.PSBT;
    }
    if (lower.endsWith('.txn') || lower.endsWith('-final.txn')) {
      return SDCardFileType.TRANSACTION;
    }
    if (lower.endsWith('.7z')) {
      return SDCardFileType.BACKUP;
    }
    if (lower.includes('electrum') || lower.includes('wasabi') || lower.includes('sparrow')) {
      return SDCardFileType.WALLET_EXPORT;
    }
    if (lower.includes('multisig') || lower.includes('-cc.txt')) {
      return SDCardFileType.MULTISIG_CONFIG;
    }
    if (lower.endsWith('.bsms')) {
      return SDCardFileType.BSMS;
    }
    if (lower.includes('addresses') && lower.endsWith('.csv')) {
      return SDCardFileType.ADDRESS_LIST;
    }
    if (lower.endsWith('.sig') || lower.includes('signed')) {
      return SDCardFileType.MESSAGE_SIGNATURE;
    }

    return SDCardFileType.UNKNOWN;
  }

  /**
   * Format SD card (DANGEROUS - clears all data)
   */
  async format(): Promise<void> {
    throw new Error('SD card formatting must be done manually for safety');
  }

  /**
   * Safely eject SD card
   */
  async eject(): Promise<boolean> {
    // Platform-specific eject command
    // This is informational only - actual ejection is OS-dependent
    console.warn('Please safely eject the SD card using your operating system');
    return true;
  }

  /**
   * Get path
   */
  getPath(): string {
    return this.sdCardPath;
  }

  /**
   * Set path
   */
  setPath(newPath: string): void {
    this.sdCardPath = newPath;
  }
}

/**
 * Create SD card handler instance
 */
export function createSDCardHandler(sdCardPath: string): SDCardHandler {
  return new SDCardHandler(sdCardPath);
}

/**
 * Common Coldcard SD card file patterns
 */
export const COLDCARD_FILE_PATTERNS = {
  UNSIGNED_PSBT: /^.*\.psbt$/i,
  SIGNED_PSBT: /^.*-signed\.psbt$/i,
  PARTIAL_PSBT: /^.*-part\.psbt$/i,
  FINAL_TX: /^.*-final\.txn$/i,
  BACKUP: /^.*\.7z$/i,
  WALLET_JSON: /^.*\.json$/i,
  MULTISIG_TXT: /^.*-cc\.txt$/i,
  ADDRESS_CSV: /^.*addresses.*\.csv$/i,
  BSMS: /^.*\.bsms$/i,
};
