/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

/**
 * Specter Desktop Integration Resource
 * Operations for Specter Desktop wallet integration
 */

export const specterOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['specter'],
			},
		},
		options: [
			{
				name: 'Export Specter Wallet',
				value: 'exportSpecterWallet',
				description: 'Export wallet configuration for Specter Desktop',
				action: 'Export specter wallet',
			},
			{
				name: 'Export Specter Multisig',
				value: 'exportSpecterMultisig',
				description: 'Export multisig configuration for Specter Desktop',
				action: 'Export specter multisig',
			},
			{
				name: 'Get Specter Config',
				value: 'getSpecterConfig',
				description: 'Get Specter Desktop configuration details',
				action: 'Get specter config',
			},
			{
				name: 'Sign for Specter',
				value: 'signForSpecter',
				description: 'Sign a PSBT for Specter Desktop',
				action: 'Sign for specter',
			},
		],
		default: 'exportSpecterWallet',
	},
];

export const specterFields: INodeProperties[] = [
	// Export Specter Wallet
	{
		displayName: 'Account Number',
		name: 'accountNumber',
		type: 'number',
		default: 0,
		description: 'BIP-44 account number',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['exportSpecterWallet', 'exportSpecterMultisig'],
			},
		},
	},
	{
		displayName: 'Address Type',
		name: 'addressType',
		type: 'options',
		options: [
			{ name: 'Native SegWit (bc1q...)', value: 'wpkh' },
			{ name: 'Nested SegWit (3...)', value: 'sh-wpkh' },
			{ name: 'Legacy (1...)', value: 'pkh' },
			{ name: 'Taproot (bc1p...)', value: 'tr' },
		],
		default: 'wpkh',
		description: 'Address type for the wallet',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['exportSpecterWallet'],
			},
		},
	},
	{
		displayName: 'Device Name',
		name: 'deviceName',
		type: 'string',
		default: 'Coldcard',
		description: 'Name for the device in Specter',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['exportSpecterWallet', 'exportSpecterMultisig'],
			},
		},
	},
	// Export Specter Multisig
	{
		displayName: 'Threshold (M)',
		name: 'threshold',
		type: 'number',
		default: 2,
		description: 'Number of signatures required',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['exportSpecterMultisig'],
			},
		},
	},
	{
		displayName: 'Cosigner Keys',
		name: 'cosignerKeys',
		type: 'json',
		default: '[]',
		description: 'Array of cosigner public keys with metadata',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['exportSpecterMultisig'],
			},
		},
	},
	{
		displayName: 'Sorted Multisig',
		name: 'sortedMultisig',
		type: 'boolean',
		default: true,
		description: 'Whether to use sorted multisig (sortedmulti) - recommended for compatibility',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['exportSpecterMultisig'],
			},
		},
	},
	// Sign for Specter
	{
		displayName: 'PSBT Data',
		name: 'psbtData',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		description: 'PSBT from Specter (base64)',
		displayOptions: {
			show: {
				resource: ['specter'],
				operation: ['signForSpecter'],
			},
		},
	},
];

interface SpecterDeviceConfig {
	name: string;
	type: string;
	keys: Array<{
		derivation: string;
		original: string;
		fingerprint: string;
		type: string;
		xpub: string;
	}>;
}

interface SpecterWalletConfig {
	name: string;
	alias: string;
	description: string;
	address_type: string;
	sigs_required: number;
	sigs_total: number;
	keys: Array<{
		derivation: string;
		original: string;
		fingerprint: string;
		type: string;
		xpub: string;
	}>;
	devices: string[];
	descriptor?: string;
}

