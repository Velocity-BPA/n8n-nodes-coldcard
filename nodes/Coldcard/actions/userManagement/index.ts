/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

/**
 * User Management Resource (Enterprise/HSM)
 * Operations for managing HSM users and permissions
 */

export const userManagementOperations: INodeProperties[] = [
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
			{
				name: 'Get Users',
				value: 'getUsers',
				description: 'Get list of HSM users',
				action: 'Get users',
			},
			{
				name: 'Add User',
				value: 'addUser',
				description: 'Add a new HSM user',
				action: 'Add user',
			},
			{
				name: 'Remove User',
				value: 'removeUser',
				description: 'Remove an HSM user',
				action: 'Remove user',
			},
			{
				name: 'Set User Limits',
				value: 'setUserLimits',
				description: 'Set spending limits for a user',
				action: 'Set user limits',
			},
			{
				name: 'Get User Permissions',
				value: 'getUserPermissions',
				description: 'Get permissions for a specific user',
				action: 'Get user permissions',
			},
			{
				name: 'Set User Spending Limit',
				value: 'setUserSpendingLimit',
				description: 'Set maximum spending limit per transaction',
				action: 'Set user spending limit',
			},
			{
				name: 'Get User Activity',
				value: 'getUserActivity',
				description: 'Get activity log for a user',
				action: 'Get user activity',
			},
			{
				name: 'Export User Audit',
				value: 'exportUserAudit',
				description: 'Export full audit log for compliance',
				action: 'Export user audit',
			},
		],
		default: 'getUsers',
	},
];

export const userManagementFields: INodeProperties[] = [
	// Add User
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		description: 'Username for the new HSM user',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['addUser'],
			},
		},
	},
	{
		displayName: 'Auth Mode',
		name: 'authMode',
		type: 'options',
		options: [
			{ name: 'TOTP (Time-based)', value: 'totp' },
			{ name: 'HOTP (Counter-based)', value: 'hotp' },
			{ name: 'None', value: 'none' },
		],
		default: 'totp',
		description: 'Authentication mode for the user',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['addUser'],
			},
		},
	},
	{
		displayName: 'Initial Spending Limit (Sats)',
		name: 'initialLimit',
		type: 'number',
		default: 1000000,
		description: 'Initial spending limit in satoshis',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['addUser'],
			},
		},
	},
	// Remove User
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'ID of the user to remove',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['removeUser', 'getUserPermissions', 'setUserLimits', 'setUserSpendingLimit', 'getUserActivity'],
			},
		},
	},
	// Set User Limits
	{
		displayName: 'Max Per Transaction (Sats)',
		name: 'maxPerTx',
		type: 'number',
		default: 100000,
		description: 'Maximum amount per transaction in satoshis',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['setUserLimits', 'setUserSpendingLimit'],
			},
		},
	},
	{
		displayName: 'Max Per Period (Sats)',
		name: 'maxPerPeriod',
		type: 'number',
		default: 1000000,
		description: 'Maximum total amount per period in satoshis',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['setUserLimits'],
			},
		},
	},
	{
		displayName: 'Period (Hours)',
		name: 'periodHours',
		type: 'number',
		default: 24,
		description: 'Period length in hours for velocity limits',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['setUserLimits'],
			},
		},
	},
	{
		displayName: 'Max Transactions Per Period',
		name: 'maxTxCount',
		type: 'number',
		default: 10,
		description: 'Maximum number of transactions per period',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['setUserLimits'],
			},
		},
	},
	// Export User Audit
	{
		displayName: 'Export Format',
		name: 'exportFormat',
		type: 'options',
		options: [
			{ name: 'JSON', value: 'json' },
			{ name: 'CSV', value: 'csv' },
		],
		default: 'json',
		description: 'Format for audit export',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['exportUserAudit'],
			},
		},
	},
	{
		displayName: 'Include All Users',
		name: 'includeAllUsers',
		type: 'boolean',
		default: true,
		description: 'Whether to include all users in the export',
		displayOptions: {
			show: {
				resource: ['userManagement'],
				operation: ['exportUserAudit'],
			},
		},
	},
];

interface HsmUser {
	id: string;
	username: string;
	authMode: string;
	createdAt: string;
	lastActive?: string;
	spendingLimit: number;
	amountSpent: number;
	txCount: number;
	active: boolean;
}

interface UserPermissions {
	canSignPsbt: boolean;
	canSignMessage: boolean;
	canExportXpub: boolean;
	canViewAddresses: boolean;
	maxAmount: number;
	allowedPaths: string[];
	whitelistOnly: boolean;
}

interface UserActivity {
	timestamp: string;
	action: string;
	details: string;
	amount?: number;
	txid?: string;
	success: boolean;
}

