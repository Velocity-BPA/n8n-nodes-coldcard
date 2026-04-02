/**
 * Copyright (c) 2026 Velocity BPA
 * Licensed under the Business Source License 1.1
 */

import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Coldcard } from '../nodes/Coldcard/Coldcard.node';

// Mock n8n-workflow
jest.mock('n8n-workflow', () => ({
  ...jest.requireActual('n8n-workflow'),
  NodeApiError: class NodeApiError extends Error {
    constructor(node: any, error: any) { super(error.message || 'API Error'); }
  },
  NodeOperationError: class NodeOperationError extends Error {
    constructor(node: any, message: string) { super(message); }
  },
}));

describe('Coldcard Node', () => {
  let node: Coldcard;

  beforeAll(() => {
    node = new Coldcard();
  });

  describe('Node Definition', () => {
    it('should have correct basic properties', () => {
      expect(node.description.displayName).toBe('Coldcard');
      expect(node.description.name).toBe('coldcard');
      expect(node.description.version).toBe(1);
      expect(node.description.inputs).toContain('main');
      expect(node.description.outputs).toContain('main');
    });

    it('should define 6 resources', () => {
      const resourceProp = node.description.properties.find(
        (p: any) => p.name === 'resource'
      );
      expect(resourceProp).toBeDefined();
      expect(resourceProp!.type).toBe('options');
      expect(resourceProp!.options).toHaveLength(6);
    });

    it('should have operation dropdowns for each resource', () => {
      const operations = node.description.properties.filter(
        (p: any) => p.name === 'operation'
      );
      expect(operations.length).toBe(6);
    });

    it('should require credentials', () => {
      expect(node.description.credentials).toBeDefined();
      expect(node.description.credentials!.length).toBeGreaterThan(0);
      expect(node.description.credentials![0].required).toBe(true);
    });

    it('should have parameters with proper displayOptions', () => {
      const params = node.description.properties.filter(
        (p: any) => p.displayOptions?.show?.resource
      );
      for (const param of params) {
        expect(param.displayOptions.show.resource).toBeDefined();
        expect(Array.isArray(param.displayOptions.show.resource)).toBe(true);
      }
    });
  });

  // Resource-specific tests
describe('DeviceInfo Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        apiKey: 'test-key', 
        baseUrl: 'https://coldcard.com/api/v1' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn()
      },
    };
  });

  it('should get device info successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      if (param === 'operation') return 'getDeviceInfo';
      if (param === 'deviceId') return 'device-123';
      return undefined;
    });

    const mockResponse = {
      device_id: 'device-123',
      model: 'Coldcard Mk4',
      firmware_version: '5.2.1',
      status: 'connected'
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const items = [{ json: {} }];
    const result = await executeDeviceInfoOperations.call(mockExecuteFunctions, items);

    expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://coldcard.com/api/v1/device/info',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      qs: { device_id: 'device-123' },
      json: true
    });
  });

  it('should get device status successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      if (param === 'operation') return 'getDeviceStatus';
      return undefined;
    });

    const mockResponse = {
      connected: true,
      devices: ['device-123'],
      last_seen: '2023-12-01T10:00:00Z'
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const items = [{ json: {} }];
    const result = await executeDeviceInfoOperations.call(mockExecuteFunctions, items);

    expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
  });

  it('should connect device successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      if (param === 'operation') return 'connectDevice';
      if (param === 'devicePath') return '/dev/ttyUSB0';
      return undefined;
    });

    const mockResponse = {
      success: true,
      device_id: 'device-123',
      status: 'connected'
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const items = [{ json: {} }];
    const result = await executeDeviceInfoOperations.call(mockExecuteFunctions, items);

    expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
  });

  it('should disconnect device successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      if (param === 'operation') return 'disconnectDevice';
      if (param === 'deviceId') return 'device-123';
      return undefined;
    });

    const mockResponse = {
      success: true,
      device_id: 'device-123',
      status: 'disconnected'
    };

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const items = [{ json: {} }];
    const result = await executeDeviceInfoOperations.call(mockExecuteFunctions, items);

    expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
  });

  it('should handle API errors with continueOnFail', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('getDeviceInfo');
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

    const items = [{ json: {} }];
    const result = await executeDeviceInfoOperations.call(mockExecuteFunctions, items);

    expect(result).toEqual([{ json: { error: 'API Error' }, pairedItem: { item: 0 } }]);
  });

  it('should throw error when continueOnFail is false', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('getDeviceInfo');
    mockExecuteFunctions.continueOnFail.mockReturnValue(false);
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

    const items = [{ json: {} }];
    await expect(executeDeviceInfoOperations.call(mockExecuteFunctions, items))
      .rejects.toThrow('API Error');
  });
});

