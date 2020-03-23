const transformDatabaseTableInfoToJSON = require('./transformDatabaseTableInfoToJSON');
const reverseTableForeignKeys = require('./reverseTableForeignKeys');
const reverseTableIndexes = require('./reverseTableIndexes');
const defineRequiredFields = require('./defineRequiredFields');
const defineFieldsDescription = require('./defineFieldsDescription');
const doesViewHaveRelatedTables = require('./doesViewHaveRelatedTables');
const reverseTableCheckConstraints = require('./reverseTableCheckConstraints');
const changeViewPropertiesToReferences = require('./changeViewPropertiesToReferences');
const defineFieldsKeyConstraints = require('./defineFieldsKeyConstraints');
const defineMaskedColumns = require('./defineMaskedColumns');
const defineJSONTypes = require('./defineJSONTypes');
const defineXmlFieldsCollections = require('./defineXmlFieldsCollections');
const defineFieldsDefaultConstraintNames = require('./defineFieldsDefaultConstraintNames');
const getKeyConstraintsCompositionStatuses = require('./getKeyConstraintsCompositionStatuses');
const reverseKeyConstraint = require('./reverseKeyConstraint');
const defineFieldsCompositeKeyConstraints = require('./defineFieldsCompositeKeyConstraints');
const reverseTableColumn = require('./reverseTableColumn');
const reorderTableRows = require('./reorderTableRows');
const reverseTableColumn = require('./reverseTableColumn');

module.exports = {
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
	getKeyConstraintsCompositionStatuses,
	reverseKeyConstraint,
	defineFieldsCompositeKeyConstraints,
	reverseTableColumn,
	reorderTableRows,
	reverseTableColumn,
}