'use strict';

const { getClient, setClient, clearClient } = require('./connectionState');
const { getObjectsFromDatabase } = require('./databaseService/databaseService');
const {
	reverseCollectionsToJSON,
	mergeCollectionsWithViews,
	getCollectionsRelationships,
} = require('./reverseEngineeringService/reverseEngineeringService');
const logInfo = require('./helpers/logInfo');
const filterRelationships = require('./helpers/filterRelationships');

module.exports = {
	async connect(connectionInfo, logger, callback, app) {
		const client = getClient();
		if (!client) {
			await setClient(connectionInfo);
			return getClient();
		}

		return client;
	},

	disconnect(connectionInfo, logger, callback, app) {
		clearClient();
		callback();
	},

	async testConnection(connectionInfo, logger, callback, app) {
		try {
			logInfo('Test connection', connectionInfo, logger);
			await this.connect(connectionInfo);
			callback(null);
		} catch(error) {
			logger.log('error', { message: error.message, stack: error.stack, error }, 'Test connection');
			callback({ message: error.message, stack: error.stack });
		}
	},

	getDatabases(connectionInfo, logger, callback, app) {
		callback();
	},

	getDocumentKinds(connectionInfo, logger, callback, app) {
		callback();
	},

	async getDbCollectionsNames(connectionInfo, logger, callback, app) {
		try {
			logInfo('Retrieving databases and tables information', connectionInfo, logger);
			const client = await this.connect(connectionInfo);
			if (!client.config.database) {
				throw new Error('No database specified');
			}

			const objects = await getObjectsFromDatabase(client);
			callback(null, objects);
		} catch(error) {
			logger.log('error', { message: error.message, stack: error.stack, error }, 'Retrieving databases and tables information');
			callback({ message: error.message, stack: error.stack });
		}
	},

	async getDbCollectionsData(collectionsInfo, logger, callback, app) {
		try {
			logger.log('info', collectionsInfo, 'Retrieving schema', collectionsInfo.hiddenKeys);
			logger.progress({ message: 'Start reverse-engineering process' });
			const { collections } = collectionsInfo.collectionData;
			const client = getClient();
			if (!client.config.database) {
				throw new Error('No database specified');
			}

			const [jsonSchemas, relationships] = await Promise.all([
				await reverseCollectionsToJSON(logger)(client, collections),
				await getCollectionsRelationships(logger)(client, collections),
			]);
			callback(null, mergeCollectionsWithViews(jsonSchemas), null, filterRelationships(relationships, jsonSchemas));
		} catch (error) {
			logger.log('error', { message: error.message, stack: error.stack, error }, 'Reverse-engineering process failed');
			callback({ message: error.message, stack: error.stack })
		}
	}
};
