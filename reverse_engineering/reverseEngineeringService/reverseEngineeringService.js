const {
	getTableInfo,
	getTableRow,
	getTableForeignKeys,
	getDatabaseIndexes,
	getTableColumnsDescription,
	getDatabaseMemoryOptimizedTables,
	getDatabaseCheckConstraints,
	getViewTableInfo,
	getTableKeyConstraints,
	getViewColumnRelations,
	getTableMaskedColumns,
	getDatabaseXmlSchemaCollection,
	getTableDefaultConstraintNames,
} = require('../databaseService/databaseService');
const {
	transformDatabaseTableInfoToJSON,
	reverseTableForeignKeys,
	reverseTableIndexes,
	defineRequiredFields,
	defineFieldsDescription,
	doesViewHaveRelatedTables,
	reverseTableCheckConstraints,
	changeViewPropertiesToReferences,
	defineFieldsKeyConstraints,
	defineMaskedColumns,
	defineJSONTypes,
	defineXmlFieldsCollections,
	defineFieldsDefaultConstraintNames,
	defineFieldsCompositeKeyConstraints,
	reverseTableColumn,
} = require('./helpers');
const pipe = require('../helpers/pipe');

const mergeCollectionsWithViews = jsonSchemas =>
	jsonSchemas.reduce((structuredJSONSchemas, jsonSchema) => {
		if (jsonSchema.relatedTables) {
			const currentIndex = structuredJSONSchemas.findIndex(structuredSchema =>
				jsonSchema.collectionName === structuredSchema.collectionName && jsonSchema.dbName);
			const relatedTableSchemaIndex = structuredJSONSchemas.findIndex(({ collectionName, dbName }) =>
				jsonSchema.relatedTables.find(({ tableName, schemaName }) => tableName === collectionName && schemaName === dbName));

			if (relatedTableSchemaIndex !== -1 && doesViewHaveRelatedTables(jsonSchema, structuredJSONSchemas)) {
				structuredJSONSchemas[relatedTableSchemaIndex].views.push(jsonSchema);
			}

			delete jsonSchema.relatedTables;
			return structuredJSONSchemas.filter((schema, i) => i !== currentIndex);
		}

		return structuredJSONSchemas;
	}, jsonSchemas);

const getCollectionsRelationships = logger => async (dbConnectionClient) => {
	const dbName = dbConnectionClient.config.database;
	logger.progress({ message: 'Fetching tables relationships', containerName: dbName, entityName: '' });
	const tableForeignKeys = await getTableForeignKeys(dbConnectionClient, dbName);
	return reverseTableForeignKeys(tableForeignKeys, dbName);
};

const prepareViewJSON = (dbConnectionClient, dbName, viewName, schemaName) => async jsonSchema => {
	const [viewInfo, viewColumnRelations] = await Promise.all([
		await getViewTableInfo(dbConnectionClient, dbName, viewName, schemaName),
		await getViewColumnRelations(dbConnectionClient, dbName, viewName, schemaName),
	]);
	return {
		jsonSchema: changeViewPropertiesToReferences(jsonSchema, viewInfo, viewColumnRelations),
		name: viewName,
		relatedTables: viewInfo.map((columnInfo => ({
			tableName: columnInfo['ReferencedTableName'],
			schemaName: columnInfo['ReferencedSchemaName'],
		}))),
	};
};

const getUserDefinedTypes = tableInfo =>
	tableInfo.reduce((columnSchemas, column) => {
		if (!column['DOMAIN_NAME']) {
			return columnSchemas;
		}

		return {
			...columnSchemas,
			[column['DOMAIN_NAME']]: reverseTableColumn(column),
		};
	}, {});

const reverseCollectionsToJSON = logger => async (dbConnectionClient, tablesInfo, reverseEngineeringOptions) => {
	const dbName = dbConnectionClient.config.database;
	const [databaseIndexes, databaseMemoryOptimizedTables, databaseCheckConstraints, xmlSchemaCollections] = await Promise.all([
		await getDatabaseIndexes(dbConnectionClient, dbName),
		await getDatabaseMemoryOptimizedTables(dbConnectionClient, dbName),
		await getDatabaseCheckConstraints(dbConnectionClient, dbName),
		await getDatabaseXmlSchemaCollection(dbConnectionClient, dbName),
	]);
	return await Object.entries(tablesInfo).reduce(async (jsonSchemas, [schemaName, tableNames]) => {
		logger.progress({ message: 'Fetching database information', containerName: dbName, entityName: '' });
		const tablesInfo = await Promise.all(
			tableNames.map(async untrimmedTableName => {
				const tableName = untrimmedTableName.replace(/ \(v\)$/, '');
				const tableIndexes = databaseIndexes.filter(index =>
					index.TableName === tableName && index.schemaName === schemaName);
				const tableXmlSchemas = xmlSchemaCollections.filter(collection =>
					collection.tableName === tableName && collection.schemaName === schemaName);
				const tableCheckConstraints = databaseCheckConstraints.filter(cc => cc.table === tableName);
				logger.progress({ message: 'Fetching table information', containerName: dbName, entityName: tableName });

				const [tableInfo, tableRow, fieldsKeyConstraints] = await Promise.all([
					await getTableInfo(dbConnectionClient, dbName, tableName, schemaName),
					await getTableRow(dbConnectionClient, dbName, tableName, schemaName, reverseEngineeringOptions.rowCollectionSettings),
					await getTableKeyConstraints(dbConnectionClient, dbName, tableName, schemaName)
				]);
				const isView = tableInfo[0]['TABLE_TYPE'].trim() === 'V';
				if (!reverseEngineeringOptions.includeEmptyCollection && !tableRow.length) {
					return null;
				}

				const jsonSchema = pipe(
					transformDatabaseTableInfoToJSON(tableInfo),
					defineRequiredFields,
					defineFieldsDescription(await getTableColumnsDescription(dbConnectionClient, dbName, tableName, schemaName)),
					defineFieldsKeyConstraints(fieldsKeyConstraints),
					defineMaskedColumns(await getTableMaskedColumns(dbConnectionClient, dbName, tableName, schemaName)),
					defineJSONTypes(tableRow),
					defineXmlFieldsCollections(tableXmlSchemas),
					defineFieldsDefaultConstraintNames(await getTableDefaultConstraintNames(dbConnectionClient, dbName, tableName, schemaName)),
				)({ required: [], properties: {} });

				return {
					collectionName: tableName,
					dbName: schemaName,
					...(isView
						? await prepareViewJSON(dbConnectionClient, dbName, tableName, schemaName)(jsonSchema)
						: {
							validation: { jsonSchema },
							views: [],
						}
					),
					standardDoc: tableRow,
					collectionDocs: tableRow,
					documents: tableRow,
					entityLevel: {
						Indxs: reverseTableIndexes(tableIndexes),
						memory_optimized: databaseMemoryOptimizedTables.includes(tableName),
						chkConstr: reverseTableCheckConstraints(tableCheckConstraints),
						...defineFieldsCompositeKeyConstraints(fieldsKeyConstraints),
					},
					bucketInfo: {
						databaseName: dbName,
					},
					modelDefinitions: {
						definitions: getUserDefinedTypes(tableInfo),
					},
					emptyBucket: false,
				};
			})
		);
		return [...await jsonSchemas, ...tablesInfo.filter(Boolean)];
	}, Promise.resolve([]));
};

module.exports = {
	reverseCollectionsToJSON,
	mergeCollectionsWithViews,
	getCollectionsRelationships,
};