describe('Wallet Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				baseUrl: 'https://coldcard.com/api/v1',
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Coldcard Test Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn(),
			},
		};
	});

	it('should create wallet successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('createWallet')
			.mockReturnValueOnce('Test Wallet')
			.mockReturnValueOnce('xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5')
			.mockReturnValueOnce("m/84'/0'/0'");

		const mockResponse = {
			id: 'wallet_123',
			name: 'Test Wallet',
			xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5',
			derivation_path: "m/84'/0'/0'",
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: mockResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should get all wallets successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getAllWallets')
			.mockReturnValueOnce(50)
			.mockReturnValueOnce(0);

		const mockResponse = {
			wallets: [
				{ id: 'wallet_1', name: 'Wallet 1' },
				{ id: 'wallet_2', name: 'Wallet 2' },
			],
			total: 2,
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: mockResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should get wallet by ID successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getWallet')
			.mockReturnValueOnce('wallet_123');

		const mockResponse = {
			id: 'wallet_123',
			name: 'Test Wallet',
			xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5',
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: mockResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should update wallet successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('updateWallet')
			.mockReturnValueOnce('wallet_123')
			.mockReturnValueOnce('Updated Wallet Name');

		const mockResponse = {
			id: 'wallet_123',
			name: 'Updated Wallet Name',
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: mockResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should delete wallet successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('deleteWallet')
			.mockReturnValueOnce('wallet_123');

		const mockResponse = { success: true };

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: mockResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should generate address successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('generateAddress')
			.mockReturnValueOnce('wallet_123')
			.mockReturnValueOnce(0);

		const mockResponse = {
			address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
			index: 0,
			wallet_id: 'wallet_123',
		};

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: mockResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should handle errors gracefully when continueOnFail is true', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getWallet');
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

		const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([
			{
				json: { error: 'API Error' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should throw error when continueOnFail is false', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getWallet');
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

		await expect(executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }])).rejects.toThrow('API Error');
	});
});

describe('Transaction Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        apiKey: 'test-key', 
        baseUrl: 'https://coldcard.com/api/v1' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn() 
      },
    };
  });

  test('createTransaction - success', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('createTransaction')
      .mockReturnValueOnce([{ txid: 'input1', vout: 0 }])
      .mockReturnValueOnce([{ address: 'bc1...', amount: 0.01 }])
      .mockReturnValueOnce(10);

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
      txid: 'new-tx-id',
      psbt: 'base64-psbt-data',
      fee: 2500
    });

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.txid).toBe('new-tx-id');
  });

  test('getAllTransactions - success', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getAllTransactions')
      .mockReturnValueOnce('wallet123')
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(0);

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
      transactions: [
        { txid: 'tx1', amount: 0.01, status: 'confirmed' },
        { txid: 'tx2', amount: 0.005, status: 'pending' }
      ],
      total: 2
    });

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.transactions).toHaveLength(2);
  });

  test('getTransaction - success', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getTransaction')
      .mockReturnValueOnce('tx123');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
      txid: 'tx123',
      amount: 0.01,
      status: 'confirmed',
      confirmations: 6
    });

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.txid).toBe('tx123');
  });

  test('signTransaction - success', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('signTransaction')
      .mockReturnValueOnce('tx123')
      .mockReturnValueOnce('psbt-base64-data');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
      txid: 'tx123',
      signed_psbt: 'signed-psbt-data',
      status: 'signed'
    });

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.status).toBe('signed');
  });

  test('broadcastTransaction - success', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('broadcastTransaction')
      .mockReturnValueOnce('tx123');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
      txid: 'tx123',
      broadcast_id: 'broadcast-123',
      status: 'broadcasted'
    });

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.status).toBe('broadcasted');
  });

  test('deleteTransaction - success', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('deleteTransaction')
      .mockReturnValueOnce('tx123');

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
      txid: 'tx123',
      deleted: true
    });

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.deleted).toBe(true);
  });

  test('error handling', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getTransaction');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValueOnce(new Error('API Error'));
    mockExecuteFunctions.continueOnFail.mockReturnValueOnce(true);

    const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);
    
    expect(result).toHaveLength(1);
    expect(result[0].json.error).toBe('API Error');
  });
});

