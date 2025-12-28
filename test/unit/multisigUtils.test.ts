/**
 * @fileoverview Unit tests for Multisig utilities
 * @license BSL-1.1
 * @copyright Velocity BPA 2025
 */

import {
	createMultisigConfig,
	validateMultisigQuorum,
	generateMultisigAddress,
	parseMultisigDescriptor,
	createBsmsConfig,
	validateCosigner,
} from '../../nodes/Coldcard/utils/multisigUtils';

describe('Multisig Utilities', () => {
	const sampleXpub = 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';
	const sampleFingerprint = '12345678';

	describe('createMultisigConfig', () => {
		it('should create valid 2-of-3 config', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
				{ xpub: sampleXpub, fingerprint: '22222222' },
				{ xpub: sampleXpub, fingerprint: '33333333' },
			];
			const result = createMultisigConfig(2, cosigners);
			expect(result.requiredSignatures).toBe(2);
			expect(result.totalCosigners).toBe(3);
		});

		it('should include all cosigners', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
				{ xpub: sampleXpub, fingerprint: '22222222' },
			];
			const result = createMultisigConfig(2, cosigners);
			expect(result.cosigners.length).toBe(2);
		});

		it('should set correct script type', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
				{ xpub: sampleXpub, fingerprint: '22222222' },
			];
			const result = createMultisigConfig(2, cosigners, 'p2wsh');
			expect(result.scriptType).toBe('p2wsh');
		});
	});

	describe('validateMultisigQuorum', () => {
		it('should validate correct quorum', () => {
			const result = validateMultisigQuorum(2, 3);
			expect(result.isValid).toBe(true);
		});

		it('should reject M > N', () => {
			const result = validateMultisigQuorum(4, 3);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('required signatures');
		});

		it('should reject M = 0', () => {
			const result = validateMultisigQuorum(0, 3);
			expect(result.isValid).toBe(false);
		});

		it('should reject N > 15', () => {
			const result = validateMultisigQuorum(8, 16);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('maximum');
		});

		it('should accept 1-of-1', () => {
			const result = validateMultisigQuorum(1, 1);
			expect(result.isValid).toBe(true);
		});

		it('should accept 15-of-15', () => {
			const result = validateMultisigQuorum(15, 15);
			expect(result.isValid).toBe(true);
		});
	});

	describe('generateMultisigAddress', () => {
		it('should generate P2WSH address', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
				{ xpub: sampleXpub, fingerprint: '22222222' },
			];
			const result = generateMultisigAddress(2, cosigners, 'p2wsh', 0, 'mainnet');
			expect(result.address).toBeDefined();
			expect(result.address.startsWith('bc1')).toBe(true);
		});

		it('should generate testnet address', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
				{ xpub: sampleXpub, fingerprint: '22222222' },
			];
			const result = generateMultisigAddress(2, cosigners, 'p2wsh', 0, 'testnet');
			expect(result.address.startsWith('tb1') || result.address.startsWith('2')).toBe(true);
		});

		it('should include derivation path', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
				{ xpub: sampleXpub, fingerprint: '22222222' },
			];
			const result = generateMultisigAddress(2, cosigners, 'p2wsh', 5);
			expect(result.derivationPath).toContain('/5');
		});
	});

	describe('parseMultisigDescriptor', () => {
		it('should parse wsh(multi(...)) descriptor', () => {
			const descriptor = 'wsh(multi(2,[11111111/48h/0h/0h/2h]xpub...,[22222222/48h/0h/0h/2h]xpub...))';
			const result = parseMultisigDescriptor(descriptor);
			expect(result.type).toBe('wsh');
			expect(result.threshold).toBe(2);
		});

		it('should parse sortedmulti descriptor', () => {
			const descriptor = 'wsh(sortedmulti(2,[11111111/48h/0h/0h/2h]xpub...,[22222222/48h/0h/0h/2h]xpub...))';
			const result = parseMultisigDescriptor(descriptor);
			expect(result.sorted).toBe(true);
		});

		it('should extract fingerprints', () => {
			const descriptor = 'wsh(multi(2,[11111111/48h/0h/0h/2h]xpub...,[22222222/48h/0h/0h/2h]xpub...))';
			const result = parseMultisigDescriptor(descriptor);
			expect(result.fingerprints).toContain('11111111');
			expect(result.fingerprints).toContain('22222222');
		});
	});

	describe('createBsmsConfig', () => {
		it('should create valid BSMS format', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111', name: 'Device1' },
				{ xpub: sampleXpub, fingerprint: '22222222', name: 'Device2' },
			];
			const result = createBsmsConfig('TestWallet', 2, cosigners);
			expect(result.BSMS).toBeDefined();
			expect(result.name).toBe('TestWallet');
		});

		it('should include version', () => {
			const cosigners = [
				{ xpub: sampleXpub, fingerprint: '11111111' },
			];
			const result = createBsmsConfig('Test', 1, cosigners);
			expect(result.version).toBeDefined();
		});
	});

	describe('validateCosigner', () => {
		it('should validate correct cosigner', () => {
			const cosigner = {
				xpub: sampleXpub,
				fingerprint: sampleFingerprint,
				derivationPath: "m/48'/0'/0'/2'",
			};
			const result = validateCosigner(cosigner);
			expect(result.isValid).toBe(true);
		});

		it('should reject invalid xpub', () => {
			const cosigner = {
				xpub: 'invalid-xpub',
				fingerprint: sampleFingerprint,
			};
			const result = validateCosigner(cosigner);
			expect(result.isValid).toBe(false);
		});

		it('should reject invalid fingerprint', () => {
			const cosigner = {
				xpub: sampleXpub,
				fingerprint: 'invalid',
			};
			const result = validateCosigner(cosigner);
			expect(result.isValid).toBe(false);
		});
	});
});
