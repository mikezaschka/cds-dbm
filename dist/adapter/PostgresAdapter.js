"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresAdapter = void 0;
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const cdsg = __importStar(require("@sap/cds"));
const cds = cdsg;
const liquibase_1 = __importDefault(require("../liquibase"));
const BaseAdapter_1 = require("./BaseAdapter");
const ChangeLog_1 = require("../ChangeLog");
const getCredentialsForClient = (credentials) => {
    if (typeof credentials.username !== 'undefined') {
        credentials.user = credentials.username;
    }
    if (typeof credentials.hostname !== 'undefined') {
        credentials.host = credentials.hostname;
    }
    if (typeof credentials.dbname !== 'undefined') {
        credentials.database = credentials.dbname;
    }
    const config = {
        user: credentials.user,
        password: credentials.password,
        host: credentials.host,
        database: credentials.database,
        port: credentials.port,
    };
    if (credentials.sslrootcert) {
        config.ssl = {
            rejectUnauthorized: false,
            ca: credentials.sslrootcert,
        };
    }
    return config;
};
class PostgresAdapter extends BaseAdapter_1.BaseAdapter {
    /**
     * @override
     * @param changelog
     */
    beforeDeploy(changelog) {
        this.removePGStatsFromChangelog(changelog);
    }
    /**
     *
     * @override
     * @param table
     */
    async _truncateTable(table) {
        const credentials = this.options.service.credentials;
        const client = new pg_1.Client(getCredentialsForClient(credentials));
        await client.connect();
        await client.query(`TRUNCATE ${table} RESTART IDENTITY`);
        client.end();
    }
    /**
     *
     */
    async _dropViewsFromCloneDatabase() {
        const credentials = this.options.service.credentials;
        const cloneSchema = this.options.migrations.schema.clone;
        const client = new pg_1.Client(getCredentialsForClient(credentials));
        await client.connect();
        await client.query(`SET search_path TO ${cloneSchema};`);
        for (const query of this.cdsSQL) {
            const [, table, entity] = query.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || [];
            if (!table) {
                await client.query(`DROP VIEW IF EXISTS ${entity} CASCADE`);
            }
        }
        return client.end();
    }
    /**
     * Returns the liquibase options for the given command.
     *
     * @override
     * @param {string} cmd
     */
    liquibaseOptionsFor(cmd) {
        const credentials = this.options.service.credentials;
        var url = `jdbc:postgresql://${credentials.host || credentials.hostname}:${credentials.port}/${credentials.database || credentials.dbname}`;
        if (credentials.sslrootcert) {
            url += '?ssl=true';
        }
        const liquibaseOptions = {
            username: credentials.user || credentials.username,
            password: this.options.service.credentials.password,
            url: url,
            classpath: `${__dirname}/../../drivers/postgresql-42.2.8.jar`,
            driver: 'org.postgresql.Driver',
        };
        switch (cmd) {
            case 'diffChangeLog':
            case 'diff':
                liquibaseOptions.referenceUrl = liquibaseOptions.url;
                liquibaseOptions.referenceUsername = liquibaseOptions.username;
                liquibaseOptions.referencePassword = liquibaseOptions.password;
                liquibaseOptions.defaultSchemaName = this.options.migrations.schema.default;
                liquibaseOptions.referenceDefaultSchemaName = this.options.migrations.schema.reference;
                break;
            case 'update':
            case 'updateSQL':
            case 'dropAll':
            default:
                break;
        }
        return liquibaseOptions;
    }
    async _synchronizeCloneDatabase() {
        const credentials = this.options.service.credentials;
        const cloneSchema = this.options.migrations.schema.clone;
        const temporaryChangelogFile = `${this.options.migrations.deploy.tmpFile}`;
        const client = new pg_1.Client(getCredentialsForClient(credentials));
        await client.connect();
        await client.query(`DROP SCHEMA IF EXISTS ${cloneSchema} CASCADE`);
        await client.query(`CREATE SCHEMA ${cloneSchema}`);
        await client.end();
        // Basically create a copy of the schema
        let liquibaseOptions = this.liquibaseOptionsFor('diffChangeLog');
        liquibaseOptions.defaultSchemaName = cloneSchema;
        liquibaseOptions.referenceDefaultSchemaName = this.options.migrations.schema.default;
        liquibaseOptions.changeLogFile = temporaryChangelogFile;
        await liquibase_1.default(liquibaseOptions).run('diffChangeLog');
        // Remove unnecessary stuff
        const diffChangeLog = ChangeLog_1.ChangeLog.fromFile(temporaryChangelogFile);
        this.removePGStatsFromChangelog(diffChangeLog);
        diffChangeLog.toFile(temporaryChangelogFile);
        // Now deploy the copy to the clone
        liquibaseOptions = this.liquibaseOptionsFor('update');
        liquibaseOptions.defaultSchemaName = cloneSchema;
        liquibaseOptions.changeLogFile = temporaryChangelogFile;
        await liquibase_1.default(liquibaseOptions).run('update');
        fs_1.default.unlinkSync(temporaryChangelogFile);
        return Promise.resolve();
    }
    removePGStatsFromChangelog(changelog) {
        for (const changeLog of changelog.data.databaseChangeLog) {
            changeLog.changeSet.changes = changeLog.changeSet.changes.filter((change) => {
                return !(change.createView && change.createView.viewName.includes('pg_stat_statements'));
            });
        }
    }
    /**
     * @override
     */
    async _deployCdsToReferenceDatabase() {
        const credentials = this.options.service.credentials;
        const referenceSchema = this.options.migrations.schema.reference;
        const client = new pg_1.Client(getCredentialsForClient(credentials));
        await client.connect();
        await client.query(`DROP SCHEMA IF EXISTS ${referenceSchema} CASCADE`);
        await client.query(`CREATE SCHEMA ${referenceSchema}`);
        await client.query(`SET search_path TO ${referenceSchema};`);
        const serviceInstance = cds.services[this.serviceKey];
        for (const query of this.cdsSQL) {
            await client.query(serviceInstance.cdssql2pgsql(query));
        }
        return client.end();
    }
    /**
     * @override
     */
    async _ensureDatabaseExists() {
        const clientCredentials = getCredentialsForClient(this.options.service.credentials);
        const { database } = clientCredentials;
        // Do not connect directly to the database
        delete clientCredentials.database;
        const client = new pg_1.Client(clientCredentials);
        await client.connect();
        try {
            // Revisit: should be more safe, but does not work
            // await client.query(`CREATE DATABASE $1`, [this.options.service.credentials.database])
            //await client.query(`CREATE DATABASE ${database}`)
            await client.query(`CREATE DATABASE beershop`);
        }
        catch (error) {
            switch (error.code) {
                case '42P04': // already exists
                case '23505': // concurrent attempt
                    break;
                default:
                    throw error;
            }
        }
        client.end();
    }
}
exports.PostgresAdapter = PostgresAdapter;
//# sourceMappingURL=PostgresAdapter.js.map