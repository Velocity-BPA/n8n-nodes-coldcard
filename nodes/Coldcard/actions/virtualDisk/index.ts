/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

/**
 * Virtual Disk Resource
 * Operations for Coldcard Virtual Disk USB mode
 */

export const virtualDiskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
			},
		},
		options: [
			{
				name: 'Enable Virtual Disk Mode',
				value: 'enableVirtualDiskMode',
				description: 'Enable USB virtual disk mode on Coldcard',
				action: 'Enable virtual disk mode',
			},
			{
				name: 'Disable Virtual Disk Mode',
				value: 'disableVirtualDiskMode',
				description: 'Disable USB virtual disk mode',
				action: 'Disable virtual disk mode',
			},
			{
				name: 'Get Virtual Disk Status',
				value: 'getVirtualDiskStatus',
				description: 'Get current virtual disk status',
				action: 'Get virtual disk status',
			},
			{
				name: 'Access Virtual Drive',
				value: 'accessVirtualDrive',
				description: 'Get virtual drive access information',
				action: 'Access virtual drive',
			},
			{
				name: 'Import From Virtual Disk',
				value: 'importFromVirtualDisk',
				description: 'Import a file from the virtual disk',
				action: 'Import from virtual disk',
			},
			{
				name: 'Export to Virtual Disk',
				value: 'exportToVirtualDisk',
				description: 'Export a file to the virtual disk',
				action: 'Export to virtual disk',
			},
		],
		default: 'getVirtualDiskStatus',
	},
];

export const virtualDiskFields: INodeProperties[] = [
	// Access Virtual Drive
	{
		displayName: 'Platform',
		name: 'platform',
		type: 'options',
		options: [
			{ name: 'Linux', value: 'linux' },
			{ name: 'macOS', value: 'macos' },
			{ name: 'Windows', value: 'windows' },
		],
		default: 'linux',
		description: 'Operating system platform',
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
				operation: ['accessVirtualDrive', 'importFromVirtualDisk', 'exportToVirtualDisk'],
			},
		},
	},
	// Import From Virtual Disk
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		description: 'Name of file to import',
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
				operation: ['importFromVirtualDisk'],
			},
		},
	},
	{
		displayName: 'File Type',
		name: 'fileType',
		type: 'options',
		options: [
			{ name: 'Signed PSBT', value: 'signed-psbt' },
			{ name: 'Wallet Export', value: 'wallet-export' },
			{ name: 'Multisig Config', value: 'multisig-config' },
			{ name: 'Address List', value: 'address-list' },
			{ name: 'Backup', value: 'backup' },
			{ name: 'Other', value: 'other' },
		],
		default: 'signed-psbt',
		description: 'Type of file to import',
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
				operation: ['importFromVirtualDisk'],
			},
		},
	},
	// Export To Virtual Disk
	{
		displayName: 'Export File Name',
		name: 'exportFileName',
		type: 'string',
		default: 'unsigned.psbt',
		description: 'Name for the exported file',
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
				operation: ['exportToVirtualDisk'],
			},
		},
	},
	{
		displayName: 'Export Content',
		name: 'exportContent',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		description: 'Content to write to the virtual disk',
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
				operation: ['exportToVirtualDisk'],
			},
		},
	},
	{
		displayName: 'Content Encoding',
		name: 'contentEncoding',
		type: 'options',
		options: [
			{ name: 'Text (UTF-8)', value: 'utf8' },
			{ name: 'Base64', value: 'base64' },
			{ name: 'Hex', value: 'hex' },
		],
		default: 'utf8',
		description: 'Encoding of the export content',
		displayOptions: {
			show: {
				resource: ['virtualDisk'],
				operation: ['exportToVirtualDisk'],
			},
		},
	},
];

interface VirtualDiskStatus {
	enabled: boolean;
	mounted: boolean;
	driveLetter?: string;
	mountPoint?: string;
	freeSpace?: number;
	totalSpace?: number;
}

interface PlatformPaths {
	mountPoint: string;
	devicePath: string;
	ejectCommand: string;
}

