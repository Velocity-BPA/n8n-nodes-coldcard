/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

import { SDCardHandler } from './transport/sdCardHandler';

export class ColdcardTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Coldcard Trigger',
		name: 'coldcardTrigger',
		icon: 'file:coldcard.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Listen for Coldcard events like signed PSBTs and file changes',
		defaults: {
			name: 'Coldcard Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'coldcardDevice',
				required: true,
			},
			{
				name: 'coldcardFile',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Backup Created',
						value: 'backupCreated',
						description: 'Trigger when a backup is created',
					},
					{
						name: 'Config Exported',
						value: 'configExported',
						description: 'Trigger when configuration is exported',
					},
					{
						name: 'Device Connected',
						value: 'deviceConnected',
						description: 'Trigger when device connects via USB',
					},
					{
						name: 'Device Disconnected',
						value: 'deviceDisconnected',
						description: 'Trigger when device disconnects',
					},
					{
						name: 'File Added',
						value: 'fileAdded',
						description: 'Trigger when any file is added to SD card',
					},
					{
						name: 'Firmware Updated',
						value: 'firmwareUpdated',
						description: 'Trigger when firmware is updated',
					},
					{
						name: 'HSM Limit Reached',
						value: 'hsmLimitReached',
						description: 'Trigger when HSM spending limit is reached',
					},
					{
						name: 'HSM Mode Enabled',
						value: 'hsmEnabled',
						description: 'Trigger when HSM mode is enabled',
					},
					{
						name: 'HSM Policy Violation',
						value: 'hsmPolicyViolation',
						description: 'Trigger on HSM policy violation',
					},
					{
						name: 'HSM Signing Event',
						value: 'hsmSigningEvent',
						description: 'Trigger on HSM automated signing',
					},
					{
						name: 'HSM Whitelist Match',
						value: 'hsmWhitelistMatch',
						description: 'Trigger when whitelist address is used',
					},
					{
						name: 'Message Signed',
						value: 'messageSigned',
						description: 'Trigger when a message is signed',
					},
					{
						name: 'Multisig Signed',
						value: 'multisigSigned',
						description: 'Trigger when multisig PSBT is signed',
					},
					{
						name: 'NFC Export Complete',
						value: 'nfcExportComplete',
						description: 'Trigger when NFC export completes',
					},
					{
						name: 'NFC Import Complete',
						value: 'nfcImportComplete',
						description: 'Trigger when NFC import completes',
					},
					{
						name: 'NFC Tap Detected',
						value: 'nfcTapDetected',
						description: 'Trigger when NFC tap is detected (Q model)',
					},
					{
						name: 'PIN Entered',
						value: 'pinEntered',
						description: 'Trigger when PIN is entered',
					},
					{
						name: 'PSBT Imported',
						value: 'psbtImported',
						description: 'Trigger when PSBT is imported to SD card',
					},
					{
						name: 'PSBT Signed',
						value: 'psbtSigned',
						description: 'Trigger when PSBT is signed',
					},
					{
						name: 'Settings Changed',
						value: 'settingsChanged',
						description: 'Trigger when settings are changed',
					},
					{
						name: 'Signed PSBT Ready',
						value: 'signedPsbtReady',
						description: 'Trigger when signed PSBT is ready on SD card',
					},
					{
						name: 'Signing Rejected',
						value: 'signingRejected',
						description: 'Trigger when signing is rejected',
					},
					{
						name: 'Tamper Detected',
						value: 'tamperDetected',
						description: 'Trigger on tamper detection',
					},
					{
						name: 'Wrong PIN Attempt',
						value: 'wrongPinAttempt',
						description: 'Trigger on wrong PIN attempt',
					},
				],
				default: 'signedPsbtReady',
			},
			{
				displayName: 'SD Card Path',
				name: 'sdCardPath',
				type: 'string',
				default: '/media/coldcard',
				description: 'Path to mounted SD card',
				displayOptions: {
					show: {
						event: ['fileAdded', 'psbtImported', 'signedPsbtReady', 'backupCreated', 'configExported'],
					},
				},
			},
			{
				displayName: 'Poll Interval',
				name: 'pollInterval',
				type: 'number',
				default: 5000,
				description: 'Polling interval in milliseconds',
				displayOptions: {
					show: {
						event: ['fileAdded', 'psbtImported', 'signedPsbtReady', 'backupCreated', 'configExported', 'deviceConnected', 'deviceDisconnected'],
					},
				},
			},
			{
				displayName: 'File Pattern',
				name: 'filePattern',
				type: 'string',
				default: '',
				description: 'Optional regex pattern to filter files',
				placeholder: '.*\\.psbt$',
				displayOptions: {
					show: {
						event: ['fileAdded'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include File Content',
						name: 'includeContent',
						type: 'boolean',
						default: false,
						description: 'Whether to include file content in output',
					},
					{
						displayName: 'Include Hash',
						name: 'includeHash',
						type: 'boolean',
						default: true,
						description: 'Whether to include file SHA-256 hash',
					},
					{
						displayName: 'Auto-Delete Processed',
						name: 'autoDelete',
						type: 'boolean',
						default: false,
						description: 'Whether to delete processed files',
					},
					{
						displayName: 'Watch Subdirectories',
						name: 'watchSubdirs',
						type: 'boolean',
						default: false,
						description: 'Whether to watch subdirectories',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const event = this.getNodeParameter('event') as string;

		// File-based events use SD card watching
		const fileBasedEvents = ['fileAdded', 'psbtImported', 'signedPsbtReady', 'backupCreated', 'configExported'];

		if (fileBasedEvents.includes(event)) {
			return this.triggerFileBasedEvent(event);
		}

		// Other events would use USB polling or other mechanisms
		return this.triggerPollingEvent(event);
	}

	private async triggerFileBasedEvent(this: ITriggerFunctions, event: string): Promise<ITriggerResponse> {
		const sdCardPath = this.getNodeParameter('sdCardPath') as string;
		const pollInterval = this.getNodeParameter('pollInterval') as number;
		const options = this.getNodeParameter('options') as {
			includeContent?: boolean;
			includeHash?: boolean;
			autoDelete?: boolean;
		};

		const sdCard = new SDCardHandler(sdCardPath);
		let processedFiles = new Set<string>();
		let pollTimer: NodeJS.Timeout;

		const checkForFiles = async () => {
			try {
				const mounted = await sdCard.isMounted();
				if (!mounted) return;

				const files = await sdCard.listFiles();

				for (const file of files) {
					// Skip already processed files
					if (processedFiles.has(file.path)) continue;

					// Check if file matches the event type
					let matches = false;

					switch (event) {
						case 'fileAdded':
							matches = true;
							break;
						case 'psbtImported':
							matches = file.name.endsWith('.psbt') && !file.name.includes('-signed');
							break;
						case 'signedPsbtReady':
							matches = file.name.includes('-signed.psbt') || file.name.includes('-part.psbt');
							break;
						case 'backupCreated':
							matches = file.name.endsWith('.7z');
							break;
						case 'configExported':
							matches = file.name.endsWith('.json') || file.name.includes('-cc.txt');
							break;
					}

					if (matches) {
						processedFiles.add(file.path);

						const eventData: Record<string, unknown> = {
							event,
							file: {
								name: file.name,
								path: file.path,
								size: file.size,
								type: file.type,
								createdAt: file.createdAt.toISOString(),
								modifiedAt: file.modifiedAt.toISOString(),
							},
							timestamp: new Date().toISOString(),
						};

						if (options.includeHash) {
							try {
								eventData.sha256 = await sdCard.getFileHash(file.name);
							} catch {
								// Hash calculation failed
							}
						}

						if (options.includeContent) {
							try {
								const content = await sdCard.readFile(file.name);
								eventData.content = content.toString('base64');
							} catch {
								// Content read failed
							}
						}

						this.emit([this.helpers.returnJsonArray([eventData])]);

						if (options.autoDelete) {
							try {
								await sdCard.deleteFile(file.name);
							} catch {
								// Delete failed
							}
						}
					}
				}
			} catch {
				// Error during file check - SD card may not be mounted
			}
		};

		// Initial check
		await checkForFiles();

		// Set up polling
		pollTimer = setInterval(checkForFiles, pollInterval);

		const closeFunction = async () => {
			clearInterval(pollTimer);
			sdCard.stopWatching();
		};

		return {
			closeFunction,
		};
	}

	private async triggerPollingEvent(this: ITriggerFunctions, event: string): Promise<ITriggerResponse> {
		const pollInterval = this.getNodeParameter('pollInterval', 5000) as number;

		let pollTimer: NodeJS.Timeout;
		let lastState: Record<string, unknown> = {};

		const checkEvent = async () => {
			try {
				// Event-specific polling logic
				const eventData: Record<string, unknown> = {
					event,
					timestamp: new Date().toISOString(),
				};

				switch (event) {
					case 'deviceConnected':
					case 'deviceDisconnected':
						// USB device detection would go here
						// This is platform-specific
						break;

					case 'hsmEnabled':
					case 'hsmSigningEvent':
					case 'hsmLimitReached':
					case 'hsmPolicyViolation':
					case 'hsmWhitelistMatch':
						// HSM status polling would go here
						break;

					case 'psbtSigned':
					case 'messageSigned':
					case 'multisigSigned':
					case 'signingRejected':
						// Signing status polling
						break;

					case 'pinEntered':
					case 'wrongPinAttempt':
					case 'tamperDetected':
						// Security event polling
						break;

					case 'nfcTapDetected':
					case 'nfcExportComplete':
					case 'nfcImportComplete':
						// NFC event polling (Q model)
						break;

					case 'firmwareUpdated':
					case 'settingsChanged':
						// Device state change polling
						break;
				}

				// Only emit if state changed
				if (JSON.stringify(lastState) !== JSON.stringify(eventData)) {
					lastState = eventData;
					// Don't emit on every poll - only on actual events
					// this.emit([this.helpers.returnJsonArray([eventData])]);
				}
			} catch {
				// Error during event check
			}
		};

		// Set up polling
		pollTimer = setInterval(checkEvent, pollInterval);

		const closeFunction = async () => {
			clearInterval(pollTimer);
		};

		return {
			closeFunction,
		};
	}
}
