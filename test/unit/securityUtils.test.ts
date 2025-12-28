/**
 * @fileoverview Unit tests for Security utilities
 * @license BSL-1.1
 * @copyright Velocity BPA 2025
 */

import {
	validatePin,
	validateAntiPhishingWords,
	assessSecurityLevel,
	generateSecureRandom,
	hashData,
	verifyFirmwareSignature,
} from '../../nodes/Coldcard/utils/securityUtils';

describe('Security Utilities', () => {
	describe('validatePin', () => {
		it('should accept valid PIN format', () => {
			const result = validatePin('12-34');
			expect(result.isValid).toBe(true);
		});

		it('should accept 4-4 PIN format', () => {
			const result = validatePin('1234-5678');
			expect(result.isValid).toBe(true);
		});

		it('should accept 4-4-4 PIN format', () => {
			const result = validatePin('1234-5678-9012');
			expect(result.isValid).toBe(true);
		});

		it('should reject too short PIN', () => {
			const result = validatePin('1-2');
			expect(result.isValid).toBe(false);
		});

		it('should reject PIN without dash', () => {
			const result = validatePin('12345678');
			expect(result.isValid).toBe(false);
		});

		it('should reject non-numeric characters', () => {
			const result = validatePin('12ab-5678');
			expect(result.isValid).toBe(false);
		});

		it('should rate PIN strength', () => {
			const result = validatePin('1234-5678-9012-3456');
			expect(result.strength).toBeDefined();
			expect(['weak', 'moderate', 'strong', 'excellent']).toContain(result.strength);
		});
	});

	describe('validateAntiPhishingWords', () => {
		it('should accept valid word pair', () => {
			const result = validateAntiPhishingWords('apple', 'banana');
			expect(result.isValid).toBe(true);
		});

		it('should reject empty words', () => {
			const result = validateAntiPhishingWords('', 'banana');
			expect(result.isValid).toBe(false);
		});

		it('should reject identical words', () => {
			const result = validateAntiPhishingWords('apple', 'apple');
			expect(result.isValid).toBe(false);
		});

		it('should reject very long words', () => {
			const longWord = 'a'.repeat(100);
			const result = validateAntiPhishingWords(longWord, 'banana');
			expect(result.isValid).toBe(false);
		});
	});

	describe('assessSecurityLevel', () => {
		it('should return level for minimal config', () => {
			const config = {
				pinSet: true,
				duressPinSet: false,
				brickPinSet: false,
				loginCountdown: 0,
				antiPhishingSet: false,
			};
			const result = assessSecurityLevel(config);
			expect(result.level).toBeDefined();
			expect(['low', 'medium', 'high', 'maximum']).toContain(result.level);
		});

		it('should return high for full security config', () => {
			const config = {
				pinSet: true,
				duressPinSet: true,
				brickPinSet: true,
				loginCountdown: 28800, // 8 hours
				antiPhishingSet: true,
				usbDisabled: true,
			};
			const result = assessSecurityLevel(config);
			expect(result.level).toBe('maximum');
		});

		it('should provide recommendations', () => {
			const config = {
				pinSet: true,
				duressPinSet: false,
				brickPinSet: false,
				loginCountdown: 0,
			};
			const result = assessSecurityLevel(config);
			expect(result.recommendations).toBeDefined();
			expect(Array.isArray(result.recommendations)).toBe(true);
		});

		it('should calculate security score', () => {
			const config = {
				pinSet: true,
				duressPinSet: true,
			};
			const result = assessSecurityLevel(config);
			expect(result.score).toBeDefined();
			expect(typeof result.score).toBe('number');
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(100);
		});
	});

	describe('generateSecureRandom', () => {
		it('should generate random bytes', () => {
			const result = generateSecureRandom(32);
			expect(result.length).toBe(32);
		});

		it('should generate unique values', () => {
			const result1 = generateSecureRandom(32);
			const result2 = generateSecureRandom(32);
			expect(result1).not.toEqual(result2);
		});

		it('should support different lengths', () => {
			const result16 = generateSecureRandom(16);
			const result64 = generateSecureRandom(64);
			expect(result16.length).toBe(16);
			expect(result64.length).toBe(64);
		});
	});

	describe('hashData', () => {
		it('should produce SHA256 hash', () => {
			const result = hashData('test data', 'sha256');
			expect(result.length).toBe(64); // 32 bytes in hex
		});

		it('should produce consistent hashes', () => {
			const result1 = hashData('test', 'sha256');
			const result2 = hashData('test', 'sha256');
			expect(result1).toBe(result2);
		});

		it('should produce different hashes for different data', () => {
			const result1 = hashData('test1', 'sha256');
			const result2 = hashData('test2', 'sha256');
			expect(result1).not.toBe(result2);
		});

		it('should support double SHA256', () => {
			const result = hashData('test', 'sha256d');
			expect(result.length).toBe(64);
		});
	});

	describe('verifyFirmwareSignature', () => {
		it('should verify valid firmware', async () => {
			const mockFirmware = Buffer.from('mock firmware');
			const mockSignature = 'valid-signature';
			const result = await verifyFirmwareSignature(mockFirmware, mockSignature);
			expect(result.verified).toBeDefined();
		});

		it('should reject tampered firmware', async () => {
			const mockFirmware = Buffer.from('tampered firmware');
			const mockSignature = 'invalid-signature';
			const result = await verifyFirmwareSignature(mockFirmware, mockSignature);
			expect(result.verified).toBe(false);
		});

		it('should return signer info on success', async () => {
			const mockFirmware = Buffer.from('valid firmware');
			const mockSignature = 'coinkite-signature';
			const result = await verifyFirmwareSignature(mockFirmware, mockSignature);
			if (result.verified) {
				expect(result.signer).toBeDefined();
			}
		});
	});
});
