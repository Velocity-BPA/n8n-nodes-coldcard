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
 * Coldcard File Credentials
 *
 * Configuration for file-based operations with Coldcard,
 * including PSBT files, backups, and wallet exports.
 */
export class ColdcardFile implements ICredentialType {
  name = 'coldcardFile';
  displayName = 'Coldcard File Settings';
  documentationUrl = 'https://coldcard.com/docs/';
  properties: INodeProperties[] = [
    {
      displayName: 'Import Directory',
      name: 'importDirectory',
      type: 'string',
      default: '',
      placeholder: '/home/user/coldcard/import',
      description: 'Directory for importing files to Coldcard (PSBTs, configs)',
      required: true,
    },
    {
      displayName: 'Export Directory',
      name: 'exportDirectory',
      type: 'string',
      default: '',
      placeholder: '/home/user/coldcard/export',
      description: 'Directory for files exported from Coldcard (signed PSBTs, backups)',
      required: true,
    },
    {
      displayName: 'Backup Directory',
      name: 'backupDirectory',
      type: 'string',
      default: '',
      placeholder: '/home/user/coldcard/backups',
      description: 'Directory for storing encrypted backups',
    },
    {
      displayName: 'File Naming Convention',
      name: 'fileNamingConvention',
      type: 'options',
      options: [
        {
          name: 'Timestamp',
          value: 'timestamp',
          description: 'Use timestamp prefix: YYYYMMDD_HHMMSS_filename',
        },
        {
          name: 'Sequential',
          value: 'sequential',
          description: 'Use sequential numbering: 001_filename',
        },
        {
          name: 'UUID',
          value: 'uuid',
          description: 'Use UUID prefix: uuid_filename',
        },
        {
          name: 'Original',
          value: 'original',
          description: 'Keep original filename',
        },
      ],
      default: 'timestamp',
      description: 'How to name exported files',
    },
    {
      displayName: 'Auto-Cleanup Signed PSBTs',
      name: 'autoCleanupSigned',
      type: 'boolean',
      default: false,
      description: 'Whether to automatically delete unsigned PSBTs after signing',
    },
    {
      displayName: 'Cleanup After Days',
      name: 'cleanupAfterDays',
      type: 'number',
      default: 30,
      description: 'Number of days to keep processed files before cleanup',
      displayOptions: {
        show: {
          autoCleanupSigned: [true],
        },
      },
    },
    {
      displayName: 'File Permissions',
      name: 'filePermissions',
      type: 'string',
      default: '0600',
      description: 'Unix file permissions for created files (octal)',
    },
    {
      displayName: 'Compress Backups',
      name: 'compressBackups',
      type: 'boolean',
      default: true,
      description: 'Whether to compress backup files with gzip',
    },
    {
      displayName: 'Verify File Hashes',
      name: 'verifyFileHashes',
      type: 'boolean',
      default: true,
      description: 'Whether to verify SHA256 hashes of transferred files',
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
