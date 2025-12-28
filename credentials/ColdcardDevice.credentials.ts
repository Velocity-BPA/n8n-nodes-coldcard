/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * Coldcard Device Credentials
 *
 * Supports multiple connection types for Coldcard hardware wallets:
 * - MicroSD Card (Air-gapped)
 * - USB HID
 * - NFC (Coldcard Q)
 * - Virtual Disk Mode
 */
export class ColdcardDevice implements ICredentialType {
  name = 'coldcardDevice';
  displayName = 'Coldcard Device';
  documentationUrl = 'https://coldcard.com/docs/';
  properties: INodeProperties[] = [
    {
      displayName: 'Connection Type',
      name: 'connectionType',
      type: 'options',
      options: [
        {
          name: 'MicroSD Card (Air-Gapped)',
          value: 'sdcard',
          description: 'Air-gapped operation via MicroSD card file transfer',
        },
        {
          name: 'USB HID',
          value: 'usb',
          description: 'Direct USB connection to Coldcard device',
        },
        {
          name: 'NFC (Coldcard Q)',
          value: 'nfc',
          description: 'NFC communication for Coldcard Q model',
        },
        {
          name: 'Virtual Disk',
          value: 'virtualdisk',
          description: 'Virtual disk mode for file-based operations',
        },
      ],
      default: 'sdcard',
      description: 'How to connect to the Coldcard device',
    },
    {
      displayName: 'Device Path',
      name: 'devicePath',
      type: 'string',
      default: '',
      placeholder: '/dev/hidraw0',
      description: 'USB device path (auto-detected if empty)',
      displayOptions: {
        show: {
          connectionType: ['usb'],
        },
      },
    },
    {
      displayName: 'SD Card Path',
      name: 'sdCardPath',
      type: 'string',
      default: '',
      placeholder: '/media/coldcard',
      description: 'Path to mounted MicroSD card',
      displayOptions: {
        show: {
          connectionType: ['sdcard'],
        },
      },
    },
    {
      displayName: 'Virtual Disk Path',
      name: 'virtualDiskPath',
      type: 'string',
      default: '',
      placeholder: '/media/COLDCARD',
      description: 'Path to Coldcard virtual disk mount point',
      displayOptions: {
        show: {
          connectionType: ['virtualdisk'],
        },
      },
    },
    {
      displayName: 'NFC Reader',
      name: 'nfcReader',
      type: 'string',
      default: '',
      placeholder: 'Auto-detect',
      description: 'NFC reader device identifier',
      displayOptions: {
        show: {
          connectionType: ['nfc'],
        },
      },
    },
    {
      displayName: 'NFC Timeout (Seconds)',
      name: 'nfcTimeout',
      type: 'number',
      default: 30,
      description: 'Timeout for NFC operations',
      displayOptions: {
        show: {
          connectionType: ['nfc'],
        },
      },
    },
    {
      displayName: 'Device Model',
      name: 'deviceModel',
      type: 'options',
      options: [
        {
          name: 'Coldcard Mk4',
          value: 'mk4',
        },
        {
          name: 'Coldcard Q',
          value: 'q',
        },
        {
          name: 'Auto-Detect',
          value: 'auto',
        },
      ],
      default: 'auto',
      description: 'Coldcard hardware model',
    },
    {
      displayName: 'HSM Policy File',
      name: 'hsmPolicyFile',
      type: 'string',
      default: '',
      placeholder: '/path/to/policy.json',
      description: 'Path to HSM policy configuration file (optional)',
    },
    {
      displayName: 'Enable Debug Logging',
      name: 'debugLogging',
      type: 'boolean',
      default: false,
      description: 'Whether to enable verbose debug logging for device communication',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'file://localhost',
      url: '/test',
    },
  };
}
