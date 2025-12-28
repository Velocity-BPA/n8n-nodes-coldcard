/**
 * @fileoverview Unit tests for Coldcard n8n node
 * @license BSL-1.1
 * @copyright Velocity BPA 2025
 */

import { Coldcard } from '../../nodes/Coldcard/Coldcard.node';

describe('Coldcard Node', () => {
	let node: Coldcard;

	beforeEach(() => {
		node = new Coldcard();
	});

	describe('Node Properties', () => {
		it('should have correct display name', () => {
			expect(node.description.displayName).toBe('Coldcard');
		});

		it('should have correct name identifier', () => {
			expect(node.description.name).toBe('coldcard');
		});

		it('should be in correct category', () => {
			expect(node.description.group).toContain('transform');
		});

		it('should have correct version', () => {
			expect(node.description.version).toBe(1);
		});

		it('should have icon defined', () => {
			expect(node.description.icon).toBeDefined();
		});

		it('should have description text', () => {
			expect(node.description.description).toContain('Coldcard');
		});
	});

	describe('Resources', () => {
		it('should have all 22 resources defined', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			expect(resourceProperty).toBeDefined();
			expect(resourceProperty?.options?.length).toBe(22);
		});

		it('should have device resource', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			const deviceResource = resourceProperty?.options?.find(
				(o: any) => o.value === 'device'
			);
			expect(deviceResource).toBeDefined();
		});

		it('should have account resource', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			const accountResource = resourceProperty?.options?.find(
				(o: any) => o.value === 'account'
			);
			expect(accountResource).toBeDefined();
		});

		it('should have transaction resource', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			const transactionResource = resourceProperty?.options?.find(
				(o: any) => o.value === 'transaction'
			);
			expect(transactionResource).toBeDefined();
		});

		it('should have multisig resource', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			const multisigResource = resourceProperty?.options?.find(
				(o: any) => o.value === 'multisig'
			);
			expect(multisigResource).toBeDefined();
		});

		it('should have hsm resource', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			const hsmResource = resourceProperty?.options?.find(
				(o: any) => o.value === 'hsm'
			);
			expect(hsmResource).toBeDefined();
		});

		it('should have nfc resource', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			const nfcResource = resourceProperty?.options?.find(
				(o: any) => o.value === 'nfc'
			);
			expect(nfcResource).toBeDefined();
		});
	});

	describe('Credentials', () => {
		it('should require coldcardDevice credentials', () => {
			const creds = node.description.credentials;
			const deviceCred = creds?.find((c) => c.name === 'coldcardDevice');
			expect(deviceCred).toBeDefined();
		});

		it('should have optional coldcardFile credentials', () => {
			const creds = node.description.credentials;
			const fileCred = creds?.find((c) => c.name === 'coldcardFile');
			expect(fileCred).toBeDefined();
		});

		it('should have optional coldcardNetwork credentials', () => {
			const creds = node.description.credentials;
			const networkCred = creds?.find((c) => c.name === 'coldcardNetwork');
			expect(networkCred).toBeDefined();
		});
	});

	describe('Inputs and Outputs', () => {
		it('should have one input', () => {
			expect(node.description.inputs).toEqual(['main']);
		});

		it('should have one output', () => {
			expect(node.description.outputs).toEqual(['main']);
		});
	});

	describe('Default Values', () => {
		it('should default resource to device', () => {
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			expect(resourceProperty?.default).toBe('device');
		});
	});
});
