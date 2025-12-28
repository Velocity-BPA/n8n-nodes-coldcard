/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import * as crypto from 'crypto';
import { USBTransport } from '../transport/usbTransport';
import { SDCardHandler } from '../transport/sdCardHandler';

/**
 * Message signing operations for Coldcard
 */
export async function execute(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const credentials = await this.getCredentials('coldcardDevice');

  try {
    switch (operation) {
      case 'signMessage': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        const addressPath = this.getNodeParameter('addressPath', itemIndex, "m/84'/0'/0'/0/0") as string;
        const connectionType = credentials.connectionType as string;

        if (connectionType === 'usb') {
          const transport = new USBTransport();
          try {
            await transport.connect(credentials.devicePath as string);
            const signature = await transport.signMessage(message, addressPath);
            const address = await transport.showAddress(addressPath, false);

            return {
              signed: true,
              message,
              signature,
              address,
              derivationPath: addressPath,
              format: 'base64',
            };
          } finally {
            await transport.disconnect();
          }
        } else if (connectionType === 'sdCard') {
          const sdPath = credentials.sdCardPath as string;
          const handler = new SDCardHandler(sdPath);

          const messageFile = {
            message,
            path: addressPath,
            timestamp: new Date().toISOString(),
          };

          const fileName = `message-${Date.now()}.json`;
          await handler.writeFile(fileName, Buffer.from(JSON.stringify(messageFile)));

          return {
            signed: false,
            status: 'pending',
            fileName,
            message: 'Message file written to SD card. Use Coldcard to sign.',
            instructions: [
              '1. Insert SD card into Coldcard',
              '2. Navigate to Sign Message',
              '3. Select the message file',
              '4. Approve signing on device',
              '5. Return SD card to retrieve signature',
            ],
          };
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unsupported connection type: ${connectionType}`,
            { itemIndex },
          );
        }
      }

      case 'signMessageAtPath': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        const derivationPath = this.getNodeParameter('derivationPath', itemIndex) as string;

        const transport = new USBTransport();
        try {
          await transport.connect(credentials.devicePath as string);
          const signature = await transport.signMessage(message, derivationPath);
          const address = await transport.showAddress(derivationPath, false);

          return {
            signed: true,
            message,
            signature,
            address,
            derivationPath,
            format: 'base64',
          };
        } finally {
          await transport.disconnect();
        }
      }

      case 'verifySignature': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        const signature = this.getNodeParameter('signature', itemIndex) as string;
        const address = this.getNodeParameter('address', itemIndex) as string;

        // Note: Full signature verification requires bitcoinjs-message library
        // This is a structural placeholder

        const messageHash = crypto.createHash('sha256').update(message).digest('hex');

        return {
          message,
          signature,
          address,
          messageHash,
          verified: false,
          note: 'Full signature verification requires bitcoinjs-message library',
        };
      }

      case 'exportSignature': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        const signature = this.getNodeParameter('signature', itemIndex) as string;
        const address = this.getNodeParameter('address', itemIndex) as string;
        const format = this.getNodeParameter('format', itemIndex, 'ascii') as string;

        let content: string;

        if (format === 'ascii') {
          // RFC 2440 clearsigned message format
          content = `-----BEGIN BITCOIN SIGNED MESSAGE-----
${message}
-----BEGIN BITCOIN SIGNATURE-----
${address}

${signature}
-----END BITCOIN SIGNATURE-----`;
        } else if (format === 'json') {
          content = JSON.stringify({
            message,
            address,
            signature,
            timestamp: new Date().toISOString(),
          }, null, 2);
        } else {
          content = `${address}\n${signature}\n${message}`;
        }

        return {
          content,
          format,
          fileName: `signature-${Date.now()}.${format === 'json' ? 'json' : 'txt'}`,
        };
      }

      case 'getSignatureFormat': {
        const signature = this.getNodeParameter('signature', itemIndex) as string;

        let format = 'unknown';
        let encoding = 'unknown';
        let length = signature.length;

        // Detect format
        if (signature.match(/^[A-Za-z0-9+/=]+$/)) {
          format = 'base64';
          encoding = 'base64';
        } else if (signature.match(/^[0-9a-fA-F]+$/)) {
          format = 'hex';
          encoding = 'hex';
        } else if (signature.startsWith('-----BEGIN')) {
          format = 'pem';
          encoding = 'ascii';
        }

        return {
          signature: signature.substring(0, 20) + '...',
          format,
          encoding,
          length,
        };
      }

      case 'signRfc2440Message': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        const addressPath = this.getNodeParameter('addressPath', itemIndex, "m/84'/0'/0'/0/0") as string;

        const transport = new USBTransport();
        try {
          await transport.connect(credentials.devicePath as string);
          const signature = await transport.signMessage(message, addressPath);
          const address = await transport.showAddress(addressPath, false);

          const rfc2440 = `-----BEGIN BITCOIN SIGNED MESSAGE-----
${message}
-----BEGIN BITCOIN SIGNATURE-----
${address}

${signature}
-----END BITCOIN SIGNATURE-----`;

          return {
            signed: true,
            rfc2440,
            message,
            signature,
            address,
            derivationPath: addressPath,
          };
        } finally {
          await transport.disconnect();
        }
      }

      case 'signWithSpecificAddress': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        const address = this.getNodeParameter('address', itemIndex) as string;

        // This would require finding the derivation path for the address
        // which requires scanning or user input

        return {
          signed: false,
          address,
          message,
          error: 'Signing with a specific address requires knowing the derivation path. Please use signMessageAtPath with the correct derivation path.',
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
      `Message signing failed: ${(error as Error).message}`,
      { itemIndex },
    );
  }
}