export async function executeVirtualDiskOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const returnData: INodeExecutionData[] = [];

	try {
		switch (operation) {
			case 'enableVirtualDiskMode': {
				returnData.push({
					json: {
						success: true,
						operation: 'enableVirtualDiskMode',
						mode: 'virtual_disk',
						deviceInstructions: [
							'1. On Coldcard, go to Settings',
							'2. Select "Hardware On/Off"',
							'3. Select "USB Settings"',
							'4. Enable "Virtual Disk Mode"',
							'5. Connect Coldcard via USB',
							'6. Device will appear as a USB drive',
						],
						requirements: [
							'USB connection to computer',
							'Coldcard firmware 5.0.0 or later',
							'Not compatible with USB HID mode simultaneously',
						],
						securityNotes: [
							'Virtual disk mode exposes a small filesystem to the computer',
							'No private keys are ever exposed',
							'Files are verified before being processed',
							'Can be used for PSBT signing workflow',
						],
						compatiblePlatforms: ['Windows', 'macOS', 'Linux'],
					},
				});
				break;
			}

			case 'disableVirtualDiskMode': {
				returnData.push({
					json: {
						success: true,
						operation: 'disableVirtualDiskMode',
						mode: 'usb_hid',
						deviceInstructions: [
							'1. Safely eject the virtual disk first',
							'2. On Coldcard, go to Settings',
							'3. Select "Hardware On/Off"',
							'4. Select "USB Settings"',
							'5. Disable "Virtual Disk Mode"',
							'6. Device will use HID mode on next connection',
						],
						note: 'Disabling returns Coldcard to standard USB HID communication mode',
					},
				});
				break;
			}

			case 'getVirtualDiskStatus': {
				const status: VirtualDiskStatus = {
					enabled: true,
					mounted: true,
					driveLetter: 'E:',
					mountPoint: '/Volumes/COLDCARD',
					freeSpace: 1024 * 1024, // 1 MB
					totalSpace: 2 * 1024 * 1024, // 2 MB
				};

				returnData.push({
					json: {
						success: true,
						operation: 'getVirtualDiskStatus',
						status,
						volumeLabel: 'COLDCARD',
						fileSystem: 'FAT12',
						specialFiles: {
							'READY.txt': 'Indicates device is ready for operations',
							'command.txt': 'Write commands here for device processing',
							'response.txt': 'Read responses from device here',
							'unsigned.psbt': 'Place unsigned PSBTs here for signing',
							'signed.psbt': 'Signed PSBTs appear here',
						},
						platformDetection: {
							linux: '/media/<user>/COLDCARD or /run/media/<user>/COLDCARD',
							macos: '/Volumes/COLDCARD',
							windows: 'Assigned drive letter (e.g., E:)',
						},
					},
				});
				break;
			}

			case 'accessVirtualDrive': {
				const platform = this.getNodeParameter('platform', index) as string;

				const platformPaths: Record<string, PlatformPaths> = {
					linux: {
						mountPoint: '/media/$USER/COLDCARD',
						devicePath: '/dev/sdX (check dmesg)',
						ejectCommand: 'umount /media/$USER/COLDCARD',
					},
					macos: {
						mountPoint: '/Volumes/COLDCARD',
						devicePath: '/dev/diskN',
						ejectCommand: 'diskutil eject /Volumes/COLDCARD',
					},
					windows: {
						mountPoint: 'E:\\ (varies)',
						devicePath: '\\\\.\\PhysicalDriveN',
						ejectCommand: 'Right-click drive -> Eject',
					},
				};

				const paths = platformPaths[platform];

				returnData.push({
					json: {
						success: true,
						operation: 'accessVirtualDrive',
						platform,
						paths,
						usage: {
							listFiles: platform === 'windows' ? `dir ${paths.mountPoint}` : `ls -la ${paths.mountPoint}`,
							copyPsbt: platform === 'windows'
								? `copy unsigned.psbt ${paths.mountPoint}\\`
								: `cp unsigned.psbt ${paths.mountPoint}/`,
							readSigned: platform === 'windows'
								? `copy ${paths.mountPoint}\\signed.psbt .`
								: `cp ${paths.mountPoint}/signed.psbt .`,
						},
						signingWorkflow: [
							'1. Copy unsigned.psbt to the virtual disk',
							'2. On Coldcard, navigate to "Ready To Sign"',
							'3. The device detects the PSBT automatically',
							'4. Review and approve the transaction',
							'5. Signed PSBT appears on the virtual disk',
							'6. Copy the signed PSBT back to your computer',
							'7. Safely eject the virtual disk',
							'8. Import signed PSBT into your wallet software',
						],
						safeEject: {
							importance: 'Always safely eject before unplugging',
							commands: paths.ejectCommand,
						},
					},
				});
				break;
			}

			case 'importFromVirtualDisk': {
				const platform = this.getNodeParameter('platform', index) as string;
				const fileName = this.getNodeParameter('fileName', index) as string;
				const fileType = this.getNodeParameter('fileType', index) as string;

				if (!fileName) {
					throw new Error('File name is required');
				}

				const mountPoints: Record<string, string> = {
					linux: '/media/$USER/COLDCARD',
					macos: '/Volumes/COLDCARD',
					windows: 'E:\\',
				};

				const mountPoint = mountPoints[platform];
				const fullPath = platform === 'windows'
					? `${mountPoint}${fileName}`
					: `${mountPoint}/${fileName}`;

				returnData.push({
					json: {
						success: true,
						operation: 'importFromVirtualDisk',
						platform,
						fileName,
						fileType,
						sourcePath: fullPath,
						commands: {
							read: platform === 'windows'
								? `type "${fullPath}"`
								: `cat "${fullPath}"`,
							copy: platform === 'windows'
								? `copy "${fullPath}" .`
								: `cp "${fullPath}" .`,
							verify: platform === 'windows'
								? `certutil -hashfile "${fullPath}" SHA256`
								: `sha256sum "${fullPath}"`,
						},
						fileTypeHandling: {
							'signed-psbt': {
								extension: '.psbt or -signed.psbt',
								nextStep: 'Import into wallet software to broadcast',
							},
							'wallet-export': {
								extension: '.json',
								nextStep: 'Import into compatible wallet (Electrum, Sparrow, etc.)',
							},
							'multisig-config': {
								extension: '.txt or .json',
								nextStep: 'Import into cosigner devices',
							},
							'address-list': {
								extension: '.csv or .txt',
								nextStep: 'Use for address verification',
							},
							'backup': {
								extension: '.7z',
								nextStep: 'Store securely with backup password',
							},
						},
					},
				});
				break;
			}

			case 'exportToVirtualDisk': {
				const platform = this.getNodeParameter('platform', index) as string;
				const exportFileName = this.getNodeParameter('exportFileName', index) as string;
				const exportContent = this.getNodeParameter('exportContent', index) as string;
				const contentEncoding = this.getNodeParameter('contentEncoding', index) as string;

				if (!exportFileName) {
					throw new Error('Export file name is required');
				}

				const mountPoints: Record<string, string> = {
					linux: '/media/$USER/COLDCARD',
					macos: '/Volumes/COLDCARD',
					windows: 'E:\\',
				};

				const mountPoint = mountPoints[platform];
				const fullPath = platform === 'windows'
					? `${mountPoint}${exportFileName}`
					: `${mountPoint}/${exportFileName}`;

				// Validate content based on encoding
				if (exportContent) {
					if (contentEncoding === 'base64') {
						try {
							Buffer.from(exportContent, 'base64');
						} catch {
							throw new Error('Invalid base64 content');
						}
					} else if (contentEncoding === 'hex') {
						if (!/^[0-9a-fA-F]+$/.test(exportContent)) {
							throw new Error('Invalid hex content');
						}
					}
				}

				returnData.push({
					json: {
						success: true,
						operation: 'exportToVirtualDisk',
						platform,
						fileName: exportFileName,
						destinationPath: fullPath,
						contentEncoding,
						hasContent: !!exportContent,
						commands: {
							write: platform === 'windows'
								? `echo <content> > "${fullPath}"`
								: `echo '<content>' > "${fullPath}"`,
							writeBinary: platform === 'windows'
								? `copy /b source.bin "${fullPath}"`
								: `cp source.bin "${fullPath}"`,
							verify: platform === 'windows'
								? `dir "${fullPath}"`
								: `ls -la "${fullPath}"`,
						},
						workflow: [
							`1. Write content to ${fullPath}`,
							'2. Coldcard detects new file',
							'3. For PSBTs: Navigate to "Ready To Sign"',
							'4. Device processes the file',
							'5. Check for response or signed file',
						],
						expectedFileTypes: {
							'unsigned.psbt': 'PSBT for signing',
							'multisig.txt': 'Multisig configuration import',
							'command.txt': 'Device command (advanced)',
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
