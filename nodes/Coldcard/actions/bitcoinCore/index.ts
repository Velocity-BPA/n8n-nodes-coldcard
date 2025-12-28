/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

/**
 * Bitcoin Core Integration Resource
 * Operations for Bitcoin Core wallet integration using output descriptors
 */

export const bitcoinCoreOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
			},
		},
		options: [
			{
				name: 'Export Core Descriptor',
				value: 'exportCoreDescriptor',
				description: 'Export output descriptor for Bitcoin Core',
				action: 'Export core descriptor',
			},
			{
				name: 'Export Core Multisig',
				value: 'exportCoreMultisig',
				description: 'Export multisig descriptor for Bitcoin Core',
				action: 'Export core multisig',
			},
			{
				name: 'Get Core Watch-Only',
				value: 'getCoreWatchOnly',
				description: 'Get watch-only wallet configuration for Bitcoin Core',
				action: 'Get core watch only',
			},
			{
				name: 'Sign Core PSBT',
				value: 'signCorePsbt',
				description: 'Sign a PSBT for Bitcoin Core',
				action: 'Sign core psbt',
			},
		],
		default: 'exportCoreDescriptor',
	},
];

export const bitcoinCoreFields: INodeProperties[] = [
	// Export Core Descriptor
	{
		displayName: 'Account Number',
		name: 'accountNumber',
		type: 'number',
		default: 0,
		description: 'BIP-44 account number',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreDescriptor', 'exportCoreMultisig', 'getCoreWatchOnly'],
			},
		},
	},
	{
		displayName: 'Descriptor Type',
		name: 'descriptorType',
		type: 'options',
		options: [
			{ name: 'Native SegWit (wpkh)', value: 'wpkh' },
			{ name: 'Nested SegWit (sh-wpkh)', value: 'sh-wpkh' },
			{ name: 'Legacy (pkh)', value: 'pkh' },
			{ name: 'Taproot (tr)', value: 'tr' },
		],
		default: 'wpkh',
		description: 'Output descriptor type',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreDescriptor', 'getCoreWatchOnly'],
			},
		},
	},
	{
		displayName: 'Include Internal',
		name: 'includeInternal',
		type: 'boolean',
		default: true,
		description: 'Whether to include internal (change) descriptor',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreDescriptor', 'getCoreWatchOnly'],
			},
		},
	},
	{
		displayName: 'Range Start',
		name: 'rangeStart',
		type: 'number',
		default: 0,
		description: 'Start index for address range',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreDescriptor', 'getCoreWatchOnly'],
			},
		},
	},
	{
		displayName: 'Range End',
		name: 'rangeEnd',
		type: 'number',
		default: 1000,
		description: 'End index for address range',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreDescriptor', 'getCoreWatchOnly'],
			},
		},
	},
	// Export Core Multisig
	{
		displayName: 'Threshold (M)',
		name: 'threshold',
		type: 'number',
		default: 2,
		description: 'Number of signatures required',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreMultisig'],
			},
		},
	},
	{
		displayName: 'Cosigner Keys',
		name: 'cosignerKeys',
		type: 'json',
		default: '[]',
		description: 'Array of cosigner extended public keys',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreMultisig'],
			},
		},
	},
	{
		displayName: 'Use Sorted Multi',
		name: 'useSortedMulti',
		type: 'boolean',
		default: true,
		description: 'Whether to use sortedmulti (recommended)',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['exportCoreMultisig'],
			},
		},
	},
	// Sign Core PSBT
	{
		displayName: 'PSBT Data',
		name: 'psbtData',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		description: 'PSBT from Bitcoin Core (base64)',
		displayOptions: {
			show: {
				resource: ['bitcoinCore'],
				operation: ['signCorePsbt'],
			},
		},
	},
];

/**
 * Calculate descriptor checksum (simplified)
 * In production, use proper BIP-380 checksum calculation
 */
function calculateDescriptorChecksum(descriptor: string): string {
	// Placeholder - actual implementation would use descriptor checksum algorithm
	// This is a simplified version for demonstration
	const hash = descriptor.split('').reduce((acc, char) => {
		return ((acc << 5) + acc) + char.charCodeAt(0);
	}, 5381);
	const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
	let checksum = '';
	let h = Math.abs(hash);
	for (let i = 0; i < 8; i++) {
		checksum += chars[h % 32];
		h = Math.floor(h / 32);
	}
	return checksum;
}