describe('Multisig Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				baseUrl: 'https://coldcard.com/api/v1',
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Test Coldcard Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn(),
				requestWithAuthentication: jest.fn(),
			},
		};
	});

	describe('createMultisig operation', () => {
		it('should create multisig successfully', async () => {
			const mockResponse = {
				id: 'multisig_123',
				m: 2,
				n: 3,
				name: 'Test Multisig',
				status: 'active',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('createMultisig')
				.mockReturnValueOnce(2)
				.mockReturnValueOnce(3)
				.mockReturnValueOnce('xpub1\nxpub2\nxpub3')
				.mockReturnValueOnce('Test Multisig');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeMultisigOperations.call(
				mockExecuteFunctions,
				[{ json: {} }],
			);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://coldcard.com/api/v1/multisig',
				headers: {
					'Authorization': 'Bearer test-api-key',
					'Content-Type': 'application/json',
				},
				json: true,
				body: {
					m: 2,
					n: 3,
					cosigner_xpubs: ['xpub1', 'xpub2', 'xpub3'],
					name: 'Test Multisig',
				},
			});

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});

		it('should handle createMultisig error', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('createMultisig');
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await executeMultisigOperations.call(
				mockExecuteFunctions,
				[{ json: {} }],
			);

			expect(result[0].json.error).toBe('API Error');
		});
	});

	describe('getAllMultisig operation', () => {
		it('should get all multisig configurations successfully', async () => {
			const mockResponse = {
				multisigs: [
					{ id: 'multisig_1', name: 'Multisig 1' },
					{ id: 'multisig_2', name: 'Multisig 2' },
				],
				total: 2,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('getAllMultisig')
				.mockReturnValueOnce(50)
				.mockReturnValueOnce(0);

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeMultisigOperations.call(
				mockExecuteFunctions,
				[{ json: {} }],
			);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://coldcard.com/api/v1/multisig',
				headers: {
					'Authorization': 'Bearer test-api-key',
				},
				json: true,
				qs: {
					limit: 50,
					offset: 0,
				},
			});

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});

	describe('cosignTransaction operation', () => {
		it('should cosign transaction successfully', async () => {
			const mockResponse = {
				psbt_data: 'signed_psbt_data',
				status: 'partially_signed',
				signatures_count: 1,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('cosignTransaction')
				.mockReturnValueOnce('multisig_123')
				.mockReturnValueOnce('cHNidP8BAHUCAAAAASaBcTce...');

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeMultisigOperations.call(
				mockExecuteFunctions,
				[{ json: {} }],
			);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://coldcard.com/api/v1/multisig/multisig_123/cosign',
				headers: {
					'Authorization': 'Bearer test-api-key',
					'Content-Type': 'application/json',
				},
				json: true,
				body: {
					psbt_data: 'cHNidP8BAHUCAAAAASaBcTce...',
				},
			});

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});
});

