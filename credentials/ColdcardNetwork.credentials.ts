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
 * Coldcard Network Credentials
 *
 * Bitcoin network configuration for broadcasting transactions
 * and verifying addresses. Note: Coldcard itself is air-gapped,
 * but these settings are used for external verification and broadcasting.
 */
export class ColdcardNetwork implements ICredentialType {
  name = 'coldcardNetwork';
  displayName = 'Coldcard Network Settings';
  documentationUrl = 'https://coldcard.com/docs/';
  properties: INodeProperties[] = [
    {
      displayName: 'Bitcoin Network',
      name: 'network',
      type: 'options',
      options: [
        {
          name: 'Mainnet',
          value: 'mainnet',
          description: 'Bitcoin mainnet (real transactions)',
        },
        {
          name: 'Testnet',
          value: 'testnet',
          description: 'Bitcoin testnet (test transactions)',
        },
        {
          name: 'Signet',
          value: 'signet',
          description: 'Bitcoin signet (signed testnet)',
        },
        {
          name: 'Regtest',
          value: 'regtest',
          description: 'Bitcoin regtest (local development)',
        },
      ],
      default: 'mainnet',
      description: 'Bitcoin network for transaction verification',
    },
    {
      displayName: 'Electrum Server URL',
      name: 'electrumServerUrl',
      type: 'string',
      default: '',
      placeholder: 'ssl://electrum.blockstream.info:50002',
      description: 'Electrum server for balance and transaction queries',
    },
    {
      displayName: 'Electrum Server Port',
      name: 'electrumServerPort',
      type: 'number',
      default: 50002,
      description: 'Electrum server port (usually 50001 for TCP, 50002 for SSL)',
    },
    {
      displayName: 'Use SSL/TLS',
      name: 'useSSL',
      type: 'boolean',
      default: true,
      description: 'Whether to use SSL/TLS for Electrum connection',
    },
    {
      displayName: 'Block Explorer URL',
      name: 'blockExplorerUrl',
      type: 'string',
      default: 'https://mempool.space',
      placeholder: 'https://mempool.space',
      description: 'Block explorer for transaction verification',
    },
    {
      displayName: 'Fee Estimation Endpoint',
      name: 'feeEstimationEndpoint',
      type: 'string',
      default: 'https://mempool.space/api/v1/fees/recommended',
      description: 'API endpoint for fee estimation',
    },
    {
      displayName: 'Broadcast Endpoint',
      name: 'broadcastEndpoint',
      type: 'string',
      default: 'https://mempool.space/api/tx',
      description: 'API endpoint for broadcasting transactions',
    },
    {
      displayName: 'Custom Bitcoin Core RPC',
      name: 'customRpc',
      type: 'boolean',
      default: false,
      description: 'Whether to use custom Bitcoin Core RPC for broadcasting',
    },
    {
      displayName: 'Bitcoin Core RPC URL',
      name: 'bitcoinCoreRpcUrl',
      type: 'string',
      default: 'http://localhost:8332',
      description: 'Bitcoin Core RPC URL',
      displayOptions: {
        show: {
          customRpc: [true],
        },
      },
    },
    {
      displayName: 'Bitcoin Core RPC User',
      name: 'bitcoinCoreRpcUser',
      type: 'string',
      default: '',
      description: 'Bitcoin Core RPC username',
      displayOptions: {
        show: {
          customRpc: [true],
        },
      },
    },
    {
      displayName: 'Bitcoin Core RPC Password',
      name: 'bitcoinCoreRpcPassword',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Bitcoin Core RPC password',
      displayOptions: {
        show: {
          customRpc: [true],
        },
      },
    },
    {
      displayName: 'Timeout (Seconds)',
      name: 'timeout',
      type: 'number',
      default: 30,
      description: 'Timeout for network requests',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.blockExplorerUrl}}',
      url: '/api/blocks/tip/height',
      method: 'GET',
    },
  };
}
