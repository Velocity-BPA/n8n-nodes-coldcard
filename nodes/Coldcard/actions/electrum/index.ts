/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

/**
 * Electrum Integration Resource
 * Operations for Electrum wallet integration
 */

export const electrumOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['electrum'],
			},
		},
		options: [
			{
				name: 'Export Electrum Wallet File',
				value: 'exportElectrumWalletFile',
				description: 'Export wallet in Electrum JSON format',
				action: 'Export electrum wallet file',
			},
			{
				name: 'Export Electrum Multisig',
				value: 'exportElectrumMultisig',
				description: 'Export multisig wallet for Electrum',
				action: 'Export electrum multisig',
			},
			{
				name: 'Sign Electrum Transaction',
				value: 'signElectrumTransaction',
				description: 'Sign a transaction for Electrum',
				action: 'Sign electrum transaction',
			},
			{
				name: 'Verify Electrum File',
				value: 'verifyElectrumFile',
				description: 'Verify an Electrum wallet file format',
				action: 'Verify electrum file',
			},
			{
				name: 'Get Electrum Format',
				value: 'getElectrumFormat',
				description: 'Get the Electrum export format details',
				action: 'Get electrum format',
			},
		],
		default: 'exportElectrumWalletFile',
	},
];

export const electrumFields: INodeProperties[] = [
	// Export Electrum Wallet File
	{
		displayName: 'Account Number',
		name: 'accountNumber',
		type: 'number',
		default: 0,
		description: 'BIP-44 account number',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['exportElectrumWalletFile', 'exportElectrumMultisig'],
			},
		},
	},
	{
		displayName: 'Address Type',
		name: 'addressType',
		type: 'options',
		options: [
			{ name: 'Native SegWit (bc1q...)', value: 'p2wpkh' },
			{ name: 'Nested SegWit (3...)', value: 'p2sh-p2wpkh' },
			{ name: 'Legacy (1...)', value: 'p2pkh' },
			{ name: 'Taproot (bc1p...)', value: 'p2tr' },
		],
		default: 'p2wpkh',
		description: 'Type of addresses to generate',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['exportElectrumWalletFile'],
			},
		},
	},
	{
		displayName: 'Include Private Keys',
		name: 'includePrivateKeys',
		type: 'boolean',
		default: false,
		description: 'Whether to include private key placeholders (Coldcard never exports actual private keys)',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['exportElectrumWalletFile'],
			},
		},
	},
	// Export Electrum Multisig
	{
		displayName: 'Multisig Config',
		name: 'multisigConfig',
		type: 'json',
		default: '{}',
		description: 'Multisig configuration JSON',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['exportElectrumMultisig'],
			},
		},
	},
	// Sign Electrum Transaction
	{
		displayName: 'Transaction Data',
		name: 'transactionData',
		type: 'string',
		default: '',
		description: 'Electrum transaction data (PSBT format)',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['signElectrumTransaction'],
			},
		},
	},
	{
		displayName: 'Input Format',
		name: 'inputFormat',
		type: 'options',
		options: [
			{ name: 'Base64', value: 'base64' },
			{ name: 'Hex', value: 'hex' },
		],
		default: 'base64',
		description: 'Format of the transaction data',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['signElectrumTransaction'],
			},
		},
	},
	// Verify Electrum File
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 10,
		},
		description: 'Electrum wallet file content (JSON)',
		displayOptions: {
			show: {
				resource: ['electrum'],
				operation: ['verifyElectrumFile'],
			},
		},
	},
];

interface ElectrumWalletFile {
	wallet_type: string;
	use_encryption: boolean;
	seed_type?: string;
	keystore: {
		type: string;
		xpub: string;
		derivation: string;
		root_fingerprint: string;
		label?: string;
	};
}

interface ElectrumMultisigFile {
	wallet_type: string;
	use_encryption: boolean;
	x1: {
		type: string;
		xpub: string;
		derivation: string;
		root_fingerprint: string;
	};
	[key: string]: unknown;
}

