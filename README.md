# n8n-nodes-coldcard

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

An n8n community node for integrating with Coldcard hardware wallets. Provides 6 resources with comprehensive Bitcoin wallet management capabilities including device operations, wallet functions, transaction handling, multisig setup, backup management, and HSM functionality for secure Bitcoin workflows.

![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Bitcoin](https://img.shields.io/badge/Bitcoin-Hardware%20Wallet-orange)
![Coldcard](https://img.shields.io/badge/Coldcard-Compatible-yellow)
![Security](https://img.shields.io/badge/Security-HSM-green)

## Features

- **Device Management** - Monitor device status, firmware versions, and hardware information
- **Wallet Operations** - Create addresses, check balances, and manage wallet configurations
- **Transaction Processing** - Sign transactions, broadcast payments, and handle PSBT workflows
- **Multisig Support** - Setup and manage multi-signature wallets with threshold configurations
- **Backup & Recovery** - Secure backup creation, seed phrase management, and wallet restoration
- **HSM Integration** - Hardware Security Module functionality for enterprise-grade Bitcoin operations
- **Security Features** - PIN management, device authentication, and secure element integration
- **Bitcoin Network Support** - Compatible with mainnet, testnet, and regtest environments

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-coldcard`
5. Click **Install**

### Manual Installation

```bash
cd ~/.n8n
npm install n8n-nodes-coldcard
```

### Development Installation

```bash
git clone https://github.com/Velocity-BPA/n8n-nodes-coldcard.git
cd n8n-nodes-coldcard
npm install
npm run build
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-coldcard
n8n start
```

## Credentials Setup

| Field | Description | Required |
|-------|-------------|----------|
| API Key | Coldcard device API key for authentication | Yes |
| Device ID | Unique identifier for your Coldcard device | Yes |
| PIN | Device PIN for secure operations | Yes |
| Network | Bitcoin network (mainnet, testnet, regtest) | Yes |

## Resources & Operations

### 1. DeviceInfo

| Operation | Description |
|-----------|-------------|
| Get Device Status | Retrieve current device status and connection info |
| Get Firmware Version | Check installed firmware version and available updates |
| Get Hardware Info | Get device serial number, model, and hardware specifications |
| Get Network Settings | Retrieve current Bitcoin network configuration |
| Update Firmware | Initiate firmware update process |
| Restart Device | Perform device restart operation |

### 2. Wallet

| Operation | Description |
|-----------|-------------|
| Generate Address | Create new receiving addresses (legacy, segwit, native segwit) |
| Get Balance | Retrieve wallet balance and UTXO information |
| Get Extended Public Key | Export xpub/ypub/zpub for wallet integration |
| Import Wallet | Import existing wallet from seed or descriptor |
| Create Wallet | Generate new wallet with entropy |
| Get Wallet Info | Retrieve wallet metadata and configuration |
| Derive Keys | Derive keys for specific derivation paths |

### 3. Transaction

| Operation | Description |
|-----------|-------------|
| Sign Transaction | Sign PSBT (Partially Signed Bitcoin Transaction) |
| Create Transaction | Build new transaction with inputs and outputs |
| Broadcast Transaction | Submit signed transaction to Bitcoin network |
| Get Transaction History | Retrieve wallet transaction history |
| Estimate Fees | Calculate recommended transaction fees |
| Verify Signature | Validate transaction signatures |
| Export PSBT | Export partially signed transaction data |

### 4. Multisig

| Operation | Description |
|-----------|-------------|
| Create Multisig Wallet | Setup new M-of-N multisig wallet |
| Add Cosigner | Add additional signing keys to multisig setup |
| Generate Multisig Address | Create multisig receiving address |
| Sign Multisig Transaction | Contribute signature to multisig transaction |
| Get Multisig Info | Retrieve multisig wallet configuration |
| Export Multisig Config | Export wallet configuration for cosigners |

### 5. Backup

| Operation | Description |
|-----------|-------------|
| Create Backup | Generate encrypted wallet backup |
| Restore from Backup | Restore wallet from backup file |
| Export Seed | Securely export seed phrase (requires confirmation) |
| Verify Backup | Validate backup file integrity |
| Get Backup Status | Check backup configuration and history |
| Schedule Backup | Configure automatic backup settings |

### 6. HSM

| Operation | Description |
|-----------|-------------|
| Initialize HSM | Setup Hardware Security Module functionality |
| Generate HSM Key | Create new cryptographic keys in secure element |
| Sign with HSM | Perform cryptographic signing operations |
| Get HSM Status | Check HSM configuration and availability |
| Manage Certificates | Handle X.509 certificates for enterprise integration |
| Audit Log | Retrieve HSM operation audit trail |

## Usage Examples

```javascript
// Get device information and status
{
  "operation": "Get Device Status",
  "resource": "DeviceInfo"
}
// Returns: { "status": "ready", "firmware": "5.2.1", "serial": "CC123456" }
```

```javascript
// Generate new Bitcoin address
{
  "operation": "Generate Address",
  "resource": "Wallet",
  "addressType": "bech32",
  "derivationPath": "m/84'/0'/0'/0/0"
}
// Returns: { "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "path": "m/84'/0'/0'/0/0" }
```

```javascript
// Sign transaction with PSBT
{
  "operation": "Sign Transaction",
  "resource": "Transaction",
  "psbt": "cHNidP8BAHECAAAAAe...",
  "derivationPaths": ["m/84'/0'/0'/0/0", "m/84'/0'/0'/1/5"]
}
// Returns: { "signedPsbt": "cHNidP8BAHECAAAAAe...", "signatures": 2 }
```

```javascript
// Create 2-of-3 multisig wallet
{
  "operation": "Create Multisig Wallet",
  "resource": "Multisig",
  "threshold": 2,
  "totalSigners": 3,
  "cosignerXpubs": ["xpub661MyMwAq...", "xpub661MyMwAq..."],
  "scriptType": "p2wsh"
}
// Returns: { "walletId": "ms_abc123", "descriptor": "wsh(sortedmulti(2,...))" }
```

## Error Handling

| Error | Description | Solution |
|-------|-------------|----------|
| Device Not Connected | Coldcard device is not properly connected | Check USB connection and device power |
| Invalid PIN | Incorrect PIN provided for device authentication | Verify PIN and check for device lockout |
| Insufficient Funds | Wallet balance too low for transaction | Check wallet balance and reduce transaction amount |
| Invalid PSBT | Malformed or incompatible PSBT data | Validate PSBT format and compatibility |
| Firmware Outdated | Device firmware version not supported | Update Coldcard firmware to latest version |
| Network Mismatch | Transaction network doesn't match device setting | Ensure device and transaction use same Bitcoin network |

## Development

```bash
npm install
npm run build
npm test
npm run lint
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

For licensing inquiries: **licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please ensure:

1. Code follows existing style conventions
2. All tests pass (`npm test`)
3. Linting passes (`npm run lint`)
4. Documentation is updated for new features
5. Commit messages are descriptive

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-coldcard/issues)
- **Coldcard Documentation**: [Coldcard Developer Docs](https://coldcard.com/docs)
- **Bitcoin Development**: [Bitcoin Core Documentation](https://developer.bitcoin.org)