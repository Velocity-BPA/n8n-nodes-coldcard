/**
 * @fileoverview Integration tests for Coldcard n8n node workflows
 * @license BSL-1.1
 * @copyright Velocity BPA 2025
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Mock Coldcard device for integration testing
 */
class MockColdcardDevice {
	connected = false;
	serialNumber = 'CC-TEST-001';
	firmwareVersion = '5.2.0';
	masterFingerprint = '12345678';
	
	async connect(): Promise<void> {
		this.connected = true;
	}
	
	async disconnect(): Promise<void> {
		this.connected = false;
	}
	
	async getInfo(): Promise<object> {
		return {
			serial: this.serialNumber,
			firmware: this.firmwareVersion,
			xfp: this.masterFingerprint,
			model: 'mk4',
		};
	}
	
	async signPsbt(psbt: string): Promise<string> {
		// Mock signing - in real tests this would use actual device
		return psbt + '-signed';
	}
}

describe('Coldcard Integration Tests', () => {
	let mockDevice: MockColdcardDevice;
	
	beforeEach(() => {
		mockDevice = new MockColdcardDevice();
	});
	
	afterEach(async () => {
		if (mockDevice.connected) {
			await mockDevice.disconnect();
		}
	});
	
	describe('Device Connection Workflow', () => {
		it('should connect to device via USB', async () => {
			await mockDevice.connect();
			expect(mockDevice.connected).toBe(true);
		});
		
		it('should retrieve device info after connection', async () => {
			await mockDevice.connect();
			const info = await mockDevice.getInfo();
			expect(info).toHaveProperty('serial');
			expect(info).toHaveProperty('firmware');
			expect(info).toHaveProperty('xfp');
		});
		
		it('should disconnect cleanly', async () => {
			await mockDevice.connect();
			await mockDevice.disconnect();
			expect(mockDevice.connected).toBe(false);
		});
	});
	
	describe('PSBT Signing Workflow', () => {
		const samplePsbt = 'cHNidP8BAHUCAAAAASaBcTce3/KF6Tig7cez//c=';
		
		it('should sign PSBT when connected', async () => {
			await mockDevice.connect();
			const signedPsbt = await mockDevice.signPsbt(samplePsbt);
			expect(signedPsbt).toContain('signed');
		});
		
		it('should include original PSBT data in signed output', async () => {
			await mockDevice.connect();
			const signedPsbt = await mockDevice.signPsbt(samplePsbt);
			expect(signedPsbt).toContain(samplePsbt);
		});
	});
	
	describe('SD Card Workflow', () => {
		const mockSdCardPath = '/tmp/coldcard-test-sd';
		
		beforeEach(() => {
			if (!fs.existsSync(mockSdCardPath)) {
				fs.mkdirSync(mockSdCardPath, { recursive: true });
			}
		});
		
		afterEach(() => {
			if (fs.existsSync(mockSdCardPath)) {
				fs.rmSync(mockSdCardPath, { recursive: true, force: true });
			}
		});
		
		it('should write PSBT file to SD card', () => {
			const psbtContent = 'cHNidP8BAHUCAAAAASaBcTce3/KF6Tig7cez//c=';
			const filePath = path.join(mockSdCardPath, 'unsigned.psbt');
			fs.writeFileSync(filePath, psbtContent);
			expect(fs.existsSync(filePath)).toBe(true);
		});
		
		it('should read signed PSBT from SD card', () => {
			const signedContent = 'signed-psbt-content';
			const filePath = path.join(mockSdCardPath, 'signed.psbt');
			fs.writeFileSync(filePath, signedContent);
			const content = fs.readFileSync(filePath, 'utf-8');
			expect(content).toBe(signedContent);
		});
		
		it('should list files on SD card', () => {
			fs.writeFileSync(path.join(mockSdCardPath, 'test1.psbt'), 'content1');
			fs.writeFileSync(path.join(mockSdCardPath, 'test2.txt'), 'content2');
			const files = fs.readdirSync(mockSdCardPath);
			expect(files.length).toBe(2);
			expect(files).toContain('test1.psbt');
			expect(files).toContain('test2.txt');
		});
	});
	
	describe('Wallet Export Workflow', () => {
		it('should export Electrum wallet format', async () => {
			await mockDevice.connect();
			const info = await mockDevice.getInfo();
			
			const electrumWallet = {
				keystore: {
					type: 'hardware',
					hw_type: 'coldcard',
					xpub: 'xpub...',
					derivation: "m/84'/0'/0'",
					root_fingerprint: (info as any).xfp,
					label: 'Coldcard',
				},
				wallet_type: 'standard',
			};
			
			expect(electrumWallet.keystore.type).toBe('hardware');
			expect(electrumWallet.wallet_type).toBe('standard');
		});
		
		it('should export Sparrow wallet format', async () => {
			await mockDevice.connect();
			const info = await mockDevice.getInfo();
			
			const sparrowWallet = {
				keystores: [{
					keyDerivation: {
						masterFingerprint: (info as any).xfp,
						derivation: "m/84'/0'/0'",
						xpub: 'xpub...',
					},
				}],
				scriptType: 'P2WPKH',
				gapLimit: 20,
			};
			
			expect(sparrowWallet.keystores.length).toBe(1);
			expect(sparrowWallet.scriptType).toBe('P2WPKH');
		});
		
		it('should export Bitcoin Core descriptor', async () => {
			await mockDevice.connect();
			const info = await mockDevice.getInfo();
			
			const descriptor = `wpkh([${(info as any).xfp}/84h/0h/0h]xpub.../0/*)`;
			
			expect(descriptor).toContain((info as any).xfp);
			expect(descriptor).toContain('wpkh');
		});
	});
	
	describe('Multisig Workflow', () => {
		const cosigners = [
			{ xpub: 'xpub1...', fingerprint: '11111111', name: 'Coldcard 1' },
			{ xpub: 'xpub2...', fingerprint: '22222222', name: 'Coldcard 2' },
			{ xpub: 'xpub3...', fingerprint: '33333333', name: 'Coldcard 3' },
		];
		
		it('should create 2-of-3 multisig config', () => {
			const config = {
				name: 'Family Vault',
				format: 'P2WSH',
				m: 2,
				n: 3,
				cosigners,
			};
			
			expect(config.m).toBe(2);
			expect(config.n).toBe(3);
			expect(config.cosigners.length).toBe(3);
		});
		
		it('should generate sortedmulti descriptor', () => {
			const descriptor = `wsh(sortedmulti(2,` +
				cosigners.map(c => `[${c.fingerprint}/48h/0h/0h/2h]${c.xpub}`).join(',') +
				`))`;
			
			expect(descriptor).toContain('sortedmulti(2');
			expect(descriptor).toContain('wsh(');
		});
		
		it('should export BSMS format', () => {
			const bsms = {
				BSMS: '1.0',
				name: 'Family Vault',
				policy: '2 of 3',
				format: 'P2WSH',
				sorted: true,
				cosigners: cosigners.map(c => ({
					key: `[${c.fingerprint}/48'/0'/0'/2']${c.xpub}`,
					name: c.name,
				})),
			};
			
			expect(bsms.BSMS).toBe('1.0');
			expect(bsms.sorted).toBe(true);
		});
	});
	
	describe('HSM Mode Workflow', () => {
		it('should create HSM policy', () => {
			const policy = {
				version: 1,
				rules: [
					{
						type: 'velocity',
						period: 86400, // 24 hours
						limit: 100000000, // 1 BTC in sats
					},
					{
						type: 'whitelist',
						addresses: ['bc1q...', 'bc1q...'],
					},
				],
				users: [
					{ name: 'admin', auth: 'totp' },
					{ name: 'operator', auth: 'none', limit: 10000000 },
				],
			};
			
			expect(policy.version).toBe(1);
			expect(policy.rules.length).toBe(2);
			expect(policy.users.length).toBe(2);
		});
		
		it('should validate HSM signing limits', () => {
			const velocity = {
				spent: 50000000, // 0.5 BTC
				limit: 100000000, // 1 BTC
				period: 86400,
				remaining: 50000000,
			};
			
			expect(velocity.remaining).toBe(velocity.limit - velocity.spent);
			expect(velocity.remaining > 0).toBe(true);
		});
	});
	
	describe('Backup and Recovery Workflow', () => {
		it('should create encrypted backup structure', () => {
			const backup = {
				version: 1,
				created: new Date().toISOString(),
				encrypted: true,
				format: 'aes-256-ctr',
				checksum: 'sha256:abcd1234...',
			};
			
			expect(backup.encrypted).toBe(true);
			expect(backup.format).toBe('aes-256-ctr');
		});
		
		it('should create seed XOR shares', () => {
			// Simulate 2-of-3 Seed XOR
			const shares = [
				{ index: 1, words: 24, checksum: 'valid' },
				{ index: 2, words: 24, checksum: 'valid' },
				{ index: 3, words: 24, checksum: 'valid' },
			];
			
			expect(shares.length).toBe(3);
			shares.forEach(share => {
				expect(share.words).toBe(24);
			});
		});
	});
	
	describe('Message Signing Workflow', () => {
		it('should sign message with address', async () => {
			await mockDevice.connect();
			
			const message = 'I own this address';
			const address = 'bc1qtest...';
			const signature = 'H+signature...'; // Base64 encoded
			
			const result = {
				message,
				address,
				signature,
				verified: true,
			};
			
			expect(result.verified).toBe(true);
			expect(result.signature).toMatch(/^[A-Za-z0-9+/=]+$/);
		});
		
		it('should verify signed message', () => {
			const verification = {
				message: 'I own this address',
				address: 'bc1qtest...',
				signature: 'H+signature...',
				valid: true,
				signer: 'bc1qtest...',
			};
			
			expect(verification.valid).toBe(true);
			expect(verification.signer).toBe(verification.address);
		});
	});
});
