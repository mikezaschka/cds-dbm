"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAdapter = void 0;
const fs_1 = __importDefault(require("fs"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const BaseAdapter_1 = require("./BaseAdapter");
const util_1 = require("../util");
class SqliteAdapter extends BaseAdapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this._deployToReferenceDatabase = async () => {
            const dbPath = this.options.migrations.database.reference;
            const model = await cds.load(this.options.service.model);
            let cdssql = cds.compile.to.sql(model);
            cdssql.sort(util_1.sortByCasadingViews);
            if (fs_1.default.existsSync(dbPath)) {
                fs_1.default.unlinkSync(dbPath);
            }
            sqlite3_1.default.verbose();
            const db = new sqlite3_1.default.Database(dbPath);
            db.serialize(() => {
                for (const query of cdssql) {
                    console.log(query);
                    const res = db.run(query);
                    console.log(res);
                }
            });
            db.close();
        };
    }
    _truncateTable(table) {
        throw new Error('Method not implemented.');
    }
    _deployCdsToReferenceDatabase() {
        throw new Error('Method not implemented.');
    }
    _synchronizeCloneDatabase() {
        throw new Error('Method not implemented.');
    }
    _dropViewsFromCloneDatabase() {
        throw new Error('Method not implemented.');
    }
    liquibaseOptionsFor(cmd) {
        const credentials = this.options.service.credentials;
        const liquibaseOptions = {
            username: this.options.service.credentials.user,
            password: this.options.service.credentials.password,
            url: `jdbc:sqlite:${credentials.database}`,
            classpath: `${__dirname}/../../drivers/sqlite-jdbc-3.32.3.2.jar`,
            driver: 'org.sqlite.JDBC',
        };
        switch (cmd) {
            case 'diffChangeLog':
                liquibaseOptions.referenceUrl = `jdbc:sqlite:${this.options.migrations.database.reference}`;
                break;
            case 'update':
            case 'updateSQL':
            default:
                break;
        }
        return liquibaseOptions;
    }
    async deploy(args) {
        super.deploy(args);
        fs_1.default.unlinkSync(this.options.migrations.database.reference);
    }
}
exports.SqliteAdapter = SqliteAdapter;
//# sourceMappingURL=SqliteAdapter.js.map