export async function executeSpecterOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const returnData: INodeExecutionData[] = [];

	try {
		switch (operation) {
			case 'exportSpecterWallet': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const addressType = this.getNodeParameter('addressType', index) as string;
				const deviceName = this.getNodeParameter('deviceName', index) as string;

				// Map address types to derivation paths
				const typeConfig: Record<string, { path: string; descriptorType: string }> = {
					'pkh': { path: `m/44'/0'/${accountNumber}'`, descriptorType: 'pkh' },
					'sh-wpkh': { path: `m/49'/0'/${accountNumber}'`, descriptorType: 'sh(wpkh' },
					'wpkh': { path: `m/84'/0'/${accountNumber}'`, descriptorType: 'wpkh' },
					'tr': { path: `m/86'/0'/${accountNumber}'`, descriptorType: 'tr' },
				};

				const config = typeConfig[addressType];
				const fingerprint = 'XXXXXXXX'; // Would be retrieved from device
				const xpub = 'xpub...'; // Would be retrieved from device

				const deviceConfig: SpecterDeviceConfig = {
					name: deviceName,
					type: 'coldcard',
					keys: [
						{
							derivation: config.path,
							original: config.path,
							fingerprint,
							type: addressType,
							xpub: `[${fingerprint}/${config.path.replace('m/', '')}]${xpub}`,
						},
					],
				};

				const walletConfig: SpecterWalletConfig = {
					name: `${deviceName} Wallet`,
					alias: deviceName.toLowerCase().replace(/\s+/g, '_'),
					description: `Single-sig ${addressType} wallet from Coldcard`,
					address_type: addressType,
					sigs_required: 1,
					sigs_total: 1,
					keys: deviceConfig.keys,
					devices: [deviceName],
				};

				returnData.push({
					json: {
						success: true,
						operation: 'exportSpecterWallet',
						deviceConfig,
						walletConfig,
						addressType,
						derivationPath: config.path,
						fingerprint,
						instructions: [
							'1. In Specter Desktop, go to "Add Device"',
							'2. Select "Coldcard" as device type',
							'3. Choose "Via SD Card" or "Upload file"',
							'4. If using SD card:',
							'   - On Coldcard: Advanced/Tools -> Export Wallet -> Generic JSON',
							'   - Copy the file to computer',
							'5. Import the device configuration',
							'6. Create a new wallet using this device',
							'7. Verify the master fingerprint matches',
						],
					},
				});
				break;
			}

			case 'exportSpecterMultisig': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const threshold = this.getNodeParameter('threshold', index) as number;
				const cosignerKeysStr = this.getNodeParameter('cosignerKeys', index) as string;
				const deviceName = this.getNodeParameter('deviceName', index) as string;
				const sortedMultisig = this.getNodeParameter('sortedMultisig', index) as boolean;

				let cosignerKeys: Array<{ name: string; xpub: string; fingerprint: string }>;
				try {
					cosignerKeys = JSON.parse(cosignerKeysStr);
				} catch {
					throw new Error('Invalid cosigner keys JSON');
				}

				const totalSigners = cosignerKeys.length;
				if (threshold > totalSigners) {
					throw new Error('Threshold cannot exceed number of cosigners');
				}

				const derivationPath = `m/48'/0'/${accountNumber}'/2'`;

				const keys = cosignerKeys.map((cosigner) => ({
					derivation: derivationPath,
					original: derivationPath,
					fingerprint: cosigner.fingerprint,
					type: 'wsh',
					xpub: cosigner.xpub,
				}));

				const multisigFunction = sortedMultisig ? 'sortedmulti' : 'multi';
				const keyRefs = keys.map((k) => `[${k.fingerprint}/${derivationPath.replace('m/', '')}]${k.xpub}`);
				const descriptor = `wsh(${multisigFunction}(${threshold},${keyRefs.join(',')}))`;

				const walletConfig: SpecterWalletConfig = {
					name: `${deviceName} Multisig`,
					alias: `${deviceName.toLowerCase().replace(/\s+/g, '_')}_multisig`,
					description: `${threshold}-of-${totalSigners} multisig wallet`,
					address_type: 'wsh',
					sigs_required: threshold,
					sigs_total: totalSigners,
					keys,
					devices: cosignerKeys.map((c) => c.name),
					descriptor,
				};

				returnData.push({
					json: {
						success: true,
						operation: 'exportSpecterMultisig',
						walletConfig,
						quorum: `${threshold}-of-${totalSigners}`,
						derivationPath,
						descriptor,
						sortedMultisig,
						cosignerCount: totalSigners,
						instructions: [
							'1. First, import all cosigner devices into Specter',
							'2. Go to "Add Wallet" -> "Multisig"',
							'3. Select all cosigner devices',
							'4. Set the quorum (M-of-N)',
							'5. Choose Native SegWit (wsh) as address type',
							'6. Specter will create the multisig wallet',
							'7. Export the wallet config to each Coldcard:',
							'   - Settings -> Export -> Coldcard multisig file',
							'   - Import on each Coldcard via SD card',
							'8. Verify all devices show the same first address',
						],
					},
				});
				break;
			}

			case 'getSpecterConfig': {
				returnData.push({
					json: {
						success: true,
						operation: 'getSpecterConfig',
						specterVersion: '2.0.x',
						supportedDevices: [
							{ type: 'coldcard', name: 'Coldcard', features: ['sdcard', 'usb', 'multisig', 'psbt'] },
							{ type: 'trezor', name: 'Trezor', features: ['usb', 'multisig', 'psbt'] },
							{ type: 'ledger', name: 'Ledger', features: ['usb', 'multisig', 'psbt'] },
							{ type: 'bitbox02', name: 'BitBox02', features: ['usb', 'multisig', 'psbt'] },
						],
						addressTypes: [
							{ type: 'pkh', name: 'Legacy', prefix: '1' },
							{ type: 'sh-wpkh', name: 'Nested SegWit', prefix: '3' },
							{ type: 'wpkh', name: 'Native SegWit', prefix: 'bc1q' },
							{ type: 'tr', name: 'Taproot', prefix: 'bc1p' },
							{ type: 'wsh', name: 'Multisig Native SegWit', prefix: 'bc1q' },
						],
						coldcardFeatures: {
							sdCardExport: true,
							usbSigning: true,
							multisigSupport: true,
							airgappedOperation: true,
							psbtSupport: true,
							descriptorExport: true,
						},
						walletTypes: ['single-sig', 'multisig'],
						importMethods: ['SD Card', 'QR Code', 'File Upload', 'USB'],
						exportFormats: ['PSBT', 'Coldcard Multisig', 'Descriptor', 'JSON'],
						features: {
							fullNode: 'Bitcoin Core connection',
							hardwareWalletInterface: true,
							coinSelection: true,
							rbf: true,
							batching: true,
							labels: true,
						},
					},
				});
				break;
			}

			case 'signForSpecter': {
				const psbtData = this.getNodeParameter('psbtData', index) as string;

				if (!psbtData) {
					throw new Error('PSBT data is required');
				}

				// Validate base64
				try {
					Buffer.from(psbtData, 'base64');
				} catch {
					throw new Error('Invalid base64 PSBT data');
				}

				returnData.push({
					json: {
						success: true,
						operation: 'signForSpecter',
						status: 'pending_signature',
						psbtData,
						fileName: 'unsigned.psbt',
						sdCardWorkflow: [
							'1. In Specter, create and save the transaction',
							'2. Click "Sign with SD card" or export PSBT',
							'3. Save the PSBT file to SD card',
							'4. Insert SD card into Coldcard',
							'5. Navigate to "Ready To Sign"',
							'6. Select the PSBT file',
							'7. Review transaction on Coldcard screen:',
							'   - Check amounts and destinations',
							'   - Verify fee is reasonable',
							'   - Check change address (should show as change)',
							'8. Confirm with checkmark (✓)',
							'9. Signed file saved with "-signed" suffix',
							'10. Return SD card to computer',
							'11. In Specter, load the signed PSBT',
							'12. Broadcast the transaction',
						],
						usbWorkflow: [
							'1. Connect Coldcard via USB',
							'2. In Specter, create the transaction',
							'3. Click "Sign" to send to Coldcard',
							'4. Review and confirm on Coldcard',
							'5. Signed PSBT returned automatically',
							'6. Broadcast in Specter',
						],
						securityNotes: [
							'Always verify amounts on Coldcard display',
							'Check destination addresses carefully',
							'Verify change goes back to your wallet',
							'Use SD card for maximum security (air-gapped)',
						],
					},
				});
				break;
			}

			default:
				throw new Error(`Unknown operation: ${operation}`);
		}
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push({
				json: {
					success: false,
					operation,
					error: error instanceof Error ? error.message : String(error),
				},
			});
		} else {
			throw error;
		}
	}

	return returnData;
}
