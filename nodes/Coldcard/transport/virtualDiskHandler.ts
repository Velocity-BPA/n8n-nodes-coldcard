/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Virtual Disk Handler for Coldcard
 *
 * Implements USB drive mode communication for Coldcard.
 * The device appears as a USB drive with special files for commands.
 */

/**
 * Virtual Disk Status
 */
export interface VirtualDiskStatus {
  enabled: boolean;
  mounted: boolean;
  path: string;
  ready: boolean;
  hasCommand: boolean;
  hasResponse: boolean;
}

/**
 * Virtual Disk Files
 */
export const VIRTUAL_DISK_FILES = {
  READY: 'READY.txt',
  COMMAND: 'command.txt',
  RESPONSE: 'response.txt',
  UNSIGNED_PSBT: 'unsigned.psbt',
  SIGNED_PSBT: 'signed.psbt',
  ADDRESS: 'address.txt',
  XPUB: 'xpub.txt',
  MESSAGE: 'message.txt',
  SIGNATURE: 'signature.txt',
};

/**
 * Virtual Disk Command Types
 */
export enum VirtualDiskCommand {
  SIGN_PSBT = 'sign_psbt',
  GET_ADDRESS = 'get_address',
  GET_XPUB = 'get_xpub',
  SIGN_MESSAGE = 'sign_message',
  SHOW_ADDRESS = 'show_address',
  EXPORT_WALLET = 'export_wallet',
  GET_INFO = 'get_info',
}

/**
 * Virtual Disk Response
 */
export interface VirtualDiskResponse {
  success: boolean;
  command: VirtualDiskCommand;
  data?: string | Buffer;
  error?: string;
  timestamp: Date;
}

/**
 * Virtual Disk Handler class
 */
export class VirtualDiskHandler {
  private diskPath: string;
  private watchInterval: NodeJS.Timeout | null = null;
  private pollInterval: number = 1000;

  constructor(diskPath: string) {
    this.diskPath = diskPath;
  }

