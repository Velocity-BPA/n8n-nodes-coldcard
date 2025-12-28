# n8n-nodes-coldcard

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Coldcard hardware wallet integration, providing 22 resource categories with 200+ operations for Bitcoin custody, PSBT signing, multisig management, HSM automation, and air-gapped workflows.

![n8n](https://img.shields.io/badge/n8n-community--node-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![Coldcard](https://img.shields.io/badge/Coldcard-Mk4%20%7C%20Q-orange)
![Bitcoin](https://img.shields.io/badge/Bitcoin-Native-f7931a)

## Features

- **Complete Coldcard Integration**: Full support for Coldcard Mk4 and Q models
- **Air-Gapped Operations**: MicroSD card workflows for maximum security
- **Multiple Connection Types**: USB HID, NFC (Coldcard Q), Virtual Disk, and SD Card
- **PSBT Management**: Import, sign, analyze, and export Partially Signed Bitcoin Transactions
- **Multisig Support**: Create and manage 2-of-3, 3-of-5, and custom quorum configurations
- **HSM Mode**: Hardware Security Module automation with policy-based signing
- **Wallet Exports**: Native export to Electrum, Sparrow, Specter, and Bitcoin Core
- **Security Features**: Duress PIN, brick PIN, login countdown, and tamper detection
- **Seed Management**: BIP-39, Seed XOR backup splitting, passphrase support
- **Enterprise Features**: User management, audit logging, and spending limits

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install**
4. Enter `n8n-nodes-coldcard`
5. Accept the confirmation dialog
6. Restart n8n

### Manual Installation

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the node
npm install n8n-nodes-coldcard

# Restart n8n
n8n start
```

### Development Installation

```bash
# Clone and extract
unzip n8n-nodes-coldcard.zip
cd n8n-nodes-coldcard

# Install dependencies
npm install

# Build
npm run build

# Link to n8n (Linux/macOS)
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-coldcard

# Restart n8n
n8n start
```

## Credentials Setup

### Coldcard Device Credentials

| Field | Description | Required |
|-------|-------------|----------|
| Connection Type | USB, SD Card, NFC, or Virtual Disk | Yes |
| Device Path | USB device path (e.g., `/dev/hidraw0`) | For USB |
| SD Card Path | Path to mounted SD card | For SD Card |
| NFC Enabled | Enable NFC operations (Coldcard Q) | For NFC |

### Coldcard File Credentials

| Field | Description | Required |
|-------|-------------|----------|
| Import Directory | Directory for importing files | Yes |
| Export Directory | Directory for exporting files | Yes |
| File Naming | Naming convention for files | No |
| Auto Cleanup | Clean up processed files | No |

### Coldcard Network Credentials

| Field | Description | Required |
|-------|-------------|----------|
| Network | mainnet, testnet, or signet | Yes |
| Electrum Server | Electrum server URL | No |
| Block Explorer | Block explorer URL | No |
| Fee Endpoint | Fee estimation API | No |

## Resources & Operations

### Device Resource

| Operation | Description |
|-----------|-------------|
| Connect Device | Establish USB connection |
| Get Device Info | Retrieve device information |
| Get Serial Number | Get device serial |
| Get Firmware Version | Check firmware version |
| Verify Genuineness | Verify device authenticity |
| Get NFC Status | Check NFC status (Q) |
| Get Battery Status | Check battery (Q) |

### Account Resource

| Operation | Description |
|-----------|-------------|
| Get Master Fingerprint | Get XFP identifier |
| Get xPub | Export extended public key |
| Get yPub | Export P2SH-P2WPKH key |
| Get zPub | Export P2WPKH native key |
| Export Electrum Wallet | Export Electrum format |
| Export Sparrow Wallet | Export Sparrow format |
| Export Core Descriptor | Export Bitcoin Core format |

### Transaction Resource (PSBT)

| Operation | Description |
|-----------|-------------|
| Import PSBT | Import from file/base64/hex |
| Sign PSBT | Sign transaction |
| Export Signed PSBT | Export signed transaction |
| Analyze PSBT | Detailed PSBT analysis |
| Get Fee Info | Calculate fees and rates |
| Finalize PSBT | Finalize for broadcast |
| Extract Transaction | Get raw transaction |

### Multisig Resource

| Operation | Description |
|-----------|-------------|
| Create Multisig Wallet | Create new multisig |
| Import Config | Import configuration |
| Export Config | Export configuration |
| Add Co-Signer | Add cosigner to wallet |
| Get Multisig Address | Derive multisig address |
| Export BSMS | Export Bitcoin Secure Multisig Setup |
| Sign Multisig PSBT | Sign multisig transaction |

### HSM Resource

| Operation | Description |
|-----------|-------------|
| Enable HSM Mode | Activate HSM mode |
| Upload Policy | Load HSM policy |
| Get Status | Check HSM status |
| Get Velocity | Check spending velocity |
| Get Whitelist | List whitelisted addresses |
| Add to Whitelist | Add address to whitelist |
| Get HSM Log | Retrieve audit log |

### Additional Resources

- **Address**: Generate and verify addresses
- **Message**: Sign and verify messages
- **SD Card**: File management operations
- **Backup**: Encrypted backup management
- **Seed**: Seed phrase operations
- **PIN**: PIN management
- **Security**: Security configuration
- **PSBT Analysis**: Detailed PSBT analysis
- **Electrum**: Electrum wallet integration
- **Sparrow**: Sparrow wallet integration
- **Specter**: Specter Desktop integration
- **Bitcoin Core**: Core descriptor export
- **NFC**: NFC operations (Coldcard Q)
- **Virtual Disk**: Virtual disk mode
- **Settings**: Device configuration
- **User Management**: Enterprise user management
- **Utility**: Utility operations

## Trigger Node

The Coldcard Trigger node monitors for events:

### SD Card Triggers
- File Added
- PSBT Imported
- Signed PSBT Ready
- Backup Created

### Device Triggers
- Device Connected
- Device Disconnected
- Firmware Updated

### Signing Triggers
- PSBT Signed
- Message Signed
- Signing Rejected

### HSM Triggers
- HSM Mode Enabled
- HSM Limit Reached
- Policy Violation

### Security Triggers
- Wrong PIN Attempt
- Countdown Started
- Tamper Detected

### NFC Triggers (Coldcard Q)
- NFC Tap Detected
- NFC Export Complete

## Usage Examples

### Air-Gapped PSBT Signing

```javascript
// 1. Export unsigned PSBT to SD card
const exportResult = await this.helpers.execute({
  resource: 'sdCard',
  operation: 'writeFile',
  filename: 'unsigned.psbt',
  content: psbtBase64,
});

// 2. User takes SD card to Coldcard, signs, returns

// 3. Import signed PSBT from SD card
const signedPsbt = await this.helpers.execute({
  resource: 'sdCard',
  operation: 'readFile',
  filename: 'signed.psbt',
});
```

### Multisig Wallet Setup

```javascript
// Create 2-of-3 multisig
const multisig = await this.helpers.execute({
  resource: 'multisig',
  operation: 'createMultisigWallet',
  name: 'Family Vault',
  requiredSignatures: 2,
  cosigners: [
    { xpub: 'xpub1...', fingerprint: '11111111' },
    { xpub: 'xpub2...', fingerprint: '22222222' },
    { xpub: 'xpub3...', fingerprint: '33333333' },
  ],
  scriptType: 'p2wsh',
});

// Export BSMS format for other devices
const bsms = await this.helpers.execute({
  resource: 'multisig',
  operation: 'exportBsms',
  walletId: multisig.id,
});
```

### HSM Mode Configuration

```javascript
// Upload HSM policy
await this.helpers.execute({
  resource: 'hsm',
  operation: 'uploadPolicy',
  policy: {
    rules: [
      {
        type: 'velocity',
        period: 86400, // 24 hours
        limit: 100000000, // 1 BTC
      },
      {
        type: 'whitelist',
        addresses: ['bc1q...'],
      },
    ],
    users: [
      { name: 'admin', auth: 'totp' },
    ],
  },
});

// Enable HSM mode
await this.helpers.execute({
  resource: 'hsm',
  operation: 'enableHsmMode',
});
```

### Message Signing

```javascript
// Sign a message
const signature = await this.helpers.execute({
  resource: 'message',
  operation: 'signMessage',
  message: 'I own this address',
  derivationPath: "m/84'/0'/0'/0/0",
});

// Verify signature
const verification = await this.helpers.execute({
  resource: 'message',
  operation: 'verifySignature',
  message: signature.message,
  address: signature.address,
  signature: signature.signature,
});
```

### Wallet Export to Sparrow

```javascript
// Export wallet config
const sparrowConfig = await this.helpers.execute({
  resource: 'sparrow',
  operation: 'exportSparrowWallet',
  accountNumber: 0,
  scriptType: 'P2WPKH',
});

// Save to file
await this.helpers.execute({
  resource: 'sdCard',
  operation: 'writeFile',
  filename: 'sparrow-wallet.json',
  content: JSON.stringify(sparrowConfig),
});
```

### NFC Operations (Coldcard Q)

```javascript
// Enable NFC
await this.helpers.execute({
  resource: 'nfc',
  operation: 'enableNfc',
  timeout: 60,
});

// Share address via NFC
await this.helpers.execute({
  resource: 'nfc',
  operation: 'nfcShareAddress',
  derivationPath: "m/84'/0'/0'/0/0",
  format: 'bitcoin-uri',
});
```

## Coldcard Concepts

### Air-Gapped Security
Coldcard operates without network connectivity. Transactions are transferred via SD card or NFC (Q model), ensuring private keys never touch a networked device.

### PSBT (BIP-174)
Partially Signed Bitcoin Transactions allow multiple devices to contribute signatures without exposing private keys.

### XFP (Extended Fingerprint)
The 8-character hexadecimal identifier derived from the master public key, used to identify which device signed a transaction.

### Duress PIN
An alternative PIN that unlocks a decoy wallet with limited funds, protecting the main wallet under coercion.

### Brick PIN
A self-destruct mechanism that permanently destroys the device's secure element and all stored keys.

### Seed XOR
A backup method that splits the seed phrase into multiple shares using XOR operations, requiring multiple shares to reconstruct.

### HSM Mode
Hardware Security Module mode enables automatic PSBT signing according to predefined policies, velocity limits, and whitelists.

## Networks

| Network | Purpose | Address Prefix |
|---------|---------|----------------|
| mainnet | Production Bitcoin | bc1, 1, 3 |
| testnet | Testing | tb1, m, n, 2 |
| signet | Development | tb1 |

## Error Handling

The node provides detailed error messages:

- `DEVICE_NOT_CONNECTED`: Coldcard not connected
- `DEVICE_LOCKED`: Device requires PIN entry
- `SIGNING_REJECTED`: User rejected on device
- `INVALID_PSBT`: Malformed transaction data
- `HSM_LIMIT_EXCEEDED`: Velocity limit reached
- `POLICY_VIOLATION`: HSM policy not satisfied
- `INVALID_PATH`: Bad derivation path
- `FIRMWARE_UPDATE_REQUIRED`: Outdated firmware

## Security Best Practices

1. **Always verify on device**: Never trust computer displays for transaction details
2. **Use air-gap mode**: Prefer SD card over USB for signing
3. **Set up duress PIN**: Protect against physical coercion
4. **Enable login countdown**: Slow down brute force attacks
5. **Verify anti-phishing words**: Confirm you're using your device
6. **Regular backups**: Keep encrypted backups in multiple locations
7. **Use HSM for automation**: Define strict policies for automated signing
8. **Audit HSM logs**: Regularly review signing activity

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Fix lint issues
npm run lint:fix

# Watch mode
npm run dev
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Documentation**: [Coldcard Documentation](https://coldcard.com/docs/)
- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-coldcard/issues)
- **Community**: [n8n Community Forum](https://community.n8n.io/)

## Acknowledgments

- [Coinkite](https://coinkite.com/) for the Coldcard hardware wallet
- [n8n](https://n8n.io/) for the workflow automation platform
- Bitcoin developer community for BIP standards