export async function executeElectrumOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const returnData: INodeExecutionData[] = [];

	try {
		switch (operation) {
			case 'exportElectrumWalletFile': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const addressType = this.getNodeParameter('addressType', index) as string;
				const includePrivateKeys = this.getNodeParameter('includePrivateKeys', index) as boolean;

				// Determine derivation path and xpub prefix based on address type
				const derivationPaths: Record<string, { path: string; walletType: string }> = {
					'p2pkh': { path: `m/44'/0'/${accountNumber}'`, walletType: 'standard' },
					'p2sh-p2wpkh': { path: `m/49'/0'/${accountNumber}'`, walletType: 'p2wpkh-p2sh' },
					'p2wpkh': { path: `m/84'/0'/${accountNumber}'`, walletType: 'standard' },
					'p2tr': { path: `m/86'/0'/${accountNumber}'`, walletType: 'standard' },
				};

				const config = derivationPaths[addressType];
				const fingerprint = 'XXXXXXXX'; // Would be retrieved from device

				const walletFile: ElectrumWalletFile = {
					wallet_type: config.walletType,
					use_encryption: false,
					keystore: {
						type: 'hardware',
						xpub: `[${fingerprint}/${config.path.replace('m/', '')}]xpub...`,
						derivation: config.path,
						root_fingerprint: fingerprint,
						label: 'Coldcard',
					},
				};

				returnData.push({
					json: {
						success: true,
						operation: 'exportElectrumWalletFile',
						walletFile,
						addressType,
						derivationPath: config.path,
						instructions: [
							'1. Save this JSON as a .json file',
							'2. In Electrum, go to File -> Open or create a wallet',
							'3. Choose "Import wallet file"',
							'4. Select the saved JSON file',
							'5. The wallet will be created as a watch-only wallet',
							includePrivateKeys
								? 'Note: Private keys remain on Coldcard'
								: '',
						].filter(Boolean),
					},
				});
				break;
			}

			case 'exportElectrumMultisig': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const multisigConfigStr = this.getNodeParameter('multisigConfig', index) as string;

				let multisigConfig: { m: number; n: number; cosigners: Array<{ name: string; xpub: string; fingerprint: string }> };
				try {
					multisigConfig = JSON.parse(multisigConfigStr);
				} catch {
					throw new Error('Invalid multisig configuration JSON');
				}

				const { m, n, cosigners } = multisigConfig;

				if (!m || !n || !cosigners || cosigners.length !== n) {
					throw new Error(`Invalid multisig config: need ${n} cosigners, got ${cosigners?.length || 0}`);
				}

				const derivationPath = `m/48'/0'/${accountNumber}'/2'`;

				const multisigFile: ElectrumMultisigFile = {
					wallet_type: `${m}of${n}`,
					use_encryption: false,
					x1: {
						type: 'hardware',
						xpub: '',
						derivation: derivationPath,
						root_fingerprint: '',
					},
				};

				// Add cosigners
				cosigners.forEach((cosigner, idx) => {
					multisigFile[`x${idx + 1}`] = {
						type: 'hardware',
						xpub: cosigner.xpub,
						derivation: derivationPath,
						root_fingerprint: cosigner.fingerprint,
					};
				});

				returnData.push({
					json: {
						success: true,
						operation: 'exportElectrumMultisig',
						multisigFile,
						quorum: `${m}-of-${n}`,
						cosignerCount: n,
						derivationPath,
						instructions: [
							'1. Save this JSON as a .json file',
							'2. In Electrum, go to File -> New/Restore',
							'3. Choose "Multi-signature wallet"',
							'4. Set the signature requirements',
							'5. Import cosigner keys or use hardware wallets',
							'6. Complete the wallet setup',
						],
					},
				});
				break;
			}

			case 'signElectrumTransaction': {
				const transactionData = this.getNodeParameter('transactionData', index) as string;
				const inputFormat = this.getNodeParameter('inputFormat', index) as string;

				if (!transactionData) {
					throw new Error('Transaction data is required');
				}

				// Validate format
				let psbtData: string;
				if (inputFormat === 'base64') {
					try {
						Buffer.from(transactionData, 'base64');
						psbtData = transactionData;
					} catch {
						throw new Error('Invalid base64 transaction data');
					}
				} else {
					if (!/^[0-9a-fA-F]+$/.test(transactionData)) {
						throw new Error('Invalid hex transaction data');
					}
					psbtData = Buffer.from(transactionData, 'hex').toString('base64');
				}

				returnData.push({
					json: {
						success: true,
						operation: 'signElectrumTransaction',
						status: 'pending_signature',
						psbtData,
						sdCardInstructions: [
							'1. Save the PSBT data to a file named "unsigned.psbt"',
							'2. Copy the file to the SD card',
							'3. Insert SD card into Coldcard',
							'4. Navigate to "Ready To Sign"',
							'5. Review and approve the transaction on device',
							'6. The signed transaction will be saved as "signed.psbt"',
							'7. Copy signed file back and import into Electrum',
						],
						usbInstructions: [
							'1. Connect Coldcard via USB',
							'2. Send the PSBT for signing',
							'3. Review and approve on device',
							'4. Receive signed PSBT',
							'5. Import into Electrum',
						],
					},
				});
				break;
			}

			case 'verifyElectrumFile': {
				const fileContent = this.getNodeParameter('fileContent', index) as string;

				if (!fileContent) {
					throw new Error('File content is required');
				}

				let parsed: Record<string, unknown>;
				try {
					parsed = JSON.parse(fileContent);
				} catch {
					throw new Error('Invalid JSON format');
				}

				const isValid = 'wallet_type' in parsed && ('keystore' in parsed || 'x1' in parsed);
				const walletType = (parsed.wallet_type as string) || 'unknown';
				const isMultisig = walletType.includes('of');
				const hasHardware = JSON.stringify(parsed).includes('"type": "hardware"');

				let keystoreInfo: Record<string, unknown> = {};
				if (!isMultisig && parsed.keystore) {
					const ks = parsed.keystore as Record<string, unknown>;
					keystoreInfo = {
						type: ks.type,
						derivation: ks.derivation,
						fingerprint: ks.root_fingerprint,
						hasXpub: !!ks.xpub,
					};
				}

				returnData.push({
					json: {
						success: true,
						operation: 'verifyElectrumFile',
						isValid,
						walletType,
						isMultisig,
						hasHardware,
						useEncryption: parsed.use_encryption || false,
						keystoreInfo: isMultisig ? undefined : keystoreInfo,
						cosignerCount: isMultisig ? Object.keys(parsed).filter(k => k.startsWith('x')).length : undefined,
					},
				});
				break;
			}

			case 'getElectrumFormat': {
				returnData.push({
					json: {
						success: true,
						operation: 'getElectrumFormat',
						formatVersion: '4.x',
						supportedTypes: [
							{
								type: 'standard',
								description: 'Single signature wallet',
								addressTypes: ['p2pkh', 'p2wpkh', 'p2wpkh-p2sh'],
							},
							{
								type: 'multisig',
								description: 'Multi-signature wallet (MofN)',
								format: '{m}of{n}',
								example: '2of3',
							},
						],
						keystoreFormat: {
							type: 'string (hardware/software)',
							xpub: 'string (extended public key)',
							derivation: 'string (BIP-32 path)',
							root_fingerprint: 'string (master key fingerprint)',
							label: 'string (optional device label)',
						},
						coldcardCompatibility: {
							singleSig: true,
							multisig: true,
							exportFormats: ['watch-only', 'hardware wallet'],
							signingMethods: ['USB', 'SD Card'],
						},
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