interface DescriptorResult {
	descriptor: string;
	checksumDescriptor: string;
	derivationPath: string;
	fingerprint: string;
	range: [number, number];
	isInternal: boolean;
}

interface ImportDescriptorCommand {
	desc: string;
	timestamp: string | number;
	range: [number, number];
	watchonly: boolean;
	internal: boolean;
	active: boolean;
}

export async function executeBitcoinCoreOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const returnData: INodeExecutionData[] = [];

	try {
		switch (operation) {
			case 'exportCoreDescriptor': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const descriptorType = this.getNodeParameter('descriptorType', index) as string;
				const includeInternal = this.getNodeParameter('includeInternal', index) as boolean;
				const rangeStart = this.getNodeParameter('rangeStart', index) as number;
				const rangeEnd = this.getNodeParameter('rangeEnd', index) as number;

				// Map descriptor types to derivation paths
				const typeConfig: Record<string, { path: string; wrapper: string }> = {
					'pkh': { path: `44'/0'/${accountNumber}'`, wrapper: 'pkh' },
					'sh-wpkh': { path: `49'/0'/${accountNumber}'`, wrapper: 'sh(wpkh' },
					'wpkh': { path: `84'/0'/${accountNumber}'`, wrapper: 'wpkh' },
					'tr': { path: `86'/0'/${accountNumber}'`, wrapper: 'tr' },
				};

				const config = typeConfig[descriptorType];
				const fingerprint = 'XXXXXXXX'; // Would be retrieved from device
				const xpub = 'xpub...'; // Would be retrieved from device

				const descriptors: DescriptorResult[] = [];

				// External (receive) descriptor
				const externalPath = `${config.path}/0/*`;
				const externalKey = `[${fingerprint}/${externalPath}]${xpub}`;
				let externalDesc: string;

				if (descriptorType === 'sh-wpkh') {
					externalDesc = `sh(wpkh(${externalKey}))`;
				} else {
					externalDesc = `${config.wrapper}(${externalKey})`;
				}

				const externalChecksum = calculateDescriptorChecksum(externalDesc);
				descriptors.push({
					descriptor: externalDesc,
					checksumDescriptor: `${externalDesc}#${externalChecksum}`,
					derivationPath: `m/${externalPath}`,
					fingerprint,
					range: [rangeStart, rangeEnd],
					isInternal: false,
				});

				// Internal (change) descriptor
				if (includeInternal) {
					const internalPath = `${config.path}/1/*`;
					const internalKey = `[${fingerprint}/${internalPath}]${xpub}`;
					let internalDesc: string;

					if (descriptorType === 'sh-wpkh') {
						internalDesc = `sh(wpkh(${internalKey}))`;
					} else {
						internalDesc = `${config.wrapper}(${internalKey})`;
					}

					const internalChecksum = calculateDescriptorChecksum(internalDesc);
					descriptors.push({
						descriptor: internalDesc,
						checksumDescriptor: `${internalDesc}#${internalChecksum}`,
						derivationPath: `m/${internalPath}`,
						fingerprint,
						range: [rangeStart, rangeEnd],
						isInternal: true,
					});
				}

				returnData.push({
					json: {
						success: true,
						operation: 'exportCoreDescriptor',
						descriptors,
						descriptorType,
						accountNumber,
						fingerprint,
						bitcoinCoreCommands: {
							createWallet: `bitcoin-cli createwallet "coldcard_wallet" true true "" false true true`,
							importDescriptors: descriptors.map((d) => ({
								method: 'importdescriptors',
								params: [{
									desc: d.checksumDescriptor,
									timestamp: 'now',
									range: d.range,
									watchonly: true,
									internal: d.isInternal,
									active: true,
								}],
							})),
						},
						instructions: [
							'1. Create a new wallet in Bitcoin Core (descriptor wallet):',
							'   bitcoin-cli createwallet "coldcard_wallet" true true "" false true true',
							'2. Import the descriptors:',
							'   bitcoin-cli -rpcwallet=coldcard_wallet importdescriptors \'[...]\'',
							'3. The wallet will be watch-only',
							'4. Use bitcoin-cli walletcreatefundedpsbt to create transactions',
							'5. Sign with Coldcard via SD card or USB',
							'6. Finalize with bitcoin-cli finalizepsbt',
							'7. Broadcast with bitcoin-cli sendrawtransaction',
						],
					},
				});
				break;
			}

			case 'exportCoreMultisig': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const threshold = this.getNodeParameter('threshold', index) as number;
				const cosignerKeysStr = this.getNodeParameter('cosignerKeys', index) as string;
				const useSortedMulti = this.getNodeParameter('useSortedMulti', index) as boolean;

				let cosignerKeys: Array<{ fingerprint: string; xpub: string }>;
				try {
					cosignerKeys = JSON.parse(cosignerKeysStr);
				} catch {
					throw new Error('Invalid cosigner keys JSON');
				}

				const totalSigners = cosignerKeys.length;
				if (threshold > totalSigners) {
					throw new Error('Threshold cannot exceed number of cosigners');
				}

				const derivationPath = `48'/0'/${accountNumber}'/2'`;
				const multisigFunc = useSortedMulti ? 'sortedmulti' : 'multi';

				// Build key expressions for external addresses
				const externalKeys = cosignerKeys.map((k) =>
					`[${k.fingerprint}/${derivationPath}/0/*]${k.xpub}`
				);
				const externalDesc = `wsh(${multisigFunc}(${threshold},${externalKeys.join(',')}))`;
				const externalChecksum = calculateDescriptorChecksum(externalDesc);

				// Build key expressions for internal (change) addresses
				const internalKeys = cosignerKeys.map((k) =>
					`[${k.fingerprint}/${derivationPath}/1/*]${k.xpub}`
				);
				const internalDesc = `wsh(${multisigFunc}(${threshold},${internalKeys.join(',')}))`;
				const internalChecksum = calculateDescriptorChecksum(internalDesc);

				const importCommands: ImportDescriptorCommand[] = [
					{
						desc: `${externalDesc}#${externalChecksum}`,
						timestamp: 'now',
						range: [0, 1000],
						watchonly: true,
						internal: false,
						active: true,
					},
					{
						desc: `${internalDesc}#${internalChecksum}`,
						timestamp: 'now',
						range: [0, 1000],
						watchonly: true,
						internal: true,
						active: true,
					},
				];

				returnData.push({
					json: {
						success: true,
						operation: 'exportCoreMultisig',
						quorum: `${threshold}-of-${totalSigners}`,
						descriptors: {
							external: {
								descriptor: externalDesc,
								withChecksum: `${externalDesc}#${externalChecksum}`,
							},
							internal: {
								descriptor: internalDesc,
								withChecksum: `${internalDesc}#${internalChecksum}`,
							},
						},
						derivationPath: `m/${derivationPath}`,
						useSortedMulti,
						cosignerCount: totalSigners,
						bitcoinCoreCommands: {
							createWallet: 'bitcoin-cli createwallet "coldcard_multisig" true true "" false true true',
							importDescriptors: {
								method: 'importdescriptors',
								params: importCommands,
							},
						},
						instructions: [
							`1. Create descriptor wallet for ${threshold}-of-${totalSigners} multisig`,
							'2. Import both external and internal descriptors',
							'3. To create a transaction:',
							'   bitcoin-cli -rpcwallet=coldcard_multisig walletcreatefundedpsbt \'[]\' \'{"address":amount}\'',
							'4. Save PSBT to file and copy to SD card',
							'5. Sign on first Coldcard, get partial signature',
							'6. Sign on remaining Coldcards until threshold met',
							'7. Combine with bitcoin-cli combinepsbt',
							'8. Finalize and broadcast',
						],
					},
				});
				break;
			}

			case 'getCoreWatchOnly': {
				const accountNumber = this.getNodeParameter('accountNumber', index) as number;
				const descriptorType = this.getNodeParameter('descriptorType', index) as string;
				const rangeStart = this.getNodeParameter('rangeStart', index) as number;
				const rangeEnd = this.getNodeParameter('rangeEnd', index) as number;

				// Map descriptor types
				const typeConfig: Record<string, { bip: number; wrapper: string; name: string }> = {
					'pkh': { bip: 44, wrapper: 'pkh', name: 'Legacy' },
					'sh-wpkh': { bip: 49, wrapper: 'sh(wpkh', name: 'Nested SegWit' },
					'wpkh': { bip: 84, wrapper: 'wpkh', name: 'Native SegWit' },
					'tr': { bip: 86, wrapper: 'tr', name: 'Taproot' },
				};

				const config = typeConfig[descriptorType];
				const fingerprint = 'XXXXXXXX';

				returnData.push({
					json: {
						success: true,
						operation: 'getCoreWatchOnly',
						walletType: 'watch-only',
						descriptorType,
						descriptorName: config.name,
						bip: `BIP-${config.bip}`,
						accountNumber,
						fingerprint,
						addressRange: {
							start: rangeStart,
							end: rangeEnd,
							total: rangeEnd - rangeStart + 1,
						},
						coreCommands: {
							createWallet: {
								command: 'createwallet',
								params: {
									wallet_name: 'coldcard_watchonly',
									disable_private_keys: true,
									blank: true,
									passphrase: '',
									avoid_reuse: false,
									descriptors: true,
									load_on_startup: true,
								},
							},
							listUnspent: 'bitcoin-cli -rpcwallet=coldcard_watchonly listunspent',
							getNewAddress: 'bitcoin-cli -rpcwallet=coldcard_watchonly getnewaddress',
							createPsbt: 'bitcoin-cli -rpcwallet=coldcard_watchonly walletcreatefundedpsbt',
						},
						signingWorkflow: {
							step1: 'Create PSBT with walletcreatefundedpsbt',
							step2: 'Export PSBT to file',
							step3: 'Copy to SD card',
							step4: 'Sign on Coldcard',
							step5: 'Copy signed PSBT back',
							step6: 'Finalize with finalizepsbt',
							step7: 'Broadcast with sendrawtransaction',
						},
					},
				});
				break;
			}

			case 'signCorePsbt': {
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

				// Check PSBT magic bytes
				const decoded = Buffer.from(psbtData, 'base64');
				const magic = decoded.slice(0, 5).toString('ascii');
				if (magic !== 'psbt\xff') {
					throw new Error('Invalid PSBT: missing magic bytes');
				}

				returnData.push({
					json: {
						success: true,
						operation: 'signCorePsbt',
						status: 'pending_signature',
						psbtBase64: psbtData,
						psbtHex: decoded.toString('hex'),
						sdCardWorkflow: [
							'1. Save PSBT to file:',
							'   echo "<base64>" | base64 -d > unsigned.psbt',
							'   Or use: bitcoin-cli decodepsbt to review first',
							'2. Copy unsigned.psbt to SD card',
							'3. Insert SD card into Coldcard',
							'4. On Coldcard: Ready To Sign',
							'5. Select the PSBT file',
							'6. Review transaction details carefully:',
							'   - Inputs (your UTXOs)',
							'   - Outputs (destinations and amounts)',
							'   - Fee amount and rate',
							'   - Change outputs (should show as change)',
							'7. Press checkmark (✓) to sign',
							'8. Signed file saved as "unsigned-signed.psbt"',
							'9. Copy back to computer',
							'10. Import to Core:',
							'    bitcoin-cli finalizepsbt "$(base64 unsigned-signed.psbt)"',
							'11. Broadcast:',
							'    bitcoin-cli sendrawtransaction "<hex>"',
						],
						bitcoinCoreCommands: {
							analyzePsbt: `bitcoin-cli analyzepsbt "${psbtData}"`,
							decodePsbt: `bitcoin-cli decodepsbt "${psbtData}"`,
							finalizePsbt: 'bitcoin-cli finalizepsbt "<signed_psbt_base64>"',
							sendRawTransaction: 'bitcoin-cli sendrawtransaction "<hex>"',
						},
						notes: [
							'PSBT preserves transaction structure for offline signing',
							'Multiple partial signatures can be combined for multisig',
							'Use analyzepsbt to check signing status',
							'finalizepsbt extracts the final transaction',
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
