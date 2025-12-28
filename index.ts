/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * n8n-nodes-coldcard
 * 
 * Comprehensive n8n community node for Coldcard hardware wallet integration.
 * Provides 22 resource categories and 200+ operations for Bitcoin custody.
 */

// Export credentials
export * from './credentials/ColdcardDevice.credentials';
export * from './credentials/ColdcardFile.credentials';
export * from './credentials/ColdcardNetwork.credentials';

// Export nodes
export * from './nodes/Coldcard/Coldcard.node';
export * from './nodes/Coldcard/ColdcardTrigger.node';

// Runtime licensing notice (logged once on load)
const LICENSING_NOTICE = `
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`;

// Log licensing notice once on module load
let hasLoggedNotice = false;
if (!hasLoggedNotice) {
	console.warn(LICENSING_NOTICE);
	hasLoggedNotice = true;
}
