/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { USBTransport } from '../transport/usbTransport';
import { SDCardHandler } from '../transport/sdCardHandler';
import {
  createMultisigConfig,
  generateColdcardMultisigConfig,
  parseColdcardMultisigConfig,
  generateOutputDescriptor,
  generateBSMS,
  parseBSMS,
  validateMultisigConfig,
  sortCosigners,
} from '../utils/multisigUtils';

/**
 * Multisig operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');

  try {
    switch (operation) {
      case 'createMultisigWallet': {
        const name = this.getNodeParameter('walletName', itemIndex) as string;
        const m = this.getNodeParameter('m', itemIndex) as number;
        const n = this.getNodeParameter('n', itemIndex) as number;
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wsh') as string;
        const network = this.getNodeParameter('network', itemIndex, 'mainnet') as string;
        const cosigners = this.getNodeParameter('cosigners', itemIndex) as Array<{
          name: string;
          xpub: string;
          fingerprint: string;
          derivationPath: string;
        }>;

        const config = createMultisigConfig(m, n, addressType, network, cosigners);
        const validation = validateMultisigConfig(config);

        if (!validation.valid) {
          throw new NodeOperationError(
            this.getNode(),
            `Invalid multisig config: ${validation.errors.join(', ')}`,
            { itemIndex },
          );
        }

        const coldcardConfig = generateColdcardMultisigConfig(config, name);
        const descriptor = generateOutputDescriptor(config);

        return {
          created: true,
          name,
          quorum: `${m}-of-${n}`,
          addressType,
          network,
          cosigners: config.cosigners.length,
          coldcardConfig,
          descriptor,
          validation,
        };
      }

      case 'importMultisigConfig': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;
        const format = this.getNodeParameter('format', itemIndex, 'coldcard') as string;

        if (format === 'coldcard') {
          const config = parseColdcardMultisigConfig(configText);
          return {
            imported: true,
            format: 'coldcard',
            m: config.M,
            n: config.N,
            addressType: config.addressType,
            cosigners: config.cosigners.length,
            config,
          };
        } else if (format === 'bsms') {
          const bsms = parseBSMS(configText);
          return {
            imported: true,
            format: 'bsms',
            descriptor: bsms.descriptor,
            version: bsms.version,
            token: bsms.token,
          };
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unknown config format: ${format}`,
            { itemIndex },
          );
        }
      }

      case 'exportMultisigConfig': {
        const m = this.getNodeParameter('m', itemIndex) as number;
        const n = this.getNodeParameter('n', itemIndex) as number;
        const name = this.getNodeParameter('walletName', itemIndex) as string;
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wsh') as string;
        const format = this.getNodeParameter('format', itemIndex, 'coldcard') as string;
        const cosigners = this.getNodeParameter('cosigners', itemIndex) as Array<{
          name: string;
          xpub: string;
          fingerprint: string;
          derivationPath: string;
        }>;

        const config = createMultisigConfig(m, n, addressType, 'mainnet', cosigners);

        let content: string;
        let fileName: string;

        if (format === 'coldcard') {
          content = generateColdcardMultisigConfig(config, name);
          fileName = `${name}-cc.txt`;
        } else if (format === 'bsms') {
          content = generateBSMS(config);
          fileName = `${name}.bsms`;
        } else if (format === 'descriptor') {
          content = generateOutputDescriptor(config);
          fileName = `${name}-descriptor.txt`;
        } else {
          content = JSON.stringify(config, null, 2);
          fileName = `${name}.json`;
        }

        return {
          content,
          format,
          fileName,
          quorum: `${m}-of-${n}`,
        };
      }

      case 'getMultisigInfo': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;

        const config = parseColdcardMultisigConfig(configText);

        return {
          name: config.name || 'Unknown',
          m: config.M,
          n: config.N,
          quorum: `${config.M}-of-${config.N}`,
          addressType: config.addressType,
          cosigners: config.cosigners.map((c) => ({
            name: c.name,
            fingerprint: c.fingerprint,
            derivationPath: c.derivationPath,
          })),
        };
      }

      case 'addCoSigner': {
        const existingConfig = this.getNodeParameter('existingConfig', itemIndex) as string;
        const newCosigner = this.getNodeParameter('cosigner', itemIndex) as {
          name: string;
          xpub: string;
          fingerprint: string;
          derivationPath: string;
        };

        const config = parseColdcardMultisigConfig(existingConfig);

        config.cosigners.push({
          name: newCosigner.name,
          xpub: newCosigner.xpub,
          fingerprint: newCosigner.fingerprint,
          derivationPath: newCosigner.derivationPath,
          deviceType: 'unknown',
        });

        const sortedCosigners = sortCosigners(config.cosigners);
        config.cosigners = sortedCosigners;

        const updatedConfig = generateColdcardMultisigConfig(
          {
            M: config.M,
            N: config.N + 1,
            addressType: config.addressType,
            cosigners: config.cosigners,
            derivationPath: config.derivationPath,
            network: 'mainnet',
          },
          config.name || 'multisig',
        );

        return {
          added: true,
          newCosigner: newCosigner.name,
          totalCosigners: config.cosigners.length,
          updatedConfig,
        };
      }

      case 'removeCoSigner': {
        const existingConfig = this.getNodeParameter('existingConfig', itemIndex) as string;
        const cosignerFingerprint = this.getNodeParameter('cosignerFingerprint', itemIndex) as string;

        const config = parseColdcardMultisigConfig(existingConfig);

        const initialCount = config.cosigners.length;
        config.cosigners = config.cosigners.filter((c) => c.fingerprint !== cosignerFingerprint);

        if (config.cosigners.length === initialCount) {
          throw new NodeOperationError(
            this.getNode(),
            `Cosigner with fingerprint ${cosignerFingerprint} not found`,
            { itemIndex },
          );
        }

        const updatedConfig = generateColdcardMultisigConfig(
          {
            M: config.M,
            N: config.N - 1,
            addressType: config.addressType,
            cosigners: config.cosigners,
            derivationPath: config.derivationPath,
            network: 'mainnet',
          },
          config.name || 'multisig',
        );

        return {
          removed: true,
          removedFingerprint: cosignerFingerprint,
          remainingCosigners: config.cosigners.length,
          updatedConfig,
        };
      }

      case 'getCoSigners': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;

        const config = parseColdcardMultisigConfig(configText);

        return {
          cosigners: config.cosigners.map((c) => ({
            name: c.name,
            fingerprint: c.fingerprint,
            xpub: c.xpub,
            derivationPath: c.derivationPath,
          })),
          count: config.cosigners.length,
          required: config.M,
        };
      }

      case 'getMultisigPolicy': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;

        const config = parseColdcardMultisigConfig(configText);
        const descriptor = generateOutputDescriptor({
          M: config.M,
          N: config.N,
          addressType: config.addressType,
          cosigners: config.cosigners,
          derivationPath: config.derivationPath,
          network: 'mainnet',
        });

        return {
          quorum: {
            required: config.M,
            total: config.N,
            description: `${config.M}-of-${config.N} multisignature`,
          },
          addressType: config.addressType,
          derivationPath: config.derivationPath,
          descriptor,
          cosignerFingerprints: config.cosigners.map((c) => c.fingerprint),
        };
      }

      case 'signMultisigPsbt': {
        const psbtBase64 = this.getNodeParameter('psbt', itemIndex) as string;

        const transport = new USBTransport();
        try {
          await transport.connect(credentials.devicePath as string);
          const signedPsbt = await transport.signPSBT(Buffer.from(psbtBase64, 'base64'));

          return {
            signed: true,
            signedPsbt: signedPsbt.toString('base64'),
            message: 'Partial signature added. Collect remaining signatures from other cosigners.',
          };
        } finally {
          await transport.disconnect();
        }
      }

      case 'getMultisigAddress': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;
        const index = this.getNodeParameter('index', itemIndex, 0) as number;
        const isChange = this.getNodeParameter('isChange', itemIndex, false) as boolean;

        const config = parseColdcardMultisigConfig(configText);

        // Note: Actual address derivation requires full crypto implementation
        return {
          index,
          isChange,
          quorum: `${config.M}-of-${config.N}`,
          message: 'Multisig address derivation requires full crypto library implementation',
        };
      }

      case 'exportMultisigDescriptor': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;

        const config = parseColdcardMultisigConfig(configText);
        const descriptor = generateOutputDescriptor({
          M: config.M,
          N: config.N,
          addressType: config.addressType,
          cosigners: config.cosigners,
          derivationPath: config.derivationPath,
          network: 'mainnet',
        });

        return {
          descriptor,
          format: 'output-descriptor',
          quorum: `${config.M}-of-${config.N}`,
        };
      }

      case 'importBsms': {
        const bsmsContent = this.getNodeParameter('bsmsContent', itemIndex) as string;

        const bsms = parseBSMS(bsmsContent);

        return {
          imported: true,
          version: bsms.version,
          descriptor: bsms.descriptor,
          pathRestrictions: bsms.pathRestrictions,
          token: bsms.token,
        };
      }

      case 'exportBsms': {
        const m = this.getNodeParameter('m', itemIndex) as number;
        const n = this.getNodeParameter('n', itemIndex) as number;
        const addressType = this.getNodeParameter('addressType', itemIndex, 'p2wsh') as string;
        const cosigners = this.getNodeParameter('cosigners', itemIndex) as Array<{
          name: string;
          xpub: string;
          fingerprint: string;
          derivationPath: string;
        }>;

        const config = createMultisigConfig(m, n, addressType, 'mainnet', cosigners);
        const bsms = generateBSMS(config);

        return {
          bsms,
          format: 'bsms',
          fileName: 'multisig.bsms',
        };
      }

      case 'getQuorumInfo': {
        const configText = this.getNodeParameter('configText', itemIndex) as string;

        const config = parseColdcardMultisigConfig(configText);

        const redundancy = config.N - config.M;
        const securityLevel = config.M >= 2 ? 'high' : 'medium';

        return {
          required: config.M,
          total: config.N,
          quorum: `${config.M}-of-${config.N}`,
          redundancy,
          maxLostKeys: redundancy,
          securityLevel,
          description: `Requires ${config.M} out of ${config.N} signatures. Can lose up to ${redundancy} keys.`,
        };
      }

      default:
        throw new NodeOperationError(
          this.getNode(),
          `Unknown operation: ${operation}`,
          { itemIndex },
        );
    }
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Multisig operation failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
