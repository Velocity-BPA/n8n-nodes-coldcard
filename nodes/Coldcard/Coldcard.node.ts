/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import operations
import * as device from './actions/device';
import * as account from './actions/account';
import * as address from './actions/address';
import * as transaction from './actions/transaction';
import * as message from './actions/message';
import * as multisig from './actions/multisig';
import * as hsm from './actions/hsm';
import * as sdCard from './actions/sdCard';
import * as backup from './actions/backup';
import * as seed from './actions/seed';
import * as pin from './actions/pin';
import * as security from './actions/security';
import * as psbtAnalysis from './actions/psbtAnalysis';
import * as electrum from './actions/electrum';
import * as sparrow from './actions/sparrow';
import * as specter from './actions/specter';
import * as bitcoinCore from './actions/bitcoinCore';
import * as nfc from './actions/nfc';
import * as virtualDisk from './actions/virtualDisk';
import * as settings from './actions/settings';
import * as userManagement from './actions/userManagement';
import * as utility from './actions/utility';

// Log licensing notice once on load
const LICENSING_NOTICE_LOGGED = Symbol.for('coldcard.license.logged');
if (!(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED]) {
	console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
	(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED] = true;
}

export class Coldcard implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Coldcard',
		name: 'coldcard',
		icon: 'file:coldcard.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Coldcard hardware wallet for air-gapped Bitcoin signing',
		defaults: {
			name: 'Coldcard',
		},
		inputs: ['main'],
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
			{
				name: 'coldcardNetwork',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
						description: 'Manage account keys and wallet exports',
					},
					{
						name: 'Address',
						value: 'address',
						description: 'Generate and verify Bitcoin addresses',
					},
					{
						name: 'Backup',
						value: 'backup',
						description: 'Create and manage encrypted backups',
					},
					{
						name: 'Bitcoin Core',
						value: 'bitcoinCore',
						description: 'Bitcoin Core wallet integration',
					},
					{
						name: 'Device',
						value: 'device',
						description: 'Device information and connection',
					},
					{
						name: 'Electrum',
						value: 'electrum',
						description: 'Electrum wallet integration',
					},
					{
						name: 'HSM',
						value: 'hsm',
						description: 'Hardware Security Module mode',
					},
					{
						name: 'Message',
						value: 'message',
						description: 'Sign and verify messages',
					},
					{
						name: 'Multisig',
						value: 'multisig',
						description: 'Multi-signature wallet operations',
					},
					{
						name: 'NFC',
						value: 'nfc',
						description: 'NFC operations (Coldcard Q only)',
					},
					{
						name: 'PIN',
						value: 'pin',
						description: 'PIN management and security',
					},
					{
						name: 'PSBT Analysis',
						value: 'psbtAnalysis',
						description: 'Analyze PSBT transactions',
					},
					{
						name: 'SD Card',
						value: 'sdCard',
						description: 'SD card file operations',
					},
					{
						name: 'Security',
						value: 'security',
						description: 'Security settings and verification',
					},
					{
						name: 'Seed',
						value: 'seed',
						description: 'Seed and passphrase management',
					},
					{
						name: 'Settings',
						value: 'settings',
						description: 'Device settings configuration',
					},
					{
						name: 'Sparrow',
						value: 'sparrow',
						description: 'Sparrow wallet integration',
					},
					{
						name: 'Specter',
						value: 'specter',
						description: 'Specter Desktop integration',
					},
					{
						name: 'Transaction',
						value: 'transaction',
						description: 'PSBT transaction signing',
					},
					{
						name: 'User Management',
						value: 'userManagement',
						description: 'HSM user management',
					},
					{
						name: 'Utility',
						value: 'utility',
						description: 'Utility operations and diagnostics',
					},
					{
						name: 'Virtual Disk',
						value: 'virtualDisk',
						description: 'Virtual disk mode operations',
					},
				],
				default: 'device',
			},

			// Device Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['device'],
					},
				},
				options: [
					{ name: 'Check for Updates', value: 'checkUpdates', description: 'Check if firmware update is available', action: 'Check for updates' },
					{ name: 'Connect', value: 'connect', description: 'Connect to Coldcard device via USB', action: 'Connect to device' },
					{ name: 'Get Bag Number', value: 'getBagNumber', description: 'Get factory bag number', action: 'Get bag number' },
					{ name: 'Get Battery Status', value: 'getBatteryStatus', description: 'Get battery status (Q model only)', action: 'Get battery status' },
					{ name: 'Get Device Info', value: 'getInfo', description: 'Get comprehensive device information', action: 'Get device info' },
					{ name: 'Get Firmware Version', value: 'getFirmwareVersion', description: 'Get firmware version', action: 'Get firmware version' },
					{ name: 'Get NFC Status', value: 'getNfcStatus', description: 'Get NFC status (Q model only)', action: 'Get NFC status' },
					{ name: 'Get Serial Number', value: 'getSerialNumber', description: 'Get device serial number', action: 'Get serial number' },
					{ name: 'Get State', value: 'getState', description: 'Get current device state', action: 'Get device state' },
					{ name: 'Get XFP', value: 'getXfp', description: 'Get master fingerprint (XFP)', action: 'Get master fingerprint' },
					{ name: 'Verify Genuineness', value: 'verifyGenuineness', description: 'Verify device authenticity', action: 'Verify genuineness' },
				],
				default: 'getInfo',
			},

			// Account Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{ name: 'Export Bitcoin Core Descriptor', value: 'exportCoreDescriptor', description: 'Export Bitcoin Core descriptor', action: 'Export core descriptor' },
					{ name: 'Export Electrum Wallet', value: 'exportElectrum', description: 'Export Electrum wallet file', action: 'Export electrum wallet' },
					{ name: 'Export Generic JSON', value: 'exportGenericJson', description: 'Export generic JSON wallet', action: 'Export generic JSON' },
					{ name: 'Export Public Key File', value: 'exportPublicKey', description: 'Export public key file', action: 'Export public key' },
					{ name: 'Export Sparrow Wallet', value: 'exportSparrow', description: 'Export Sparrow wallet file', action: 'Export sparrow wallet' },
					{ name: 'Export Specter Desktop', value: 'exportSpecter', description: 'Export Specter Desktop config', action: 'Export specter config' },
					{ name: 'Export Wasabi Wallet', value: 'exportWasabi', description: 'Export Wasabi wallet file', action: 'Export wasabi wallet' },
					{ name: 'Get Account Descriptor', value: 'getDescriptor', description: 'Get account output descriptor', action: 'Get account descriptor' },
					{ name: 'Get Derivation Path', value: 'getDerivationPath', description: 'Get account derivation path', action: 'Get derivation path' },
					{ name: 'Get Master Fingerprint', value: 'getMasterFingerprint', description: 'Get master fingerprint (XFP)', action: 'Get master fingerprint' },
					{ name: 'Get xPub', value: 'getXpub', description: 'Get extended public key (xpub)', action: 'Get xpub' },
					{ name: 'Get yPub', value: 'getYpub', description: 'Get P2SH-P2WPKH public key (ypub)', action: 'Get ypub' },
					{ name: 'Get zPub', value: 'getZpub', description: 'Get P2WPKH native public key (zpub)', action: 'Get zpub' },
				],
				default: 'getXpub',
			},

			// Address Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['address'],
					},
				},
				options: [
					{ name: 'Display on Device', value: 'display', description: 'Display address on device screen', action: 'Display address on device' },
					{ name: 'Export Address List', value: 'exportList', description: 'Export list of addresses', action: 'Export address list' },
					{ name: 'Get Address', value: 'get', description: 'Get Bitcoin address', action: 'Get address' },
					{ name: 'Get Address at Index', value: 'getAtIndex', description: 'Get address at specific index', action: 'Get address at index' },
					{ name: 'Get Address at Path', value: 'getAtPath', description: 'Get address at derivation path', action: 'Get address at path' },
					{ name: 'Get Address Range', value: 'getRange', description: 'Get range of addresses', action: 'Get address range' },
					{ name: 'Get Change Address', value: 'getChange', description: 'Get change address', action: 'Get change address' },
					{ name: 'Get Multisig Address', value: 'getMultisig', description: 'Get multisig address', action: 'Get multisig address' },
					{ name: 'Verify Address', value: 'verify', description: 'Verify address belongs to wallet', action: 'Verify address' },
				],
				default: 'get',
			},

			// Transaction Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
					},
				},
				options: [
					{ name: 'Analyze PSBT', value: 'analyze', description: 'Analyze PSBT transaction', action: 'Analyze PSBT' },
					{ name: 'Broadcast Transaction', value: 'broadcast', description: 'Broadcast signed transaction', action: 'Broadcast transaction' },
					{ name: 'Export Signed PSBT', value: 'exportSigned', description: 'Export signed PSBT', action: 'Export signed PSBT' },
					{ name: 'Extract Transaction', value: 'extract', description: 'Extract final transaction', action: 'Extract transaction' },
					{ name: 'Finalize PSBT', value: 'finalize', description: 'Finalize signed PSBT', action: 'Finalize PSBT' },
					{ name: 'Get PSBT Info', value: 'getInfo', description: 'Get PSBT information', action: 'Get PSBT info' },
					{ name: 'Get PSBT Inputs', value: 'getInputs', description: 'Get PSBT input details', action: 'Get PSBT inputs' },
					{ name: 'Get PSBT Outputs', value: 'getOutputs', description: 'Get PSBT output details', action: 'Get PSBT outputs' },
					{ name: 'Get PSBT Warnings', value: 'getWarnings', description: 'Get PSBT security warnings', action: 'Get PSBT warnings' },
					{ name: 'Get Signing Progress', value: 'getProgress', description: 'Get signing progress', action: 'Get signing progress' },
					{ name: 'Import PSBT (Base64)', value: 'importBase64', description: 'Import PSBT from base64', action: 'Import PSBT from base64' },
					{ name: 'Import PSBT (File)', value: 'importFile', description: 'Import PSBT from file', action: 'Import PSBT from file' },
					{ name: 'Import PSBT (Hex)', value: 'importHex', description: 'Import PSBT from hex', action: 'Import PSBT from hex' },
					{ name: 'Sign PSBT', value: 'sign', description: 'Sign PSBT transaction', action: 'Sign PSBT' },
				],
				default: 'sign',
			},

			// Message Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{ name: 'Export Signature', value: 'exportSignature', description: 'Export message signature', action: 'Export signature' },
					{ name: 'Sign Message', value: 'sign', description: 'Sign a message', action: 'Sign message' },
					{ name: 'Sign Message at Path', value: 'signAtPath', description: 'Sign message at derivation path', action: 'Sign message at path' },
					{ name: 'Sign RFC 2440 Message', value: 'signRfc2440', description: 'Sign RFC 2440 cleartext message', action: 'Sign RFC 2440 message' },
					{ name: 'Sign with Address', value: 'signWithAddress', description: 'Sign with specific address', action: 'Sign with address' },
					{ name: 'Verify Signature', value: 'verify', description: 'Verify message signature', action: 'Verify signature' },
				],
				default: 'sign',
			},

			// Multisig Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['multisig'],
					},
				},
				options: [
					{ name: 'Add Co-Signer', value: 'addCosigner', description: 'Add co-signer to wallet', action: 'Add co-signer' },
					{ name: 'Create Multisig Wallet', value: 'create', description: 'Create new multisig wallet', action: 'Create multisig wallet' },
					{ name: 'Export BSMS', value: 'exportBsms', description: 'Export BSMS configuration', action: 'Export BSMS' },
					{ name: 'Export Multisig Config', value: 'exportConfig', description: 'Export multisig configuration', action: 'Export config' },
					{ name: 'Export Multisig Descriptor', value: 'exportDescriptor', description: 'Export output descriptor', action: 'Export descriptor' },
					{ name: 'Get Co-Signers', value: 'getCosigners', description: 'Get list of co-signers', action: 'Get co-signers' },
					{ name: 'Get Multisig Address', value: 'getAddress', description: 'Get multisig address', action: 'Get multisig address' },
					{ name: 'Get Multisig Info', value: 'getInfo', description: 'Get multisig wallet info', action: 'Get multisig info' },
					{ name: 'Get Multisig Policy', value: 'getPolicy', description: 'Get multisig policy', action: 'Get multisig policy' },
					{ name: 'Get Quorum Info', value: 'getQuorum', description: 'Get quorum information', action: 'Get quorum info' },
					{ name: 'Import BSMS', value: 'importBsms', description: 'Import BSMS configuration', action: 'Import BSMS' },
					{ name: 'Import Multisig Config', value: 'importConfig', description: 'Import multisig configuration', action: 'Import config' },
					{ name: 'Remove Co-Signer', value: 'removeCosigner', description: 'Remove co-signer from wallet', action: 'Remove co-signer' },
					{ name: 'Sign Multisig PSBT', value: 'sign', description: 'Sign multisig transaction', action: 'Sign multisig PSBT' },
				],
				default: 'getInfo',
			},

			// HSM Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['hsm'],
					},
				},
				options: [
					{ name: 'Add to Whitelist', value: 'addWhitelist', description: 'Add address to whitelist', action: 'Add to whitelist' },
					{ name: 'Add User', value: 'addUser', description: 'Add HSM user', action: 'Add HSM user' },
					{ name: 'Disable HSM Mode', value: 'disable', description: 'Disable HSM mode', action: 'Disable HSM mode' },
					{ name: 'Enable HSM Mode', value: 'enable', description: 'Enable HSM mode', action: 'Enable HSM mode' },
					{ name: 'Get HSM Limits', value: 'getLimits', description: 'Get spending limits', action: 'Get HSM limits' },
					{ name: 'Get HSM Log', value: 'getLog', description: 'Get HSM activity log', action: 'Get HSM log' },
					{ name: 'Get HSM Policy', value: 'getPolicy', description: 'Get current HSM policy', action: 'Get HSM policy' },
					{ name: 'Get HSM Status', value: 'getStatus', description: 'Get HSM status', action: 'Get HSM status' },
					{ name: 'Get HSM Users', value: 'getUsers', description: 'Get HSM users', action: 'Get HSM users' },
					{ name: 'Get HSM Velocity', value: 'getVelocity', description: 'Get velocity limits', action: 'Get HSM velocity' },
					{ name: 'Get Whitelist', value: 'getWhitelist', description: 'Get address whitelist', action: 'Get whitelist' },
					{ name: 'Remove from Whitelist', value: 'removeWhitelist', description: 'Remove from whitelist', action: 'Remove from whitelist' },
					{ name: 'Remove User', value: 'removeUser', description: 'Remove HSM user', action: 'Remove HSM user' },
					{ name: 'Test Policy', value: 'testPolicy', description: 'Test HSM policy', action: 'Test HSM policy' },
					{ name: 'Upload Policy', value: 'uploadPolicy', description: 'Upload HSM policy', action: 'Upload HSM policy' },
				],
				default: 'getStatus',
			},

			// SD Card Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sdCard'],
					},
				},
				options: [
					{ name: 'Delete File', value: 'delete', description: 'Delete file from SD card', action: 'Delete file' },
					{ name: 'Eject SD Card', value: 'eject', description: 'Safely eject SD card', action: 'Eject SD card' },
					{ name: 'Export File', value: 'export', description: 'Export file to SD card', action: 'Export file' },
					{ name: 'Get File Hash', value: 'getHash', description: 'Get file SHA-256 hash', action: 'Get file hash' },
					{ name: 'Get Free Space', value: 'getFreeSpace', description: 'Get available space', action: 'Get free space' },
					{ name: 'Get Status', value: 'getStatus', description: 'Get SD card status', action: 'Get status' },
					{ name: 'Import File', value: 'import', description: 'Import file from SD card', action: 'Import file' },
					{ name: 'List Files', value: 'list', description: 'List files on SD card', action: 'List files' },
					{ name: 'Read File', value: 'read', description: 'Read file from SD card', action: 'Read file' },
					{ name: 'Verify File Signature', value: 'verifySignature', description: 'Verify file signature', action: 'Verify file signature' },
					{ name: 'Write File', value: 'write', description: 'Write file to SD card', action: 'Write file' },
				],
				default: 'list',
			},

			// Backup Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['backup'],
					},
				},
				options: [
					{ name: 'Combine Seed XOR', value: 'combineSeedXor', description: 'Combine Seed XOR shares', action: 'Combine seed XOR' },
					{ name: 'Countdown Backup', value: 'countdown', description: 'Start countdown backup', action: 'Countdown backup' },
					{ name: 'Create Encrypted Backup', value: 'create', description: 'Create encrypted backup', action: 'Create backup' },
					{ name: 'Create Paper Backup', value: 'createPaper', description: 'Create paper backup words', action: 'Create paper backup' },
					{ name: 'Create Seed XOR', value: 'createSeedXor', description: 'Create Seed XOR shares', action: 'Create seed XOR' },
					{ name: 'Export to SD', value: 'exportToSd', description: 'Export backup to SD card', action: 'Export to SD' },
					{ name: 'Get Backup Info', value: 'getInfo', description: 'Get backup information', action: 'Get backup info' },
					{ name: 'Get Password Hint', value: 'getPasswordHint', description: 'Get backup password hint', action: 'Get password hint' },
					{ name: 'Import from SD', value: 'importFromSd', description: 'Import backup from SD', action: 'Import from SD' },
					{ name: 'Verify Backup', value: 'verify', description: 'Verify backup integrity', action: 'Verify backup' },
					{ name: 'Verify Paper Backup', value: 'verifyPaper', description: 'Verify paper backup', action: 'Verify paper backup' },
				],
				default: 'create',
			},

			// Seed Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['seed'],
					},
				},
				options: [
					{ name: 'Add Passphrase', value: 'addPassphrase', description: 'Add BIP-39 passphrase', action: 'Add passphrase' },
					{ name: 'Clear Passphrase', value: 'clearPassphrase', description: 'Clear active passphrase', action: 'Clear passphrase' },
					{ name: 'Create Temporary Seed', value: 'createTemporary', description: 'Create temporary seed', action: 'Create temporary seed' },
					{ name: 'Destroy Temporary Seed', value: 'destroyTemporary', description: 'Destroy temporary seed', action: 'Destroy temporary seed' },
					{ name: 'Generate New Seed', value: 'generate', description: 'Generate new seed words', action: 'Generate new seed' },
					{ name: 'Generate Seed XOR', value: 'generateXor', description: 'Generate Seed XOR shares', action: 'Generate seed XOR' },
					{ name: 'Get Duress PIN Wallet', value: 'getDuressWallet', description: 'Get duress PIN wallet', action: 'Get duress wallet' },
					{ name: 'Get Passphrase Status', value: 'getPassphraseStatus', description: 'Get passphrase status', action: 'Get passphrase status' },
					{ name: 'Get Seed Length', value: 'getLength', description: 'Get seed word count', action: 'Get seed length' },
					{ name: 'Import Seed Words', value: 'import', description: 'Import seed words', action: 'Import seed words' },
					{ name: 'Restore from Seed XOR', value: 'restoreXor', description: 'Restore from Seed XOR', action: 'Restore from XOR' },
					{ name: 'Use Secondary PIN Wallet', value: 'useSecondary', description: 'Use secondary PIN wallet', action: 'Use secondary wallet' },
					{ name: 'Verify Seed Words', value: 'verify', description: 'Verify seed words', action: 'Verify seed words' },
				],
				default: 'getLength',
			},

			// PIN Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['pin'],
					},
				},
				options: [
					{ name: 'Change PIN', value: 'change', description: 'Change main PIN', action: 'Change PIN' },
					{ name: 'Configure Trick PIN', value: 'configureTrick', description: 'Configure trick PIN', action: 'Configure trick PIN' },
					{ name: 'Get Login Countdown', value: 'getLoginCountdown', description: 'Get login countdown status', action: 'Get login countdown' },
					{ name: 'Get PIN Attempts Remaining', value: 'getAttempts', description: 'Get remaining PIN attempts', action: 'Get PIN attempts' },
					{ name: 'Get PIN Policy', value: 'getPolicy', description: 'Get PIN policy', action: 'Get PIN policy' },
					{ name: 'Get Trick PINs', value: 'getTricks', description: 'Get configured trick PINs', action: 'Get trick PINs' },
					{ name: 'Set Brick PIN', value: 'setBrick', description: 'Set brick PIN (DANGER)', action: 'Set brick PIN' },
					{ name: 'Set Countdown Policy', value: 'setCountdown', description: 'Set countdown policy', action: 'Set countdown policy' },
					{ name: 'Set Duress PIN', value: 'setDuress', description: 'Set duress PIN', action: 'Set duress PIN' },
					{ name: 'Set Secondary PIN', value: 'setSecondary', description: 'Set secondary PIN', action: 'Set secondary PIN' },
				],
				default: 'getAttempts',
			},

			// Security Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['security'],
					},
				},
				options: [
					{ name: 'Clear Tamper Flags', value: 'clearTamper', description: 'Clear tamper detection flags', action: 'Clear tamper flags' },
					{ name: 'Enable Brick-Me PIN', value: 'enableBrick', description: 'Enable brick-me PIN', action: 'Enable brick-me PIN' },
					{ name: 'Enable/Disable USB', value: 'toggleUsb', description: 'Toggle USB connectivity', action: 'Toggle USB' },
					{ name: 'Get Anti-Phishing Words', value: 'getAntiPhishing', description: 'Get anti-phishing words', action: 'Get anti-phishing words' },
					{ name: 'Get Countdown Status', value: 'getCountdown', description: 'Get countdown status', action: 'Get countdown status' },
					{ name: 'Get Login Settings', value: 'getLoginSettings', description: 'Get login settings', action: 'Get login settings' },
					{ name: 'Get Security Settings', value: 'getSettings', description: 'Get security settings', action: 'Get security settings' },
					{ name: 'Get Tamper Status', value: 'getTamper', description: 'Get tamper detection status', action: 'Get tamper status' },
					{ name: 'Kill Key (Emergency)', value: 'killKey', description: 'Emergency key destruction', action: 'Kill key' },
					{ name: 'Set Anti-Phishing Words', value: 'setAntiPhishing', description: 'Set anti-phishing words', action: 'Set anti-phishing words' },
					{ name: 'Set Login Countdown', value: 'setLoginCountdown', description: 'Set login countdown', action: 'Set login countdown' },
				],
				default: 'getSettings',
			},

			// PSBT Analysis Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['psbtAnalysis'],
					},
				},
				options: [
					{ name: 'Analyze PSBT', value: 'analyze', description: 'Full PSBT analysis', action: 'Analyze PSBT' },
					{ name: 'Check Dust Outputs', value: 'checkDust', description: 'Check for dust outputs', action: 'Check dust outputs' },
					{ name: 'Get Change Detection', value: 'getChange', description: 'Detect change outputs', action: 'Get change detection' },
					{ name: 'Get Fee Info', value: 'getFee', description: 'Get fee information', action: 'Get fee info' },
					{ name: 'Get Input Summary', value: 'getInputs', description: 'Summarize inputs', action: 'Get input summary' },
					{ name: 'Get Output Summary', value: 'getOutputs', description: 'Summarize outputs', action: 'Get output summary' },
					{ name: 'Get Risk Score', value: 'getRisk', description: 'Get transaction risk score', action: 'Get risk score' },
					{ name: 'Get Script Analysis', value: 'getScripts', description: 'Analyze scripts', action: 'Get script analysis' },
					{ name: 'Get Sighash Types', value: 'getSighash', description: 'Get sighash types used', action: 'Get sighash types' },
					{ name: 'Get Warnings', value: 'getWarnings', description: 'Get security warnings', action: 'Get warnings' },
					{ name: 'Verify Destinations', value: 'verifyDestinations', description: 'Verify output destinations', action: 'Verify destinations' },
				],
				default: 'analyze',
			},

			// Electrum Operations
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
					{ name: 'Export Electrum Multisig', value: 'exportMultisig', description: 'Export Electrum multisig', action: 'Export electrum multisig' },
					{ name: 'Export Electrum Wallet', value: 'export', description: 'Export Electrum wallet file', action: 'Export electrum wallet' },
					{ name: 'Get Electrum Format', value: 'getFormat', description: 'Get Electrum format info', action: 'Get electrum format' },
					{ name: 'Sign Electrum Transaction', value: 'sign', description: 'Sign Electrum transaction', action: 'Sign electrum transaction' },
					{ name: 'Verify Electrum File', value: 'verify', description: 'Verify Electrum file', action: 'Verify electrum file' },
				],
				default: 'export',
			},

			// Sparrow Operations
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
					{ name: 'Export Sparrow Multisig', value: 'exportMultisig', description: 'Export Sparrow multisig', action: 'Export sparrow multisig' },
					{ name: 'Export Sparrow Wallet', value: 'export', description: 'Export Sparrow wallet', action: 'Export sparrow wallet' },
					{ name: 'Get Sparrow Config', value: 'getConfig', description: 'Get Sparrow configuration', action: 'Get sparrow config' },
					{ name: 'Sign for Sparrow', value: 'sign', description: 'Sign for Sparrow', action: 'Sign for sparrow' },
				],
				default: 'export',
			},

			// Specter Operations
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
					{ name: 'Export Specter Multisig', value: 'exportMultisig', description: 'Export Specter multisig', action: 'Export specter multisig' },
					{ name: 'Export Specter Wallet', value: 'export', description: 'Export Specter wallet', action: 'Export specter wallet' },
					{ name: 'Get Specter Config', value: 'getConfig', description: 'Get Specter configuration', action: 'Get specter config' },
					{ name: 'Sign for Specter', value: 'sign', description: 'Sign for Specter', action: 'Sign for specter' },
				],
				default: 'export',
			},

			// Bitcoin Core Operations
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
					{ name: 'Export Core Descriptor', value: 'exportDescriptor', description: 'Export Core descriptor', action: 'Export core descriptor' },
					{ name: 'Export Core Multisig', value: 'exportMultisig', description: 'Export Core multisig', action: 'Export core multisig' },
					{ name: 'Get Watch-Only Wallet', value: 'getWatchOnly', description: 'Get watch-only wallet', action: 'Get watch-only wallet' },
					{ name: 'Sign Core PSBT', value: 'sign', description: 'Sign Core PSBT', action: 'Sign core PSBT' },
				],
				default: 'exportDescriptor',
			},

			// NFC Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['nfc'],
					},
				},
				options: [
					{ name: 'Disable NFC', value: 'disable', description: 'Disable NFC', action: 'Disable NFC' },
					{ name: 'Enable NFC', value: 'enable', description: 'Enable NFC', action: 'Enable NFC' },
					{ name: 'Get NFC Settings', value: 'getSettings', description: 'Get NFC settings', action: 'Get NFC settings' },
					{ name: 'Get NFC Status', value: 'getStatus', description: 'Get NFC status', action: 'Get NFC status' },
					{ name: 'NFC Share Address', value: 'shareAddress', description: 'Share address via NFC', action: 'Share address via NFC' },
					{ name: 'NFC Share Signature', value: 'shareSignature', description: 'Share signature via NFC', action: 'Share signature via NFC' },
					{ name: 'NFC Share xPub', value: 'shareXpub', description: 'Share xPub via NFC', action: 'Share xPub via NFC' },
					{ name: 'NFC Sign PSBT', value: 'signPsbt', description: 'Sign PSBT via NFC', action: 'Sign PSBT via NFC' },
					{ name: 'Set NFC Timeout', value: 'setTimeout', description: 'Set NFC timeout', action: 'Set NFC timeout' },
				],
				default: 'getStatus',
			},

			// Virtual Disk Operations
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
					{ name: 'Disable Virtual Disk', value: 'disable', description: 'Disable virtual disk mode', action: 'Disable virtual disk' },
					{ name: 'Enable Virtual Disk', value: 'enable', description: 'Enable virtual disk mode', action: 'Enable virtual disk' },
					{ name: 'Export to Virtual Disk', value: 'export', description: 'Export to virtual disk', action: 'Export to virtual disk' },
					{ name: 'Get Virtual Disk Status', value: 'getStatus', description: 'Get virtual disk status', action: 'Get virtual disk status' },
					{ name: 'Import from Virtual Disk', value: 'import', description: 'Import from virtual disk', action: 'Import from virtual disk' },
				],
				default: 'getStatus',
			},

			// Settings Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['settings'],
					},
				},
				options: [
					{ name: 'Enable/Disable Testnet', value: 'toggleTestnet', description: 'Toggle testnet mode', action: 'Toggle testnet' },
					{ name: 'Enable/Disable USB', value: 'toggleUsb', description: 'Toggle USB', action: 'Toggle USB' },
					{ name: 'Get All Settings', value: 'getAll', description: 'Get all settings', action: 'Get all settings' },
					{ name: 'Get Chain Setting', value: 'getChain', description: 'Get chain (network)', action: 'Get chain setting' },
					{ name: 'Get Developer Settings', value: 'getDeveloper', description: 'Get developer settings', action: 'Get developer settings' },
					{ name: 'Get Display Units', value: 'getDisplayUnits', description: 'Get display units', action: 'Get display units' },
					{ name: 'Set Chain', value: 'setChain', description: 'Set chain (network)', action: 'Set chain' },
					{ name: 'Set Display Units', value: 'setDisplayUnits', description: 'Set display units', action: 'Set display units' },
					{ name: 'Set Idle Timeout', value: 'setIdleTimeout', description: 'Set idle timeout', action: 'Set idle timeout' },
					{ name: 'Set Screen Brightness', value: 'setBrightness', description: 'Set screen brightness', action: 'Set screen brightness' },
				],
				default: 'getAll',
			},

			// User Management Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['userManagement'],
					},
				},
				options: [
					{ name: 'Add User', value: 'add', description: 'Add HSM user', action: 'Add user' },
					{ name: 'Export User Audit', value: 'exportAudit', description: 'Export user audit log', action: 'Export user audit' },
					{ name: 'Get User Activity', value: 'getActivity', description: 'Get user activity', action: 'Get user activity' },
					{ name: 'Get User Permissions', value: 'getPermissions', description: 'Get user permissions', action: 'Get user permissions' },
					{ name: 'Get Users', value: 'getAll', description: 'Get all users', action: 'Get all users' },
					{ name: 'Remove User', value: 'remove', description: 'Remove user', action: 'Remove user' },
					{ name: 'Set User Limits', value: 'setLimits', description: 'Set user limits', action: 'Set user limits' },
					{ name: 'Set User Spending Limit', value: 'setSpendingLimit', description: 'Set spending limit', action: 'Set spending limit' },
				],
				default: 'getAll',
			},

			// Utility Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['utility'],
					},
				},
				options: [
					{ name: 'Calculate Address', value: 'calculateAddress', description: 'Calculate address from pubkey', action: 'Calculate address' },
					{ name: 'Check Upgrade Available', value: 'checkUpgrade', description: 'Check for firmware upgrade', action: 'Check upgrade available' },
					{ name: 'Generate Entropy', value: 'generateEntropy', description: 'Generate random entropy', action: 'Generate entropy' },
					{ name: 'Get Firmware Hash', value: 'getFirmwareHash', description: 'Get firmware hash', action: 'Get firmware hash' },
					{ name: 'Get Random Number', value: 'getRandom', description: 'Get random number', action: 'Get random number' },
					{ name: 'Get Supported Features', value: 'getFeatures', description: 'Get supported features', action: 'Get supported features' },
					{ name: 'Get Version Info', value: 'getVersion', description: 'Get version information', action: 'Get version info' },
					{ name: 'Test Connection', value: 'testConnection', description: 'Test device connection', action: 'Test connection' },
					{ name: 'Validate Address', value: 'validateAddress', description: 'Validate Bitcoin address', action: 'Validate address' },
					{ name: 'Verify Firmware', value: 'verifyFirmware', description: 'Verify firmware signature', action: 'Verify firmware' },
				],
				default: 'testConnection',
			},

			// Common Parameters
			{
				displayName: 'Derivation Path',
				name: 'derivationPath',
				type: 'string',
				default: "m/84'/0'/0'/0/0",
				description: 'BIP-32 derivation path',
				placeholder: "m/84'/0'/0'/0/0",
				displayOptions: {
					show: {
						resource: ['account', 'address', 'message'],
						operation: ['getXpub', 'getYpub', 'getZpub', 'getAtPath', 'signAtPath'],
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
				description: 'Bitcoin address type',
				displayOptions: {
					show: {
						resource: ['address', 'account'],
						operation: ['get', 'getAtIndex', 'getRange', 'getChange', 'display', 'exportList'],
					},
				},
			},
			{
				displayName: 'Address Index',
				name: 'addressIndex',
				type: 'number',
				default: 0,
				description: 'Address index in derivation path',
				displayOptions: {
					show: {
						resource: ['address'],
						operation: ['getAtIndex'],
					},
				},
			},
			{
				displayName: 'PSBT',
				name: 'psbt',
				type: 'string',
				default: '',
				description: 'PSBT data (base64 or hex)',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: ['transaction', 'psbtAnalysis'],
						operation: ['importBase64', 'importHex', 'sign', 'analyze', 'getInfo', 'getInputs', 'getOutputs', 'getWarnings', 'finalize', 'extract', 'getFee', 'getChange', 'getRisk', 'checkDust', 'getScripts', 'getSighash', 'verifyDestinations'],
					},
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Message to sign',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sign', 'signAtPath', 'signRfc2440', 'signWithAddress'],
					},
				},
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Bitcoin address',
				displayOptions: {
					show: {
						resource: ['address', 'message', 'hsm', 'utility'],
						operation: ['verify', 'display', 'signWithAddress', 'addWhitelist', 'removeWhitelist', 'validateAddress'],
					},
				},
			},
			{
				displayName: 'Signature',
				name: 'signature',
				type: 'string',
				default: '',
				description: 'Message signature',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['verify'],
					},
				},
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Name of file on SD card',
				displayOptions: {
					show: {
						resource: ['sdCard'],
						operation: ['read', 'delete', 'getHash', 'verifySignature'],
					},
				},
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'File content to write',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: ['sdCard'],
						operation: ['write'],
					},
				},
			},
			{
				displayName: 'Multisig M (Required Signatures)',
				name: 'multisigM',
				type: 'number',
				default: 2,
				description: 'Number of required signatures',
				displayOptions: {
					show: {
						resource: ['multisig'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Multisig N (Total Signers)',
				name: 'multisigN',
				type: 'number',
				default: 3,
				description: 'Total number of signers',
				displayOptions: {
					show: {
						resource: ['multisig'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Passphrase',
				name: 'passphrase',
				type: 'string',
				default: '',
				description: 'BIP-39 passphrase (25th word)',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						resource: ['seed'],
						operation: ['addPassphrase'],
					},
				},
			},
			{
				displayName: 'Network',
				name: 'network',
				type: 'options',
				options: [
					{ name: 'Mainnet', value: 'mainnet' },
					{ name: 'Testnet', value: 'testnet' },
					{ name: 'Signet', value: 'signet' },
					{ name: 'Regtest', value: 'regtest' },
				],
				default: 'mainnet',
				description: 'Bitcoin network',
				displayOptions: {
					show: {
						resource: ['settings'],
						operation: ['setChain'],
					},
				},
			},
			{
				displayName: 'HSM Policy JSON',
				name: 'hsmPolicy',
				type: 'json',
				default: '{}',
				description: 'HSM policy configuration',
				displayOptions: {
					show: {
						resource: ['hsm'],
						operation: ['uploadPolicy', 'testPolicy'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Account Number',
						name: 'accountNumber',
						type: 'number',
						default: 0,
						description: 'Account number for derivation',
					},
					{
						displayName: 'Include Change',
						name: 'includeChange',
						type: 'boolean',
						default: false,
						description: 'Whether to include change addresses',
					},
					{
						displayName: 'Verify on Device',
						name: 'verifyOnDevice',
						type: 'boolean',
						default: true,
						description: 'Whether to verify on device screen',
					},
					{
						displayName: 'Start Index',
						name: 'startIndex',
						type: 'number',
						default: 0,
						description: 'Starting address index',
					},
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 10,
						description: 'Number of addresses to generate',
					},
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						type: 'options',
						options: [
							{ name: 'JSON', value: 'json' },
							{ name: 'Base64', value: 'base64' },
							{ name: 'Hex', value: 'hex' },
							{ name: 'Binary', value: 'binary' },
						],
						default: 'json',
						description: 'Output format for exports',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getDerivationPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					{ name: "Native SegWit (m/84'/0'/0')", value: "m/84'/0'/0'" },
					{ name: "Nested SegWit (m/49'/0'/0')", value: "m/49'/0'/0'" },
					{ name: "Legacy (m/44'/0'/0')", value: "m/44'/0'/0'" },
					{ name: "Taproot (m/86'/0'/0')", value: "m/86'/0'/0'" },
					{ name: "Multisig P2WSH (m/48'/0'/0'/2')", value: "m/48'/0'/0'/2'" },
				];
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: Record<string, unknown> = {};

				switch (resource) {
					case 'device':
						result = await device.execute.call(this, operation, i);
						break;
					case 'account':
						result = await account.execute.call(this, operation, i);
						break;
					case 'address':
						result = await address.execute.call(this, operation, i);
						break;
					case 'transaction':
						result = await transaction.execute.call(this, operation, i);
						break;
					case 'message':
						result = await message.execute.call(this, operation, i);
						break;
					case 'multisig':
						result = await multisig.execute.call(this, operation, i);
						break;
					case 'hsm':
						result = await hsm.execute.call(this, operation, i);
						break;
					case 'sdCard':
						result = await sdCard.execute.call(this, operation, i);
						break;
					case 'backup':
						result = await backup.execute.call(this, operation, i);
						break;
					case 'seed':
						result = await seed.execute.call(this, operation, i);
						break;
					case 'pin':
						result = await pin.execute.call(this, operation, i);
						break;
					case 'security':
						result = await security.execute.call(this, operation, i);
						break;
					case 'psbtAnalysis':
						result = await psbtAnalysis.execute.call(this, operation, i);
						break;
					case 'electrum':
						result = await electrum.execute.call(this, operation, i);
						break;
					case 'sparrow':
						result = await sparrow.execute.call(this, operation, i);
						break;
					case 'specter':
						result = await specter.execute.call(this, operation, i);
						break;
					case 'bitcoinCore':
						result = await bitcoinCore.execute.call(this, operation, i);
						break;
					case 'nfc':
						result = await nfc.execute.call(this, operation, i);
						break;
					case 'virtualDisk':
						result = await virtualDisk.execute.call(this, operation, i);
						break;
					case 'settings':
						result = await settings.execute.call(this, operation, i);
						break;
					case 'userManagement':
						result = await userManagement.execute.call(this, operation, i);
						break;
					case 'utility':
						result = await utility.execute.call(this, operation, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				returnData.push({ json: result });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
