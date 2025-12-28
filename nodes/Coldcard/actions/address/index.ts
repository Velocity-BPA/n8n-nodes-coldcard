/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { USBTransport } from '../transport/usbTransport';
import { buildDerivationPath } from '../constants/derivationPaths';
import { ADDRESS_TYPES, ADDRESS_PREFIXES } from '../constants/addressTypes';

/**
 * Address operations for Coldcard
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
      case 'getAddress': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const index = this.getNodeParameter('index', itemIndex, 0) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const coinType = network === 'mainnet' ? 0 : 1;
        const derivationPath = `m/${purpose}'/${coinType}'/${account}'/0/${index}`;

        await transport.connect(credentials.devicePath as string);
        const address = await transport.showAddress(derivationPath, false);

        return {
          address,
          derivationPath,
          addressType,
          index,
          account,
          network,
          isChange: false,
        };
      }

      case 'getAddressAtIndex': {
        const derivationPath = this.getNodeParameter('derivationPath', itemIndex) as string;
        const index = this.getNodeParameter('index', itemIndex, 0) as number;
        const fullPath = `${derivationPath}/${index}`;

        await transport.connect(credentials.devicePath as string);
        const address = await transport.showAddress(fullPath, false);

        return {
          address,
          derivationPath: fullPath,
          index,
        };
      }

      case 'getAddressAtPath': {
        const derivationPath = this.getNodeParameter('derivationPath', itemIndex) as string;

        await transport.connect(credentials.devicePath as string);
        const address = await transport.showAddress(derivationPath, false);

        return {
          address,
          derivationPath,
        };
      }

      case 'getChangeAddress': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const index = this.getNodeParameter('index', itemIndex, 0) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const coinType = network === 'mainnet' ? 0 : 1;
        const derivationPath = `m/${purpose}'/${coinType}'/${account}'/1/${index}`;

        await transport.connect(credentials.devicePath as string);
        const address = await transport.showAddress(derivationPath, false);

        return {
          address,
          derivationPath,
          addressType,
          index,
          account,
          network,
          isChange: true,
        };
      }

      case 'displayAddressOnDevice': {
        const derivationPath = this.getNodeParameter('derivationPath', itemIndex) as string;

        await transport.connect(credentials.devicePath as string);
        const address = await transport.showAddress(derivationPath, true);

        return {
          address,
          derivationPath,
          displayedOnDevice: true,
          message: 'Address displayed on device for verification',
        };
      }

      case 'verifyAddress': {
        const address = this.getNodeParameter('address', itemIndex) as string;
        const derivationPath = this.getNodeParameter('derivationPath', itemIndex) as string;

        await transport.connect(credentials.devicePath as string);
        const deviceAddress = await transport.showAddress(derivationPath, true);

        const matches = address === deviceAddress;

        return {
          verified: matches,
          providedAddress: address,
          deviceAddress,
          derivationPath,
          message: matches ? 'Address verified successfully' : 'Address mismatch!',
        };
      }

      case 'getAddressRange': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const startIndex = this.getNodeParameter('startIndex', itemIndex, 0) as number;
        const count = this.getNodeParameter('count', itemIndex, 10) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;
        const includeChange = this.getNodeParameter('includeChange', itemIndex, false) as boolean;

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const coinType = network === 'mainnet' ? 0 : 1;

        await transport.connect(credentials.devicePath as string);

        const addresses: Array<{
          address: string;
          derivationPath: string;
          index: number;
          isChange: boolean;
        }> = [];

        for (let i = startIndex; i < startIndex + count; i++) {
          const receivePath = `m/${purpose}'/${coinType}'/${account}'/0/${i}`;
          const receiveAddress = await transport.showAddress(receivePath, false);
          addresses.push({
            address: receiveAddress,
            derivationPath: receivePath,
            index: i,
            isChange: false,
          });

          if (includeChange) {
            const changePath = `m/${purpose}'/${coinType}'/${account}'/1/${i}`;
            const changeAddress = await transport.showAddress(changePath, false);
            addresses.push({
              address: changeAddress,
              derivationPath: changePath,
              index: i,
              isChange: true,
            });
          }
        }

        return {
          addresses,
          count: addresses.length,
          addressType,
          account,
          network,
        };
      }

      case 'exportAddressList': {
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wpkh') as string;
        const account = this.getNodeParameter('account', itemIndex, 0) as number;
        const count = this.getNodeParameter('count', itemIndex, 100) as number;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;
        const format = this.getNodeParameter('format', itemIndex, 'csv') as string;

        const purposeMap: Record<string, number> = {
          p2pkh: 44,
          'p2sh-p2wpkh': 49,
          p2wpkh: 84,
          p2tr: 86,
        };

        const purpose = purposeMap[addressType] || 84;
        const coinType = network === 'mainnet' ? 0 : 1;

        await transport.connect(credentials.devicePath as string);

        const addresses: Array<{ index: number; receive: string; change: string }> = [];

        for (let i = 0; i < count; i++) {
          const receivePath = `m/${purpose}'/${coinType}'/${account}'/0/${i}`;
          const changePath = `m/${purpose}'/${coinType}'/${account}'/1/${i}`;

          const receiveAddress = await transport.showAddress(receivePath, false);
          const changeAddress = await transport.showAddress(changePath, false);

          addresses.push({
            index: i,
            receive: receiveAddress,
            change: changeAddress,
          });
        }

        let content: string;
        if (format === 'csv') {
          content = 'index,receive_address,change_address\n';
          content += addresses.map((a) => `${a.index},${a.receive},${a.change}`).join('\n');
        } else {
          content = JSON.stringify(addresses, null, 2);
        }

        return {
          content,
          format,
          count: addresses.length,
          fileName: `addresses-${addressType}-${account}.${format}`,
        };
      }

      case 'getAddressType': {
        const address = this.getNodeParameter('address', itemIndex) as string;

        let addressType = 'unknown';
        let network = 'unknown';
        let scriptType = 'unknown';

        const prefix = address.substring(0, 4);

        if (address.startsWith('1')) {
          addressType = 'p2pkh';
          network = 'mainnet';
          scriptType = 'legacy';
        } else if (address.startsWith('3')) {
          addressType = 'p2sh';
          network = 'mainnet';
          scriptType = 'p2sh-p2wpkh or multisig';
        } else if (address.startsWith('bc1q')) {
          addressType = 'p2wpkh';
          network = 'mainnet';
          scriptType = 'native segwit';
        } else if (address.startsWith('bc1p')) {
          addressType = 'p2tr';
          network = 'mainnet';
          scriptType = 'taproot';
        } else if (address.startsWith('m') || address.startsWith('n')) {
          addressType = 'p2pkh';
          network = 'testnet';
          scriptType = 'legacy';
        } else if (address.startsWith('2')) {
          addressType = 'p2sh';
          network = 'testnet';
          scriptType = 'p2sh-p2wpkh or multisig';
        } else if (address.startsWith('tb1q')) {
          addressType = 'p2wpkh';
          network = 'testnet';
          scriptType = 'native segwit';
        } else if (address.startsWith('tb1p')) {
          addressType = 'p2tr';
          network = 'testnet';
          scriptType = 'taproot';
        }

        return {
          address,
          addressType,
          network,
          scriptType,
          length: address.length,
        };
      }

      case 'getMultisigAddress': {
        const m = this.getNodeParameter('m', itemIndex, 2) as number;
        const n = this.getNodeParameter('n', itemIndex, 3) as number;
        const xpubs = this.getNodeParameter('xpubs', itemIndex) as string[];
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wsh') as string;
        const index = this.getNodeParameter('index', itemIndex, 0) as number;

        // Multisig address generation would require actual key derivation
        // This is a placeholder showing the structure

        return {
          address: 'MULTISIG_ADDRESS_PLACEHOLDER',
          m,
          n,
          addressType,
          index,
          xpubs: xpubs.length,
          quorum: `${m}-of-${n}`,
          message: 'Multisig address generation requires full key derivation implementation',
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
