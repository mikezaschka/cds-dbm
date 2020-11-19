"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PostgresAdapter_1 = require("./PostgresAdapter");
/**
 * Adapter factory returns an instance of the deployment/migration handler.
 *
 * @param {string} service
 * @param {configOptions} options
 */
const getAdapter = async (service, options) => {
    await cds.connect();
    switch (cds.services[service].constructor.name) {
        case 'PostgresDatabase':
            return new PostgresAdapter_1.PostgresAdapter(service, options);
            break;
        //case 'SQLiteDatabase':
        //  return new SqliteAdapter(service, options)
        //  break
        default:
            throw 'Unsupported database. Currently only PostgreSQL (cds-pg) is supported.';
            return null;
            break;
    }
};
exports.default = getAdapter;
//# sourceMappingURL=index.js.map