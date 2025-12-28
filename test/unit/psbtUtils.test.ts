/**
 * @fileoverview Unit tests for PSBT utilities
 * @license BSL-1.1
 * @copyright Velocity BPA 2025
 */

import {
	decodePsbt,
	encodePsbt,
	analyzePsbt,
	validatePsbtFormat,
	extractPsbtInfo,
	calculatePsbtFee,
} from '../../nodes/Coldcard/utils/psbtUtils';

describe('PSBT Utilities', () => {
	const samplePsbtBase64 = 'cHNidP8BAHUCAAAAASaBcTce3/KF6Tig7cez//c=';
	const samplePsbtHex = '70736274ff01007502000000';

	describe('decodePsbt', () => {
		it('should decode base64 PSBT', () => {
			const result = decodePsbt(samplePsbtBase64, 'base64');
			expect(result).toBeDefined();
			expect(result.decoded).toBeDefined();
		});

		it('should decode hex PSBT', () => {
			const result = decodePsbt(samplePsbtHex, 'hex');
			expect(result).toBeDefined();
		});

		it('should handle invalid PSBT gracefully', () => {
			expect(() => decodePsbt('invalid', 'base64')).toThrow();
		});
	});

	describe('encodePsbt', () => {
		it('should encode to base64', () => {
			const mockPsbt = { toBase64: () => 'encoded' };
			const result = encodePsbt(mockPsbt as any, 'base64');
			expect(result).toBe('encoded');
		});

		it('should encode to hex', () => {
			const mockPsbt = { toHex: () => 'abcd1234' };
			const result = encodePsbt(mockPsbt as any, 'hex');
			expect(result).toBe('abcd1234');
		});
	});

	describe('validatePsbtFormat', () => {
		it('should validate base64 format', () => {
			const result = validatePsbtFormat(samplePsbtBase64);
			expect(result.isValid).toBeDefined();
		});

		it('should detect PSBT magic bytes', () => {
			// Valid PSBT starts with 'psbt' (0x70736274)
			const result = validatePsbtFormat('cHNidP8=');
			expect(result.format).toBeDefined();
		});

		it('should reject invalid format', () => {
			const result = validatePsbtFormat('not-a-psbt');
			expect(result.isValid).toBe(false);
		});
	});

	describe('analyzePsbt', () => {
		it('should return analysis object', () => {
			const result = analyzePsbt(samplePsbtBase64);
			expect(result).toBeDefined();
			expect(typeof result).toBe('object');
		});

		it('should include input count', () => {
			const result = analyzePsbt(samplePsbtBase64);
			expect(result.inputCount).toBeDefined();
		});

		it('should include output count', () => {
			const result = analyzePsbt(samplePsbtBase64);
			expect(result.outputCount).toBeDefined();
		});
	});

	describe('extractPsbtInfo', () => {
		it('should extract version', () => {
			const result = extractPsbtInfo(samplePsbtBase64);
			expect(result.version).toBeDefined();
		});

		it('should extract locktime', () => {
			const result = extractPsbtInfo(samplePsbtBase64);
			expect(result.locktime).toBeDefined();
		});
	});

	describe('calculatePsbtFee', () => {
		it('should calculate fee in satoshis', () => {
			const mockPsbt = {
				inputTotal: 100000,
				outputTotal: 99000,
			};
			const result = calculatePsbtFee(mockPsbt);
			expect(result.fee).toBe(1000);
		});

		it('should calculate fee rate', () => {
			const mockPsbt = {
				inputTotal: 100000,
				outputTotal: 99000,
				virtualSize: 250,
			};
			const result = calculatePsbtFee(mockPsbt);
			expect(result.feeRate).toBe(4); // 1000/250 = 4 sat/vB
		});
	});
});
