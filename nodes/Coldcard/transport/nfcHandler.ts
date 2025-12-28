/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * NFC Handler for Coldcard Q
 *
 * Implements NFC-based communication for Coldcard Q model.
 * Supports tap-to-sign, address sharing, and xpub export via NFC.
 */

/**
 * NFC Status
 */
export interface NFCStatus {
  enabled: boolean;
  available: boolean;
  connected: boolean;
  model: 'Q' | 'unknown';
  timeout: number;
  lastActivity?: Date;
}

/**
 * NFC Settings
 */
export interface NFCSettings {
  enabled: boolean;
  timeout: number; // seconds
  requireConfirmation: boolean;
  allowPSBT: boolean;
  allowAddress: boolean;
  allowXpub: boolean;
  allowMessage: boolean;
}

/**
 * NFC Data Type
 */
export enum NFCDataType {
  PSBT = 'psbt',
  ADDRESS = 'address',
  XPUB = 'xpub',
  SIGNATURE = 'signature',
  MESSAGE = 'message',
  MULTISIG = 'multisig',
  UNKNOWN = 'unknown',
}

/**
 * NFC Transfer Result
 */
export interface NFCTransferResult {
  success: boolean;
  type: NFCDataType;
  data: Buffer | string;
  timestamp: Date;
  error?: string;
}

/**
 * NFC Event
 */
export interface NFCEvent {
  type: 'tap' | 'complete' | 'error' | 'timeout';
  dataType?: NFCDataType;
  data?: Buffer | string;
  timestamp: Date;
  error?: string;
}

/**
 * NFC Handler class for Coldcard Q
 */
export class NFCHandler {
  private enabled: boolean = false;
  private timeout: number = 30000; // 30 seconds default
  private eventCallback?: (event: NFCEvent) => void;
  private settings: NFCSettings;

  constructor(settings?: Partial<NFCSettings>) {
    this.settings = {
      enabled: false,
      timeout: 30,
      requireConfirmation: true,
      allowPSBT: true,
      allowAddress: true,
      allowXpub: true,
      allowMessage: true,
      ...settings,
    };
  }

  /**
   * Check if NFC is available (Coldcard Q only)
   */
  async isAvailable(): Promise<boolean> {
    // NFC availability would be determined by device model
    // For now, return based on enabled state
    return this.settings.enabled;
  }

  /**
   * Enable NFC
   */
  async enable(): Promise<boolean> {
    this.enabled = true;
    this.settings.enabled = true;
    return true;
  }

  /**
   * Disable NFC
   */
  async disable(): Promise<boolean> {
    this.enabled = false;
    this.settings.enabled = false;
    return true;
  }

  /**
   * Get NFC status
   */
  async getStatus(): Promise<NFCStatus> {
    return {
      enabled: this.enabled,
      available: true, // Would check actual hardware
      connected: false,
      model: 'Q',
      timeout: this.settings.timeout,
    };
  }

  /**
   * Get NFC settings
   */
  getSettings(): NFCSettings {
    return { ...this.settings };
  }

  /**
   * Update NFC settings
   */
  async updateSettings(settings: Partial<NFCSettings>): Promise<NFCSettings> {
    this.settings = { ...this.settings, ...settings };
    this.enabled = this.settings.enabled;
    this.timeout = this.settings.timeout * 1000;
    return this.settings;
  }

  /**
   * Wait for NFC tap
   */
  async waitForTap(timeoutMs?: number): Promise<NFCEvent> {
    const timeout = timeoutMs || this.timeout;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('NFC tap timeout'));
      }, timeout);

      // In real implementation, this would listen for NFC events
      // For now, return a timeout event
      clearTimeout(timer);
      resolve({
        type: 'timeout',
        timestamp: new Date(),
        error: 'NFC not connected - requires Coldcard Q hardware',
      });
    });
  }

  /**
   * Sign PSBT via NFC
   */
  async signPSBT(psbt: Buffer): Promise<NFCTransferResult> {
    if (!this.settings.allowPSBT) {
      return {
        success: false,
        type: NFCDataType.PSBT,
        data: Buffer.alloc(0),
        timestamp: new Date(),
        error: 'PSBT signing via NFC is disabled',
      };
    }

    // In real implementation, this would:
    // 1. Send PSBT to device via NFC
    // 2. Wait for user confirmation on device
    // 3. Receive signed PSBT back

    return {
      success: false,
      type: NFCDataType.PSBT,
      data: psbt,
      timestamp: new Date(),
      error: 'NFC signing requires Coldcard Q hardware connection',
    };
  }

  /**
   * Share address via NFC
   */
  async shareAddress(address: string): Promise<NFCTransferResult> {
    if (!this.settings.allowAddress) {
      return {
        success: false,
        type: NFCDataType.ADDRESS,
        data: '',
        timestamp: new Date(),
        error: 'Address sharing via NFC is disabled',
      };
    }

    return {
      success: false,
      type: NFCDataType.ADDRESS,
      data: address,
      timestamp: new Date(),
      error: 'NFC sharing requires Coldcard Q hardware connection',
    };
  }

  /**
   * Share xpub via NFC
   */
  async shareXpub(xpub: string): Promise<NFCTransferResult> {
    if (!this.settings.allowXpub) {
      return {
        success: false,
        type: NFCDataType.XPUB,
        data: '',
        timestamp: new Date(),
        error: 'xPub sharing via NFC is disabled',
      };
    }

    return {
      success: false,
      type: NFCDataType.XPUB,
      data: xpub,
      timestamp: new Date(),
      error: 'NFC sharing requires Coldcard Q hardware connection',
    };
  }

  /**
   * Share signature via NFC
   */
  async shareSignature(signature: string): Promise<NFCTransferResult> {
    return {
      success: false,
      type: NFCDataType.SIGNATURE,
      data: signature,
      timestamp: new Date(),
      error: 'NFC sharing requires Coldcard Q hardware connection',
    };
  }

  /**
   * Receive data via NFC
   */
  async receiveData(expectedType?: NFCDataType): Promise<NFCTransferResult> {
    return {
      success: false,
      type: expectedType || NFCDataType.UNKNOWN,
      data: Buffer.alloc(0),
      timestamp: new Date(),
      error: 'NFC receive requires Coldcard Q hardware connection',
    };
  }

  /**
   * Set event callback
   */
  onEvent(callback: (event: NFCEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Emit event
   */
  private emitEvent(event: NFCEvent): void {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  /**
   * Set timeout
   */
  setTimeout(seconds: number): void {
    this.timeout = seconds * 1000;
    this.settings.timeout = seconds;
  }

  /**
   * Get timeout in seconds
   */
  getTimeout(): number {
    return this.settings.timeout;
  }
}

/**
 * Create NFC handler instance
 */
export function createNFCHandler(settings?: Partial<NFCSettings>): NFCHandler {
  return new NFCHandler(settings);
}

/**
 * NFC NDEF Record types
 */
export const NDEF_TYPES = {
  TEXT: 'T',
  URI: 'U',
  SMART_POSTER: 'Sp',
  EXTERNAL: 'external',
};

/**
 * Coldcard NFC URIs
 */
export const COLDCARD_NFC_URIS = {
  ADDRESS: 'bitcoin:',
  PSBT: 'ur:crypto-psbt/',
  XPUB: 'ur:crypto-hdkey/',
  SIGNATURE: 'ur:crypto-signature/',
};
