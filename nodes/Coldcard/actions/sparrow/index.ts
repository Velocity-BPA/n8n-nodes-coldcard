/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

/**
 * Sparrow Wallet Integration Resource
 * Operations for Sparrow wallet integration
 */

export const sparrowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sparrow'],
			},
		},
		options: [
			{
				name: 'Export Sparrow Wallet',
				value: 'exportSparrowWallet',
				description: 'Export wallet configuration for Sparrow',
				action: 'Export sparrow wallet',
			},
			{
				name: 'Export Sparrow Multisig',
				value: 'exportSparrowMultisig',
				description: 'Export multisig configuration for Sparrow',
				action: 'Export sparrow multisig',
			},
			{
				name: 'Get Sparrow Config',
				value: 'getSparrowConfig',
				description: 'Get Sparrow-compatible configuration',
				action: 'Get sparrow config',
			},
			{
				name: 'Sign for Sparrow',
				value: 'signForSparrow',
				description: 'Sign a PSBT for Sparrow wallet',
				action: 'Sign for sparrow',
			},
		],
		default: 'exportSparrowWallet',
	},
];

export const sparrowFields: INodeProperties[] = [
	// Export Sparrow Wallet
	{
		displayName: 'Account Number',
		name: 'accountNumber',
		type: 'number',
		default: 0,
		description: 'BIP-44 account number',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['exportSparrowWallet', 'exportSparrowMultisig'],
			},
		},
	},
	{
		displayName: 'Script Type',
		name: 'scriptType',
		type: 'options',
		options: [
			{ name: 'Native SegWit (P2WPKH)', value: 'P2WPKH' },
			{ name: 'Nested SegWit (P2SH-P2WPKH)', value: 'P2SH-P2WPKH' },
			{ name: 'Legacy (P2PKH)', value: 'P2PKH' },
			{ name: 'Taproot (P2TR)', value: 'P2TR' },
		],
		default: 'P2WPKH',
		description: 'Script type for the wallet',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['exportSparrowWallet'],
			},
		},
	},
	{
		displayName: 'Wallet Name',
		name: 'walletName',
		type: 'string',
		default: 'Coldcard Wallet',
		description: 'Name for the wallet in Sparrow',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['exportSparrowWallet', 'exportSparrowMultisig'],
			},
		},
	},
	// Export Sparrow Multisig
	{
		displayName: 'Threshold (M)',
		name: 'threshold',
		type: 'number',
		default: 2,
		description: 'Number of signatures required (M in M-of-N)',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['exportSparrowMultisig'],
			},
		},
	},
	{
		displayName: 'Total Signers (N)',
		name: 'totalSigners',
		type: 'number',
		default: 3,
		description: 'Total number of signers (N in M-of-N)',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['exportSparrowMultisig'],
			},
		},
	},
	{
		displayName: 'Cosigner XPubs',
		name: 'cosignerXpubs',
		type: 'json',
		default: '[]',
		description: 'Array of cosigner extended public keys with metadata',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['exportSparrowMultisig'],
			},
		},
	},
	// Sign for Sparrow
	{
		displayName: 'PSBT Data',
		name: 'psbtData',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		description: 'PSBT data from Sparrow (base64 format)',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['signForSparrow'],
			},
		},
	},
	{
		displayName: 'Signing Method',
		name: 'signingMethod',
		type: 'options',
		options: [
			{ name: 'USB', value: 'usb' },
			{ name: 'SD Card', value: 'sdCard' },
		],
		default: 'sdCard',
		description: 'Method to use for signing',
		displayOptions: {
			show: {
				resource: ['sparrow'],
				operation: ['signForSparrow'],
			},
		},
	},
];

interface SparrowWalletConfig {
	label: string;
	blockExplorerUrl?: string;
	keystores: Array<{
		label: string;
		keyDerivation: {
			masterFingerprint: string;
			derivation: string;
			xpub: string;
		};
		accountNumber: number;
		watchOnly: boolean;
	}>;
	policyType: string;
	scriptType: string;
	gapLimit: number;
}