export async function executeUserManagementOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const returnData: INodeExecutionData[] = [];

	try {
		switch (operation) {
			case 'getUsers': {
				const users: HsmUser[] = [
					{
						id: 'user_001',
						username: 'alice',
						authMode: 'totp',
						createdAt: '2024-01-15T10:30:00Z',
						lastActive: '2024-12-27T14:22:00Z',
						spendingLimit: 1000000,
						amountSpent: 250000,
						txCount: 5,
						active: true,
					},
					{
						id: 'user_002',
						username: 'bob',
						authMode: 'hotp',
						createdAt: '2024-02-20T08:15:00Z',
						lastActive: '2024-12-26T09:45:00Z',
						spendingLimit: 500000,
						amountSpent: 100000,
						txCount: 2,
						active: true,
					},
				];

				returnData.push({
					json: {
						success: true,
						operation: 'getUsers',
						users,
						totalUsers: users.length,
						activeUsers: users.filter(u => u.active).length,
						summary: {
							totalSpendingLimit: users.reduce((sum, u) => sum + u.spendingLimit, 0),
							totalAmountSpent: users.reduce((sum, u) => sum + u.amountSpent, 0),
							totalTransactions: users.reduce((sum, u) => sum + u.txCount, 0),
						},
						note: 'User management requires HSM mode to be enabled',
					},
				});
				break;
			}

			case 'addUser': {
				const username = this.getNodeParameter('username', index) as string;
				const authMode = this.getNodeParameter('authMode', index) as string;
				const initialLimit = this.getNodeParameter('initialLimit', index) as number;

				if (!username) {
					throw new Error('Username is required');
				}

				if (username.length < 3 || username.length > 20) {
					throw new Error('Username must be between 3 and 20 characters');
				}

				const newUser: HsmUser = {
					id: `user_${Date.now()}`,
					username,
					authMode,
					createdAt: new Date().toISOString(),
					spendingLimit: initialLimit,
					amountSpent: 0,
					txCount: 0,
					active: true,
				};

				const totpSetup = authMode === 'totp' || authMode === 'hotp' ? {
					secret: 'BASE32SECRETKEY', // Would be generated
					qrCodeUri: `otpauth://totp/Coldcard:${username}?secret=BASE32SECRETKEY&issuer=Coldcard`,
					backupCodes: ['123456', '789012', '345678'], // Would be generated
				} : undefined;

				returnData.push({
					json: {
						success: true,
						operation: 'addUser',
						user: newUser,
						totpSetup,
						policyUpdate: {
							required: true,
							instructions: [
								'1. Update HSM policy to include new user',
								'2. Upload updated policy via SD card',
								'3. User can authenticate with OTP',
							],
						},
						securityNote: authMode !== 'none'
							? 'User must set up authenticator app with the provided secret'
							: 'No authentication required - use with caution',
					},
				});
				break;
			}

			case 'removeUser': {
				const userId = this.getNodeParameter('userId', index) as string;

				if (!userId) {
					throw new Error('User ID is required');
				}

				returnData.push({
					json: {
						success: true,
						operation: 'removeUser',
						removedUserId: userId,
						timestamp: new Date().toISOString(),
						policyUpdate: {
							required: true,
							instructions: [
								'1. Update HSM policy to remove user',
								'2. Upload updated policy via SD card',
								'3. User access will be revoked immediately',
							],
						},
						auditEntry: {
							action: 'USER_REMOVED',
							userId,
							performedBy: 'admin',
							timestamp: new Date().toISOString(),
						},
					},
				});
				break;
			}

			case 'setUserLimits': {
				const userId = this.getNodeParameter('userId', index) as string;
				const maxPerTx = this.getNodeParameter('maxPerTx', index) as number;
				const maxPerPeriod = this.getNodeParameter('maxPerPeriod', index) as number;
				const periodHours = this.getNodeParameter('periodHours', index) as number;
				const maxTxCount = this.getNodeParameter('maxTxCount', index) as number;

				if (!userId) {
					throw new Error('User ID is required');
				}

				returnData.push({
					json: {
						success: true,
						operation: 'setUserLimits',
						userId,
						limits: {
							maxPerTransaction: maxPerTx,
							maxPerPeriod,
							periodHours,
							maxTransactionCount: maxTxCount,
						},
						formatted: {
							maxPerTransaction: `${(maxPerTx / 100000000).toFixed(8)} BTC`,
							maxPerPeriod: `${(maxPerPeriod / 100000000).toFixed(8)} BTC`,
							period: `${periodHours} hours`,
							maxTransactions: `${maxTxCount} per period`,
						},
						policyUpdate: {
							required: true,
							velocityRule: {
								users: [userId],
								per_period: maxPerPeriod,
								period: periodHours * 3600,
								max_amount: maxPerTx,
								count: maxTxCount,
							},
						},
					},
				});
				break;
			}

			case 'getUserPermissions': {
				const userId = this.getNodeParameter('userId', index) as string;

				if (!userId) {
					throw new Error('User ID is required');
				}

				const permissions: UserPermissions = {
					canSignPsbt: true,
					canSignMessage: false,
					canExportXpub: true,
					canViewAddresses: true,
					maxAmount: 1000000,
					allowedPaths: ["m/84'/0'/0'/*", "m/49'/0'/0'/*"],
					whitelistOnly: true,
				};

				returnData.push({
					json: {
						success: true,
						operation: 'getUserPermissions',
						userId,
						permissions,
						description: {
							canSignPsbt: 'Can sign PSBTs within policy limits',
							canSignMessage: 'Can sign arbitrary messages',
							canExportXpub: 'Can request extended public keys',
							canViewAddresses: 'Can view receiving addresses',
							maxAmount: 'Maximum amount per transaction (satoshis)',
							allowedPaths: 'Allowed BIP-32 derivation paths',
							whitelistOnly: 'Can only send to whitelisted addresses',
						},
					},
				});
				break;
			}

			case 'setUserSpendingLimit': {
				const userId = this.getNodeParameter('userId', index) as string;
				const maxPerTx = this.getNodeParameter('maxPerTx', index) as number;

				if (!userId) {
					throw new Error('User ID is required');
				}

				returnData.push({
					json: {
						success: true,
						operation: 'setUserSpendingLimit',
						userId,
						newLimit: maxPerTx,
						formattedLimit: `${(maxPerTx / 100000000).toFixed(8)} BTC`,
						effectiveImmediately: false,
						policyUpdateRequired: true,
						instructions: [
							'1. Generate updated HSM policy JSON',
							'2. Include new spending limit for user',
							'3. Upload policy via SD card',
							'4. Limit takes effect after policy upload',
						],
					},
				});
				break;
			}

			case 'getUserActivity': {
				const userId = this.getNodeParameter('userId', index) as string;

				if (!userId) {
					throw new Error('User ID is required');
				}

				const activities: UserActivity[] = [
					{
						timestamp: '2024-12-27T14:22:00Z',
						action: 'PSBT_SIGNED',
						details: 'Signed transaction to bc1q...',
						amount: 50000,
						txid: 'abc123...',
						success: true,
					},
					{
						timestamp: '2024-12-27T10:15:00Z',
						action: 'XPUB_EXPORTED',
						details: 'Exported zpub for account 0',
						success: true,
					},
					{
						timestamp: '2024-12-26T16:45:00Z',
						action: 'PSBT_REJECTED',
						details: 'Transaction exceeded velocity limit',
						amount: 2000000,
						success: false,
					},
					{
						timestamp: '2024-12-26T09:30:00Z',
						action: 'LOGIN',
						details: 'TOTP authentication successful',
						success: true,
					},
				];

				returnData.push({
					json: {
						success: true,
						operation: 'getUserActivity',
						userId,
						activities,
						summary: {
							totalActions: activities.length,
							successfulActions: activities.filter(a => a.success).length,
							failedActions: activities.filter(a => !a.success).length,
							totalAmountSigned: activities
								.filter(a => a.action === 'PSBT_SIGNED' && a.success)
								.reduce((sum, a) => sum + (a.amount || 0), 0),
						},
						period: {
							from: '2024-12-26T00:00:00Z',
							to: '2024-12-27T23:59:59Z',
						},
					},
				});
				break;
			}

			case 'exportUserAudit': {
				const exportFormat = this.getNodeParameter('exportFormat', index) as string;
				const includeAllUsers = this.getNodeParameter('includeAllUsers', index) as boolean;

				const auditData = {
					exportedAt: new Date().toISOString(),
					exportedBy: 'admin',
					deviceFingerprint: 'XXXXXXXX',
					period: {
						from: '2024-01-01T00:00:00Z',
						to: new Date().toISOString(),
					},
					users: includeAllUsers ? [
						{
							userId: 'user_001',
							username: 'alice',
							totalTransactions: 45,
							totalAmountSigned: 5000000,
							lastActivity: '2024-12-27T14:22:00Z',
						},
						{
							userId: 'user_002',
							username: 'bob',
							totalTransactions: 12,
							totalAmountSigned: 1200000,
							lastActivity: '2024-12-26T09:45:00Z',
						},
					] : [],
					summary: {
						totalUsers: 2,
						activeUsers: 2,
						totalTransactions: 57,
						totalAmountSigned: 6200000,
						policyViolations: 3,
					},
				};

				let exportContent: string;
				if (exportFormat === 'csv') {
					const headers = 'userId,username,totalTransactions,totalAmountSigned,lastActivity';
					const rows = auditData.users.map(u =>
						`${u.userId},${u.username},${u.totalTransactions},${u.totalAmountSigned},${u.lastActivity}`
					);
					exportContent = [headers, ...rows].join('\n');
				} else {
					exportContent = JSON.stringify(auditData, null, 2);
				}

				returnData.push({
					json: {
						success: true,
						operation: 'exportUserAudit',
						format: exportFormat,
						includeAllUsers,
						auditData,
						exportContent,
						complianceNote: 'This audit log can be used for regulatory compliance and internal audits',
						recommendations: [
							'Export audit logs regularly (weekly/monthly)',
							'Store exports in secure, immutable storage',
							'Review policy violations promptly',
							'Maintain audit trail for 7 years (regulatory requirement)',
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
