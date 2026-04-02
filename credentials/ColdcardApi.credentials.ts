import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ColdcardApi implements ICredentialType {
	name = 'coldcardApi';
	displayName = 'Coldcard API';
	documentationUrl = 'https://coldcard.com/docs/api';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The API key for Coldcard web services',
		},
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://coldcard.com/api/v1',
			description: 'Base URL for the Coldcard API',
		},
	];
}