  /**
   * Check if virtual disk is enabled/mounted
   */
  async isEnabled(): Promise<boolean> {
    try {
      await fs.promises.access(this.diskPath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if device is ready
   */
  async isReady(): Promise<boolean> {
    try {
      const readyPath = path.join(this.diskPath, VIRTUAL_DISK_FILES.READY);
      await fs.promises.access(readyPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get virtual disk status
   */
  async getStatus(): Promise<VirtualDiskStatus> {
    const enabled = await this.isEnabled();
    const ready = enabled ? await this.isReady() : false;

    let hasCommand = false;
    let hasResponse = false;

    if (enabled) {
      try {
        await fs.promises.access(
          path.join(this.diskPath, VIRTUAL_DISK_FILES.COMMAND),
          fs.constants.R_OK,
        );
        hasCommand = true;
      } catch {
        // No command file
      }

      try {
        await fs.promises.access(
          path.join(this.diskPath, VIRTUAL_DISK_FILES.RESPONSE),
          fs.constants.R_OK,
        );
        hasResponse = true;
      } catch {
        // No response file
      }
    }

    return {
      enabled,
      mounted: enabled,
      path: this.diskPath,
      ready,
      hasCommand,
      hasResponse,
    };
  }

  /**
   * Write PSBT for signing
   */
  async writePSBT(psbt: Buffer): Promise<boolean> {
    try {
      const psbtPath = path.join(this.diskPath, VIRTUAL_DISK_FILES.UNSIGNED_PSBT);
      await fs.promises.writeFile(psbtPath, psbt);
      return true;
    } catch (error) {
      throw new Error(`Failed to write PSBT: ${(error as Error).message}`);
    }
  }

  /**
   * Read signed PSBT
   */
  async readSignedPSBT(): Promise<Buffer | null> {
    try {
      const psbtPath = path.join(this.diskPath, VIRTUAL_DISK_FILES.SIGNED_PSBT);
      return await fs.promises.readFile(psbtPath);
    } catch {
      return null;
    }
  }

  /**
   * Write command file
   */
  async writeCommand(command: VirtualDiskCommand, params?: Record<string, string>): Promise<void> {
    const commandContent = JSON.stringify({
      command,
      params: params || {},
      timestamp: new Date().toISOString(),
    });

    const commandPath = path.join(this.diskPath, VIRTUAL_DISK_FILES.COMMAND);
    await fs.promises.writeFile(commandPath, commandContent);
  }

  /**
   * Read response file
   */
  async readResponse(): Promise<VirtualDiskResponse | null> {
    try {
      const responsePath = path.join(this.diskPath, VIRTUAL_DISK_FILES.RESPONSE);
      const content = await fs.promises.readFile(responsePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Clear response file
   */
  async clearResponse(): Promise<void> {
    try {
      const responsePath = path.join(this.diskPath, VIRTUAL_DISK_FILES.RESPONSE);
      await fs.promises.unlink(responsePath);
    } catch {
      // File may not exist
    }
  }

  /**
   * Clear command file
   */
  async clearCommand(): Promise<void> {
    try {
      const commandPath = path.join(this.diskPath, VIRTUAL_DISK_FILES.COMMAND);
      await fs.promises.unlink(commandPath);
    } catch {
      // File may not exist
    }
  }

  /**
   * Wait for response
   */
  async waitForResponse(timeoutMs: number = 60000): Promise<VirtualDiskResponse> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkResponse = async () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Timeout waiting for device response'));
          return;
        }

        const response = await this.readResponse();
        if (response) {
          resolve(response);
          return;
        }

        setTimeout(checkResponse, this.pollInterval);
      };

      checkResponse();
    });
  }

  /**
   * Execute command and wait for response
   */
  async executeCommand(
    command: VirtualDiskCommand,
    params?: Record<string, string>,
    timeoutMs?: number,
  ): Promise<VirtualDiskResponse> {
    await this.clearResponse();
    await this.writeCommand(command, params);
    return this.waitForResponse(timeoutMs);
  }

  /**
   * Import file to virtual disk
   */
  async importFile(sourcePath: string, destName?: string): Promise<boolean> {
    try {
      const fileName = destName || path.basename(sourcePath);
      const destPath = path.join(this.diskPath, fileName);
      await fs.promises.copyFile(sourcePath, destPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to import file: ${(error as Error).message}`);
    }
  }

  /**
   * Export file from virtual disk
   */
  async exportFile(fileName: string, destPath: string): Promise<boolean> {
    try {
      const sourcePath = path.join(this.diskPath, fileName);
      await fs.promises.copyFile(sourcePath, destPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to export file: ${(error as Error).message}`);
    }
  }

  /**
   * List files on virtual disk
   */
  async listFiles(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(this.diskPath);
      return entries;
    } catch (error) {
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  /**
   * Read file from virtual disk
   */
  async readFile(fileName: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.diskPath, fileName);
      return await fs.promises.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  /**
   * Write file to virtual disk
   */
  async writeFile(fileName: string, content: Buffer | string): Promise<boolean> {
    try {
      const filePath = path.join(this.diskPath, fileName);
      await fs.promises.writeFile(filePath, content);
      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file from virtual disk
   */
  async deleteFile(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.diskPath, fileName);
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Start watching for file changes
   */
  startWatching(callback: (files: string[]) => void): void {
    if (this.watchInterval) {
      this.stopWatching();
    }

    let previousFiles: string[] = [];

    this.watchInterval = setInterval(async () => {
      try {
        const currentFiles = await this.listFiles();
        const newFiles = currentFiles.filter((f) => !previousFiles.includes(f));

        if (newFiles.length > 0) {
          callback(newFiles);
        }

        previousFiles = currentFiles;
      } catch {
        // Disk may have been unmounted
      }
    }, this.pollInterval);
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

  /**
   * Get disk path
   */
  getPath(): string {
    return this.diskPath;
  }

  /**
   * Set disk path
   */
  setPath(newPath: string): void {
    this.diskPath = newPath;
  }

  /**
   * Set poll interval
   */
  setPollInterval(intervalMs: number): void {
    this.pollInterval = intervalMs;
  }
}

/**
 * Create virtual disk handler instance
 */
export function createVirtualDiskHandler(diskPath: string): VirtualDiskHandler {
  return new VirtualDiskHandler(diskPath);
}

/**
 * Common virtual disk paths by OS
 */
export const COMMON_DISK_PATHS = {
  LINUX: '/media/COLDCARD',
  MACOS: '/Volumes/COLDCARD',
  WINDOWS: 'E:\\',
};
