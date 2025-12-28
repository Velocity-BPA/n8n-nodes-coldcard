/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { USBTransport } from '../transport/usbTransport';
import { DERIVATION_PATHS, buildDerivationPath } from '../constants/derivationPaths';
import { XPUB_VERSIONS } from '../constants/addressTypes';

/**
 * Account operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');
  const transport = new USBTransport();

  try {
    switch (operation) {
      case 'getMasterFingerprint': {
        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();
        return {
          fingerprint: xfp,
          format: 'hex',
        };
      }

      case 'getXpub': {
        const derivationPath = this.getNodeParameter('derivationPath', itemIndex, "m/84'/0'/0'") as string;
        await transport.connect(credentials.devicePath as string);
        const xpub = await transport.getXPub(derivationPath);
        return {
          xpub,
          derivationPath,
          type: 'xpub',
          version: XPUB_VERSIONS.XPUB,
        };
      }

      case 'getYpub': {
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;
        const derivationPath = buildDerivationPath(49, network === 'mainnet' ? 0 : 1, account);

        await transport.connect(credentials.devicePath as string);
        const xpub = await transport.getXPub(derivationPath);

        // Note: Actual ypub conversion would require key manipulation
        return {
          ypub: xpub, // Would need proper conversion
          derivationPath,
          type: 'ypub',
          purpose: 49,
          version: XPUB_VERSIONS.YPUB,
        };
      }

      case 'getZpub': {
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;
        const derivationPath = buildDerivationPath(84, network === 'mainnet' ? 0 : 1, account);

        await transport.connect(credentials.devicePath as string);
        const xpub = await transport.getXPub(derivationPath);

        return {
          zpub: xpub, // Would need proper conversion
          derivationPath,
          type: 'zpub',
          purpose: 84,
          version: XPUB_VERSIONS.ZPUB,
        };
      }

      case 'getAccountDescriptor': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const coinType = network === 'mainnet' ? 0 : 1;
        const derivationPath = buildDerivationPath(purpose, coinType, account);

        await transport.connect(credentials.devicePath as string);
        const xpub = await transport.getXPub(derivationPath);
        const xfp = await transport.getXFP();

        const descriptorPrefix: Record<string, string> = {
          p2pkh: 'pkh',
          'p2sh-p2wpkh': 'sh(wpkh',
          p2wpkh: 'wpkh',
          p2tr: 'tr',
        };

        const prefix = descriptorPrefix[addressType] || 'wpkh';
        const suffix = addressType === 'p2sh-p2wpkh' ? '))' : ')';

        return {
          descriptor: `${prefix}([${xfp}${derivationPath.slice(1)}]${xpub}/0/*)${suffix}`,
          changeDescriptor: `${prefix}([${xfp}${derivationPath.slice(1)}]${xpub}/1/*)${suffix}`,
          xpub,
          fingerprint: xfp,
          derivationPath,
          addressType,
        };
      }

      case 'exportElectrumWallet': {
        const walletName = this.getNodeParameter('walletName', itemIndex, 'coldcard') as string;
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
        };

        const purpose = purposeMap[addressType] || 84;
        const derivationPath = buildDerivationPath(purpose, 0, 0);
        const xpub = await transport.getXPub(derivationPath);

        const electrumWallet = {
          keystore: {
            type: 'hardware',
            hw_type: 'coldcard',
            label: walletName,
            derivation: derivationPath,
            xpub,
            root_fingerprint: xfp,
          },
          wallet_type: 'standard',
        };

        return {
          wallet: electrumWallet,
          format: 'electrum',
          fileName: `${walletName}-electrum.json`,
        };
      }

      case 'exportWasabiWallet': {
        const walletName = this.getNodeParameter('walletName', itemIndex, 'coldcard') as string;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();
        const derivationPath = DERIVATION_PATHS.BIP84.replace('COIN', '0').replace('ACCOUNT', '0');
        const xpub = await transport.getXPub(derivationPath);

        const wasabiWallet = {
          ColdCardFirmwareVersion: '5.0.0',
          MasterFingerprint: xfp,
          ExtPubKey: xpub,
        };

        return {
          wallet: wasabiWallet,
          format: 'wasabi',
          fileName: `${walletName}-wasabi.json`,
        };
      }

      case 'exportSparrowWallet': {
        const walletName = this.getNodeParameter('walletName', itemIndex, 'coldcard') as string;
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const derivationPath = buildDerivationPath(purpose, 0, 0);
        const xpub = await transport.getXPub(derivationPath);

        return {
          label: walletName,
          derivation: derivationPath,
          xfp,
          xpub,
          format: 'sparrow',
          fileName: `${walletName}-sparrow.json`,
        };
      }

      case 'exportSpecterWallet': {
        const walletName = this.getNodeParameter('walletName', itemIndex, 'coldcard') as string;
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const derivationPath = buildDerivationPath(purpose, 0, 0);
        const xpub = await transport.getXPub(derivationPath);

        const specterWallet = {
          label: walletName,
          blockheight: 0,
          descriptor: `wpkh([${xfp}${derivationPath.slice(1)}]${xpub}/0/*)`,
        };

        return {
          wallet: specterWallet,
          format: 'specter',
          fileName: `${walletName}-specter.json`,
        };
      }

      case 'exportGenericJson': {
        const walletName = this.getNodeParameter('walletName', itemIndex, 'coldcard') as string;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();
        const info = await transport.getDeviceInfo();

        const paths = [
          { purpose: 44, name: 'legacy' },
          { purpose: 49, name: 'nestedSegwit' },
          { purpose: 84, name: 'nativeSegwit' },
          { purpose: 86, name: 'taproot' },
        ];

        const accounts: Record<string, unknown> = {};
        for (const p of paths) {
          const derivationPath = buildDerivationPath(p.purpose, 0, 0);
          const xpub = await transport.getXPub(derivationPath);
          accounts[p.name] = {
            derivationPath,
            xpub,
          };
        }

        return {
          name: walletName,
          fingerprint: xfp,
          model: info.model,
          firmware: info.firmwareVersion,
          accounts,
          exportedAt: new Date().toISOString(),
          format: 'generic',
          fileName: `${walletName}-export.json`,
        };
      }

      case 'exportCoreDescriptor': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const derivationPath = buildDerivationPath(purpose, 0, account);
        const xpub = await transport.getXPub(derivationPath);

        const descriptorPrefix: Record<string, string> = {
          p2pkh: 'pkh',
          'p2sh-p2wpkh': 'sh(wpkh',
          p2wpkh: 'wpkh',
          p2tr: 'tr',
        };

        const prefix = descriptorPrefix[addressType] || 'wpkh';
        const suffix = addressType === 'p2sh-p2wpkh' ? '))' : ')';
        const descriptor = `${prefix}([${xfp}${derivationPath.slice(1)}]${xpub}/0/*)${suffix}`;
        const changeDescriptor = `${prefix}([${xfp}${derivationPath.slice(1)}]${xpub}/1/*)${suffix}`;

        return {
          descriptor,
          changeDescriptor,
          format: 'bitcoin-core',
          importCommand: `importdescriptors '[{"desc": "${descriptor}", "timestamp": "now", "range": [0, 999], "watchonly": true, "internal": false}]'`,
        };
      }

      case 'getDerivationPath': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const coinType = network === 'mainnet' ? 0 : 1;
        const derivationPath = buildDerivationPath(purpose, coinType, account);

        return {
          derivationPath,
          purpose,
          coinType,
          account,
          addressType,
          network,
          standard: `BIP-${purpose}`,
        };
      }

      case 'getAccountPolicy': {
        const account = this.getNodeParameter('account', itemIndex, 0) as number;

        await transport.connect(credentials.devicePath as string);
        const xfp = await transport.getXFP();

        return {
          fingerprint: xfp,
          account,
          scriptTypes: ['p2pkh', 'p2sh-p2wpkh', 'p2wpkh', 'p2tr'],
          supportedNetworks: ['mainnet', 'testnet', 'signet', 'regtest'],
          features: {
            messageSigning: true,
            psbtSigning: true,
            multisig: true,
            taproot: true,
          },
        };
      }

      default:
        throw new NodeOperationError(
          this.getNode(),
          `Unknown operation: ${operation}`,
          { itemIndex },
        );
    }
  } finally {
    if (transport.isConnected()) {
      await transport.disconnect();
    }
  }
}
