/**
 * @fileoverview Unit tests for Coldcard Trigger n8n node
 * @license BSL-1.1
 * @copyright Velocity BPA 2025
 */

import { ColdcardTrigger } from '../../nodes/Coldcard/ColdcardTrigger.node';

describe('ColdcardTrigger Node', () => {
	let node: ColdcardTrigger;

	beforeEach(() => {
		node = new ColdcardTrigger();
	});

	describe('Node Properties', () => {
		it('should have correct display name', () => {
			expect(node.description.displayName).toBe('Coldcard Trigger');
		});

		it('should have correct name identifier', () => {
			expect(node.description.name).toBe('coldcardTrigger');
		});

		it('should be a trigger node', () => {
			expect(node.description.group).toContain('trigger');
		});

		it('should have polling capability', () => {
			expect(node.description.polling).toBe(true);
		});

		it('should have icon defined', () => {
			expect(node.description.icon).toBeDefined();
		});
	});

	describe('Trigger Types', () => {
		it('should have triggerType property', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			expect(triggerProperty).toBeDefined();
		});

		it('should have sdCard trigger type', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			const sdCardTrigger = triggerProperty?.options?.find(
				(o: any) => o.value === 'sdCard'
			);
			expect(sdCardTrigger).toBeDefined();
		});

		it('should have device trigger type', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			const deviceTrigger = triggerProperty?.options?.find(
				(o: any) => o.value === 'device'
			);
			expect(deviceTrigger).toBeDefined();
		});

		it('should have signing trigger type', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			const signingTrigger = triggerProperty?.options?.find(
				(o: any) => o.value === 'signing'
			);
			expect(signingTrigger).toBeDefined();
		});

		it('should have hsm trigger type', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			const hsmTrigger = triggerProperty?.options?.find(
				(o: any) => o.value === 'hsm'
			);
			expect(hsmTrigger).toBeDefined();
		});

		it('should have security trigger type', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			const securityTrigger = triggerProperty?.options?.find(
				(o: any) => o.value === 'security'
			);
			expect(securityTrigger).toBeDefined();
		});

		it('should have nfc trigger type', () => {
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerType'
			);
			const nfcTrigger = triggerProperty?.options?.find(
				(o: any) => o.value === 'nfc'
			);
			expect(nfcTrigger).toBeDefined();
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
	});

	describe('Outputs', () => {
		it('should have one output', () => {
			expect(node.description.outputs).toEqual(['main']);
		});
	});
});