describe('Backup Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				baseUrl: 'https://coldcard.com/api/v1',
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn(),
				requestWithAuthentication: jest.fn(),
			},
		};
	});

	it('should create backup successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('createBackup')
			.mockReturnValueOnce('test-password')
			.mockReturnValueOnce(true);

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			backup_id: 'backup-123',
			status: 'created',
		});

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'POST',
			url: 'https://coldcard.com/api/v1/backup/create',
			headers: {
				'Authorization': 'Bearer test-api-key',
				'Content-Type': 'application/json',
			},
			body: {
				password: 'test-password',
				include_settings: true,
			},
			json: true,
		});

		expect(result).toEqual([{
			json: { backup_id: 'backup-123', status: 'created' },
			pairedItem: { item: 0 },
		}]);
	});

	it('should handle create backup error', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('createBackup')
			.mockReturnValueOnce('test-password')
			.mockReturnValueOnce(true);

		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(result).toEqual([{
			json: { error: 'API Error' },
			pairedItem: { item: 0 },
		}]);
	});

	it('should get all backups successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getAllBackups')
			.mockReturnValueOnce(10)
			.mockReturnValueOnce(0);

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			backups: [{ id: 'backup-1' }, { id: 'backup-2' }],
			total: 2,
		});

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://coldcard.com/api/v1/backup',
			headers: {
				'Authorization': 'Bearer test-api-key',
			},
			qs: {
				limit: 10,
				offset: 0,
			},
			json: true,
		});

		expect(result).toEqual([{
			json: { backups: [{ id: 'backup-1' }, { id: 'backup-2' }], total: 2 },
			pairedItem: { item: 0 },
		}]);
	});

	it('should get specific backup successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getBackup')
			.mockReturnValueOnce('backup-123');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			backup_id: 'backup-123',
			data: 'encrypted-backup-data',
		});

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://coldcard.com/api/v1/backup/backup-123',
			headers: {
				'Authorization': 'Bearer test-api-key',
			},
			json: true,
		});

		expect(result).toEqual([{
			json: { backup_id: 'backup-123', data: 'encrypted-backup-data' },
			pairedItem: { item: 0 },
		}]);
	});

	it('should restore backup successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('restoreBackup')
			.mockReturnValueOnce('backup-data-base64')
			.mockReturnValueOnce('restore-password');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			status: 'restored',
			message: 'Backup restored successfully',
		});

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'POST',
			url: 'https://coldcard.com/api/v1/backup/restore',
			headers: {
				'Authorization': 'Bearer test-api-key',
				'Content-Type': 'application/json',
			},
			body: {
				backup_data: 'backup-data-base64',
				password: 'restore-password',
			},
			json: true,
		});

		expect(result).toEqual([{
			json: { status: 'restored', message: 'Backup restored successfully' },
			pairedItem: { item: 0 },
		}]);
	});

	it('should delete backup successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('deleteBackup')
			.mockReturnValueOnce('backup-123');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			status: 'deleted',
			message: 'Backup deleted successfully',
		});

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'DELETE',
			url: 'https://coldcard.com/api/v1/backup/backup-123',
			headers: {
				'Authorization': 'Bearer test-api-key',
			},
			json: true,
		});

		expect(result).toEqual([{
			json: { status: 'deleted', message: 'Backup deleted successfully' },
			pairedItem: { item: 0 },
		}]);
	});

	it('should verify backup successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('verifyBackup')
			.mockReturnValueOnce('backup-data-base64')
			.mockReturnValueOnce('verify-password');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			valid: true,
			message: 'Backup is valid',
		});

		const result = await executeBackupOperations.call(mockExecuteFunctions, [{ json: {} }]);

		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'POST',
			url: 'https://coldcard.com/api/v1/backup/verify',
			headers: {
				'Authorization': 'Bearer test-api-key',
				'Content-Type': 'application/json',
			},
			body: {
				backup_data: 'backup-data-base64',
				password: 'verify-password',
			},
			json: true,
		});

		expect(result).toEqual([{
			json: { valid: true, message: 'Backup is valid' },
			pairedItem: { item: 0 },
		}]);
	});
});

describe('HSM Resource', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-key',
				baseUrl: 'https://coldcard.com/api/v1',
			}),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn(),
				requestWithAuthentication: jest.fn(),
			},
		};
	});

	describe('createPolicy operation', () => {
		it('should create a policy successfully', async () => {
			const mockResponse = { id: 'policy123', name: 'test-policy', status: 'created' };
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('createPolicy')
				.mockReturnValueOnce('test-policy')
				.mockReturnValueOnce('{"rule1": "value1"}')
				.mockReturnValueOnce('{"condition1": "value1"}');
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://coldcard.com/api/v1/hsm/policies',
				headers: {
					'Authorization': 'Bearer test-key',
					'Content-Type': 'application/json',
				},
				body: {
					policy_name: 'test-policy',
					rules: { rule1: 'value1' },
					conditions: { condition1: 'value1' },
				},
				json: true,
			});
		});

		it('should handle errors when creating policy', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('createPolicy');
			mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: { error: 'API Error' }, pairedItem: { item: 0 } }]);
		});
	});

	describe('getAllPolicies operation', () => {
		it('should get all policies successfully', async () => {
			const mockResponse = { policies: [], total: 0 };
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('getAllPolicies')
				.mockReturnValueOnce(50)
				.mockReturnValueOnce(0);
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});

	describe('getPolicy operation', () => {
		it('should get specific policy successfully', async () => {
			const mockResponse = { id: 'policy123', name: 'test-policy' };
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('getPolicy')
				.mockReturnValueOnce('policy123');
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});

	describe('updatePolicy operation', () => {
		it('should update policy successfully', async () => {
			const mockResponse = { id: 'policy123', status: 'updated' };
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('updatePolicy')
				.mockReturnValueOnce('policy123')
				.mockReturnValueOnce('{"rule1": "updated_value"}');
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});

	describe('deletePolicy operation', () => {
		it('should delete policy successfully', async () => {
			const mockResponse = { status: 'deleted' };
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('deletePolicy')
				.mockReturnValueOnce('policy123');
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});

	describe('authorizeOperation operation', () => {
		it('should authorize operation successfully', async () => {
			const mockResponse = { authorized: true, token: 'auth-token' };
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('authorizeOperation')
				.mockReturnValueOnce('sign_transaction')
				.mockReturnValueOnce('{"amount": 1000}');
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

			const result = await executeHSMOperations.call(mockExecuteFunctions, [{ json: {} }]);

			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});
	});
});
});