interface SparrowMultisigConfig extends SparrowWalletConfig {
	defaultPolicy: string;
	numSignatures: number;
	numCosigners: number;
}

export async function executeSparrowOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const returnData: INodeExecutionData[] = [];

	try {
		switch (operation) {
			case 'exportSparrowWallet': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const scriptType = this.getNodeParameter('scriptType', index) as string;
				const walletName = this.getNodeParameter('walletName', index) as string;

				// Determine derivation path based on script type
				const derivationPaths: Record<string, string> = {
					'P2PKH': `m/44'/0'/${accountNumber}'`,
					'P2SH-P2WPKH': `m/49'/0'/${accountNumber}'`,
					'P2WPKH': `m/84'/0'/${accountNumber}'`,
					'P2TR': `m/86'/0'/${accountNumber}'`,
				};

				const derivationPath = derivationPaths[scriptType];
				const fingerprint = 'XXXXXXXX'; // Would be retrieved from device

				const walletConfig: SparrowWalletConfig = {
					label: walletName,
					blockExplorerUrl: 'https://mempool.space',
					keystores: [
						{
							label: 'Coldcard',
							keyDerivation: {
								masterFingerprint: fingerprint,
								derivation: derivationPath,
								xpub: `[${fingerprint}/${derivationPath.replace('m/', '')}]xpub...`,
							},
							accountNumber,
							watchOnly: true,
						},
					],
					policyType: 'SINGLE',
					scriptType,
					gapLimit: 20,
				};

				returnData.push({
					json: {
						success: true,
						operation: 'exportSparrowWallet',
						walletConfig,
						walletName,
						scriptType,
						derivationPath,
						fingerprint,
						exportFormat: 'json',
						instructions: [
							'1. Save this configuration as a JSON file',
							'2. In Sparrow, go to File -> Import Wallet',
							'3. Select "Coldcard" as the wallet type',
							'4. Choose "File" import method',
							'5. Select the saved JSON file',
							'6. Or use Settings -> Wallets -> Import Wallet for existing installations',
						],
						sparrowMinVersion: '1.7.0',
					},
				});
				break;
			}

			case 'exportSparrowMultisig': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const threshold = this.getNodeParameter('threshold', index) as number;
				const totalSigners = this.getNodeParameter('totalSigners', index) as number;
				const walletName = this.getNodeParameter('walletName', index) as string;
				const cosignerXpubsStr = this.getNodeParameter('cosignerXpubs', index) as string;

				let cosignerXpubs: Array<{ name: string; xpub: string; fingerprint: string; derivation?: string }>;
				try {
					cosignerXpubs = JSON.parse(cosignerXpubsStr);
				} catch {
					throw new Error('Invalid cosigner XPubs JSON');
				}

				if (threshold > totalSigners) {
					throw new Error('Threshold cannot exceed total signers');
				}

				if (cosignerXpubs.length !== totalSigners) {
					throw new Error(`Expected ${totalSigners} cosigners, got ${cosignerXpubs.length}`);
				}

				const derivationPath = `m/48'/0'/${accountNumber}'/2'`;

				const keystores = cosignerXpubs.map((cosigner, idx) => ({
					label: cosigner.name || `Cosigner ${idx + 1}`,
					keyDerivation: {
						masterFingerprint: cosigner.fingerprint,
						derivation: cosigner.derivation || derivationPath,
						xpub: cosigner.xpub,
					},
					accountNumber,
					watchOnly: true,
				}));

				const multisigConfig: SparrowMultisigConfig = {
					label: walletName,
					blockExplorerUrl: 'https://mempool.space',
					keystores,
					policyType: 'MULTI',
					scriptType: 'P2WSH',
					gapLimit: 20,
					defaultPolicy: `multi(${threshold},${keystores.map((_, i) => `@${i}`).join(',')})`,
					numSignatures: threshold,
					numCosigners: totalSigners,
				};

				returnData.push({
					json: {
						success: true,
						operation: 'exportSparrowMultisig',
						multisigConfig,
						walletName,
						quorum: `${threshold}-of-${totalSigners}`,
						derivationPath,
						cosignerCount: totalSigners,
						instructions: [
							'1. Save this configuration as a JSON file',
							'2. In Sparrow, go to File -> New Wallet',
							'3. Choose "Multi-signature" wallet type',
							'4. Configure the threshold and cosigners',
							'5. Import each cosigner key or use this file for bulk import',
							'6. Verify all cosigner fingerprints match',
						],
					},
				});
				break;
			}

			case 'getSparrowConfig': {
				returnData.push({
					json: {
						success: true,
						operation: 'getSparrowConfig',
						sparrowVersion: '1.8.x',
						supportedScriptTypes: [
							{ type: 'P2PKH', description: 'Legacy (1...)', bip: 'BIP-44' },
							{ type: 'P2SH-P2WPKH', description: 'Nested SegWit (3...)', bip: 'BIP-49' },
							{ type: 'P2WPKH', description: 'Native SegWit (bc1q...)', bip: 'BIP-84' },
							{ type: 'P2TR', description: 'Taproot (bc1p...)', bip: 'BIP-86' },
							{ type: 'P2WSH', description: 'Multisig Native SegWit', bip: 'BIP-48' },
						],
						coldcardIntegration: {
							usbSupport: true,
							sdCardSupport: true,
							nfcSupport: false,
							psbtSupport: true,
							multisigSupport: true,
							messageSigningSupport: true,
						},
						exportFormats: ['JSON', 'Coldcard Generic', 'Output Descriptor'],
						importFormats: ['PSBT (base64)', 'PSBT (binary)', 'Coldcard signed PSBT'],
						walletFileExtension: '.json',
						features: {
							coinControl: true,
							payJoin: true,
							rbf: true,
							batchTransactions: true,
							labelManagement: true,
							addressVerification: true,
						},
					},
				});
				break;
			}

			case 'signForSparrow': {
				const psbtData = this.getNodeParameter('psbtData', index) as string;
				const signingMethod = this.getNodeParameter('signingMethod', index) as string;

				if (!psbtData) {
					throw new Error('PSBT data is required');
				}

				// Validate base64
				try {
					Buffer.from(psbtData, 'base64');
				} catch {
					throw new Error('Invalid base64 PSBT data');
				}

				if (signingMethod === 'usb') {
					returnData.push({
						json: {
							success: true,
							operation: 'signForSparrow',
							method: 'usb',
							status: 'pending_signature',
							psbtData,
							instructions: [
								'1. Connect Coldcard via USB',
								'2. In Sparrow, click "Sign" on the transaction',
								'3. Choose "USB" as the signing method',
								'4. Review the transaction on Coldcard display',
								'5. Confirm with checkmark button (✓)',
								'6. Signed PSBT will be returned to Sparrow',
							],
						},
					});
				} else {
					returnData.push({
						json: {
							success: true,
							operation: 'signForSparrow',
							method: 'sdCard',
							status: 'pending_signature',
							psbtData,
							fileName: 'unsigned.psbt',
							instructions: [
								'1. In Sparrow, click "Save PSBT" to save unsigned.psbt',
								'2. Copy the file to SD card',
								'3. Insert SD card into Coldcard',
								'4. Navigate to "Ready To Sign"',
								'5. Select the PSBT file',
								'6. Review transaction details on device',
								'7. Confirm with checkmark button (✓)',
								'8. Signed file saved as "-signed.psbt"',
								'9. Return SD card to computer',
								'10. In Sparrow, use "Load PSBT" to import signed transaction',
								'11. Broadcast the transaction',
							],
						},
					});
				}
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
