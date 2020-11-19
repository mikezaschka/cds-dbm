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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLoader = void 0;
const cdsg = __importStar(require("@sap/cds"));
const cds = cdsg;
const { path, isdir, isfile } = cds.utils;
const { promisify } = require('util');
const readdir = promisify(cds.utils.readdir);
const read = promisify(cds.utils.readFile);
/**
 * Data loader class handling imports of csv files (json maybe added).
 * Logic is mainly derived from cds lib but enhanced to support delta loads.
 *
 * @see @sap/cds/lib/srv/db/deploy.js
 */
class DataLoader {
    /**
     *
     * @param adapter
     * @param isFullMode
     */
    constructor(adapter, isFullMode) {
        this.adapter = adapter;
        this.isFullMode = isFullMode;
    }
    /**
     *
     * @param locations
     */
    async loadFrom(locations) {
        if (!this.adapter.cdsModel._sources)
            return;
        const folders = new Set();
        for (let model of this.adapter.cdsModel._sources) {
            for (let data of locations) {
                for (let each of [model + data, model + '/../' + data]) {
                    let folder = path.resolve(each);
                    if (isdir(folder))
                        folders.add(folder);
                }
            }
        }
        if (folders.size === 0)
            return;
        for (let folder of folders) {
            const files = await readdir(folder);
            for (let each of files.filter(this._filterCsvFiles)) {
                // Verify entity
                let name = each.replace(/-/g, '.').slice(0, -path.extname(each).length);
                let entity = this._entity4(name);
                if (entity['@cds.persistence.skip'] === true)
                    continue;
                // Load the content
                const file = path.join(folder, each);
                const src = await read(file, 'utf8');
                if (!src)
                    continue;
                console.log(`[cds-dbm] - loading data from ${file}`);
                const tx = await cds.services[this.adapter.serviceKey].transaction({});
                await this._insertOrUpdateData(entity, src);
                await tx.commit();
            }
        }
    }
    /**
     *
     * @param entity
     * @param src
     */
    async _insertOrUpdateData(entity, src) {
        let [cols, ...rows] = cds.parse.csv(src);
        UPDATE;
        if (this.isFullMode) {
            return this._performFullUpdate(entity, rows, cols);
        }
        else {
            return this._performDeltaUpdate(entity, rows, cols);
        }
    }
    /**
     *
     * @param entity
     * @param rows
     * @param cols
     */
    async _performFullUpdate(entity, rows, cols) {
        await this.adapter._truncateTable(entity.name.replace(/\.|-/g, '_'));
        for (const row of rows) {
            await INSERT.into(entity).columns(cols).values(row);
        }
    }
    /**
     *
     * @param entity
     * @param rows
     * @param cols
     */
    async _performDeltaUpdate(entity, rows, cols) {
        for (const row of rows) {
            const keyColumns = Object.keys(entity.keys);
            let where = keyColumns.reduce((set, col, index) => {
                set[col] = row[index];
                return set;
            }, {});
            let record = await SELECT.from(entity.name).columns(keyColumns.join(',')).where(where);
            if (record.length > 0) {
                let set = cols.reduce((set, col, index) => {
                    set[col] = row[index];
                    return set;
                }, {});
                await UPDATE(entity.name).set(set).where(where);
            }
            else {
                await INSERT.into(entity).columns(cols).values(row);
            }
        }
    }
    /**
     *
     * @param filename
     * @param _
     * @param allFiles
     */
    _filterCsvFiles(filename, _, allFiles) {
        if (filename[0] === '-' || !filename.endsWith('.csv'))
            return false;
        if (/_texts\.csv$/.test(filename) && this._check_lang_file(filename, allFiles)) {
            return false;
        }
        return true;
    }
    /**
     *
     * @param filename
     * @param allFiles
     */
    _check_lang_file(filename, allFiles) {
        // ignores 'Books_texts.csv/json' if there is any 'Books_texts_LANG.csv/json'
        const basename = path.basename(filename);
        const monoLangFiles = allFiles.filter((file) => new RegExp('^' + basename + '_').test(file));
        if (monoLangFiles.length > 0) {
            //DEBUG && DEBUG (`ignoring '${filename}' in favor of [${monoLangFiles}]`)  // eslint-disable-line
            return true;
        }
        return false;
    }
    /**
     *
     * @param name
     */
    _entity4(name) {
        let entity = this.adapter.cdsModel.definitions[name];
        if (!entity) {
            if (/(.+)_texts_?/.test(name)) {
                // 'Books_texts', 'Books_texts_de'
                const base = this.adapter.cdsModel.definitions[RegExp.$1];
                return base && this._entity4(base.elements.texts.target);
            }
            else
                return;
        }
        // We also support insert into simple views if they have no projection
        if (entity.query) {
            let { SELECT } = entity.query;
            if (SELECT && !SELECT.columns && SELECT.from.ref && SELECT.from.ref.length === 1) {
                if (this.adapter.cdsModel.definitions[SELECT.from.ref[0]])
                    return entity;
            }
        }
        return entity.name ? entity : { name, __proto__: entity };
    }
}
exports.DataLoader = DataLoader;
//# sourceMappingURL=DataLoader.js.map