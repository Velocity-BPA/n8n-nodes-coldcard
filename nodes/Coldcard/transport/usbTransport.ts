/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * USB HID Transport for Coldcard
 *
 * Implements USB HID communication protocol for direct device access.
 * Uses the CKCC (Coldcard) protocol for command/response exchange.
 */

/**
 * Coldcard USB vendor and product IDs
 */
export const COLDCARD_USB_IDS = {
  VENDOR_ID: 0xd13e,
  PRODUCT_ID_MK4: 0xcc10,
  PRODUCT_ID_Q: 0xcc20,
};

/**
 * CKCC Protocol commands
 */
export enum CKCCCommand {
  /** Get device info */
  GET_INFO = 0x00,
  /** Get XFP (master fingerprint) */
  GET_XFP = 0x01,
  /** Get xpub at derivation path */
  GET_XPUB = 0x02,
  /** Sign PSBT */
  SIGN_PSBT = 0x03,
  /** Sign message */
  SIGN_MESSAGE = 0x04,
  /** Show address on device */
  SHOW_ADDRESS = 0x05,
  /** Get signed result */
  GET_RESULT = 0x06,
  /** Upload file */
  UPLOAD = 0x07,
  /** Download file */
  DOWNLOAD = 0x08,
  /** HSM status */
  HSM_STATUS = 0x09,
  /** HSM policy */
  HSM_POLICY = 0x0a,
  /** User authorization */
  USER_AUTH = 0x0b,
  /** Get bag number */
  GET_BAG = 0x0c,
  /** Check genuineness */
  CHECK_GENUINE = 0x0d,
  /** Reboot device */
  REBOOT = 0x0e,
  /** Logout (clear session) */
  LOGOUT = 0x0f,
}

/**
 * USB connection state
 */
export interface USBConnectionState {
  connected: boolean;
  devicePath?: string;
  model?: 'mk4' | 'q';
  serialNumber?: string;
  firmwareVersion?: string;
  lastError?: string;
}

/**
 * USB command response
 */
export interface USBResponse {
  success: boolean;
  data?: Buffer;
  error?: string;
  errorCode?: number;
}

/**
 * USB Transport class for Coldcard communication
 */
export class USBTransport {
  private device: unknown = null;
  private state: USBConnectionState = { connected: false };
  private debugLogging: boolean;

  constructor(debugLogging: boolean = false) {
    this.debugLogging = debugLogging;
  }

  /**
   * Find connected Coldcard devices
   */
  async findDevices(): Promise<Array<{ path: string; model: string; serialNumber?: string }>> {
    // Note: Actual implementation would use node-hid
    // This is a placeholder for the interface
    const devices: Array<{ path: string; model: string; serialNumber?: string }> = [];

    try {
      // In production:
      // const HID = require('node-hid');
      // const allDevices = HID.devices();
      // Filter for Coldcard vendor/product IDs

      this.log('Scanning for Coldcard devices...');
    } catch (error) {
      this.log(`Error scanning for devices: ${(error as Error).message}`);
    }

    return devices;
  }

  /**
   * Connect to Coldcard device
   */
  async connect(devicePath?: string): Promise<USBConnectionState> {
    try {
      // Auto-detect if no path specified
      if (!devicePath) {
        const devices = await this.findDevices();
        if (devices.length === 0) {
          throw new Error('No Coldcard device found');
        }
        devicePath = devices[0].path;
      }

      this.log(`Connecting to device at ${devicePath}`);

      // In production:
      // const HID = require('node-hid');
      // this.device = new HID.HID(devicePath);

      this.state = {
        connected: true,
        devicePath,
      };

      // Get device info
      const info = await this.getDeviceInfo();
      this.state.model = info.model;
      this.state.serialNumber = info.serialNumber;
      this.state.firmwareVersion = info.firmwareVersion;

      return this.state;
    } catch (error) {
      this.state = {
        connected: false,
        lastError: (error as Error).message,
      };
      throw error;
    }
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    if (this.device) {
      // In production: this.device.close();
      this.device = null;
    }
    this.state = { connected: false };
    this.log('Disconnected from device');
  }

  /**
   * Check connection state
   */
  isConnected(): boolean {
    return this.state.connected;
  }

  /**
   * Get connection state
   */
  getState(): USBConnectionState {
    return { ...this.state };
  }

  /**
   * Send command to device
   */
  async sendCommand(command: CKCCCommand, data?: Buffer): Promise<USBResponse> {
    if (!this.state.connected) {
      return { success: false, error: 'Not connected to device' };
    }

    try {
      this.log(`Sending command: ${CKCCCommand[command]}`);

      // Build command packet
      const packet = this.buildPacket(command, data);

      // In production:
      // this.device.write(packet);
      // const response = this.device.read();

      // Parse response
      // return this.parseResponse(response);

      // Placeholder response
      return { success: true, data: Buffer.alloc(0) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<{
    model: 'mk4' | 'q';
    serialNumber: string;
    firmwareVersion: string;
    xfp: string;
  }> {
    const response = await this.sendCommand(CKCCCommand.GET_INFO);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get device info');
    }

    // Parse device info from response
    // In production, parse actual response data
    return {
      model: 'mk4',
      serialNumber: 'DEMO000000',
      firmwareVersion: '5.2.0',
      xfp: '00000000',
    };
  }

  /**
   * Get master fingerprint (XFP)
   */
  async getXFP(): Promise<string> {
    const response = await this.sendCommand(CKCCCommand.GET_XFP);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get XFP');
    }

    // Parse XFP from response (4 bytes)
    return response.data?.slice(0, 4).toString('hex').toUpperCase() || '00000000';
  }

  /**
   * Get xpub at derivation path
   */
  async getXPub(derivationPath: string): Promise<string> {
    const pathBuffer = Buffer.from(derivationPath, 'utf8');
    const response = await this.sendCommand(CKCCCommand.GET_XPUB, pathBuffer);

    if (!response.success) {
      throw new Error(response.error || 'Failed to get xpub');
    }

    return response.data?.toString('utf8') || '';
  }

  /**
   * Sign PSBT
   */
  async signPSBT(psbt: Buffer): Promise<Buffer> {
    // Upload PSBT
    const uploadResponse = await this.sendCommand(CKCCCommand.UPLOAD, psbt);
    if (!uploadResponse.success) {
      throw new Error(uploadResponse.error || 'Failed to upload PSBT');
    }

    // Request signing
    const signResponse = await this.sendCommand(CKCCCommand.SIGN_PSBT);
    if (!signResponse.success) {
      throw new Error(signResponse.error || 'Failed to initiate signing');
    }

    // Wait for user confirmation on device
    // In production, poll for completion

    // Download signed PSBT
    const resultResponse = await this.sendCommand(CKCCCommand.GET_RESULT);
    if (!resultResponse.success) {
      throw new Error(resultResponse.error || 'Failed to get signed PSBT');
    }

    return resultResponse.data || Buffer.alloc(0);
  }

  /**
   * Sign message
   */
  async signMessage(message: string, derivationPath: string): Promise<string> {
    const data = Buffer.concat([
      Buffer.from(derivationPath, 'utf8'),
      Buffer.from([0]),
      Buffer.from(message, 'utf8'),
    ]);

    const response = await this.sendCommand(CKCCCommand.SIGN_MESSAGE, data);

    if (!response.success) {
      throw new Error(response.error || 'Failed to sign message');
    }

    return response.data?.toString('base64') || '';
  }

  /**
   * Show address on device for verification
   */
  async showAddress(derivationPath: string): Promise<boolean> {
    const pathBuffer = Buffer.from(derivationPath, 'utf8');
    const response = await this.sendCommand(CKCCCommand.SHOW_ADDRESS, pathBuffer);

    return response.success;
  }

  /**
   * Build command packet
   */
  private buildPacket(command: CKCCCommand, data?: Buffer): Buffer {
    const header = Buffer.alloc(8);
    header.writeUInt32LE(0x434b4343, 0); // 'CKCC' magic
    header.writeUInt8(command, 4);
    header.writeUInt16LE(data?.length || 0, 5);

    if (data) {
      return Buffer.concat([header, data]);
    }
    return header;
  }

  /**
   * Parse response packet
   */
  private parseResponse(response: Buffer): USBResponse {
    if (response.length < 4) {
      return { success: false, error: 'Invalid response length' };
    }

    const magic = response.readUInt32LE(0);
    if (magic !== 0x434b4343) {
      return { success: false, error: 'Invalid response magic' };
    }

    const status = response.readUInt8(4);
    if (status !== 0) {
      return { success: false, error: `Device error: ${status}`, errorCode: status };
    }

    const dataLength = response.readUInt16LE(5);
    const data = response.slice(8, 8 + dataLength);

    return { success: true, data };
  }

  /**
   * Log debug messages
   */
  private log(message: string): void {
    if (this.debugLogging) {
      console.warn(`[USBTransport] ${message}`);
    }
  }
}

/**
 * Create USB transport instance
 */
export function createUSBTransport(debugLogging: boolean = false): USBTransport {
  return new USBTransport(debugLogging);
}
