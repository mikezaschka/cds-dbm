import * as cdsg from '@sap/cds'
import { BaseAdapter } from './adapter/BaseAdapter'
const cds = cdsg as any
const { fs, path, isdir, read } = cds.utils
const { promisify } = require('util')
const { readdir } = fs.promises

// TS: Fix UPDATE issue
declare const UPDATE: any

/**
 * Data loader class handling imports of csv files (json maybe added).
 * Logic is mainly derived from cds lib but enhanced to support delta loads.
 *
 * @see @sap/cds/lib/srv/db/deploy.js
 */
export class DataLoader {
  private adapter: BaseAdapter
  private isFullMode: boolean

  /**
   *
   * @param adapter
   * @param isFullMode
   */
  constructor(adapter: BaseAdapter, isFullMode: boolean) {
    this.adapter = adapter
    this.isFullMode = isFullMode
  }

  /**
   *
   * @param locations
   */
  async loadFrom(locations) {
    if (!this.adapter.cdsModel.$sources) return
    const folders = new Set()
    for (let model of this.adapter.cdsModel.$sources) {
      for (let data of locations) {
        for (let each of [model + data, model + '/../' + data]) {
          let folder = path.resolve(each)
          if (isdir(folder)) folders.add(folder)
        }
      }
    }

    if (folders.size === 0) return
    for (let folder of folders) {
      const files = await readdir(folder)
      for (let each of files.filter(this._filterCsvFiles.bind(this))) {
        // Verify entity
        let name = each.replace(/-/g, '.').slice(0, -path.extname(each).length)
        let entity = this._entity4(name)
        if (entity['@cds.persistence.skip'] === true) continue
        // Load the content
        const file = path.join(folder, each)
        const src = await read(file, 'utf8')
        if (!src) continue

        console.log(`[cds-dbm] - loading data from ${file}`)
        const tx = await cds.services[this.adapter.serviceKey].transaction({})
        await this._insertOrUpdateData(entity, src)
        await tx.commit()
      }
    }
  }

  /**
   *
   * @param entity
   * @param src
   */
  private async _insertOrUpdateData(entity, src) {
    let [cols, ...rows] = cds.parse.csv(src)
    UPDATE as unknown
    if (this.isFullMode) {
      return this._performFullUpdate(entity, rows, cols)
    } else {
      return this._performDeltaUpdate(entity, rows, cols)
    }
  }

  /**
   *
   * @param entity
   * @param rows
   * @param cols
   */
  private async _performFullUpdate(entity, rows, cols) {
    await this.adapter._truncateTable(entity.name.replace(/\.|-/g, '_'))
    for (const row of rows) {
      await INSERT.into(entity).columns(cols).values(row)
    }
  }

  /**
   *
   * @param entity
   * @param rows
   * @param cols
   */
  private async _performDeltaUpdate(entity, rows, cols) {
    const lowercaseColumns = cols.map((c) => c.toLowerCase())
    for (const row of rows) {
      const keyColumns = Object.keys(entity.keys)
      let key = keyColumns.reduce((set, col, index) => {
        set[col] = row[lowercaseColumns.indexOf(col.toLowerCase())]
        return set
      }, {})

      let record = await SELECT.one.from(entity.name, key)
      if (record && !Array.isArray(record)) {
        let set = cols.reduce((set, col, index) => {
          if (typeof row[index] !== 'undefined') {
            set[col] = row[index]
          }
          return set
        }, {})
        await UPDATE(entity.name).set(set).where(key)
      } else {
        await INSERT.into(entity).columns(cols).values(row)
      }
    }
  }

  /**
   *
   * @param filename
   * @param _
   * @param allFiles
   */
  private _filterCsvFiles(filename, _, allFiles) {
    if (filename[0] === '-' || !filename.endsWith('.csv')) return false
    if (/_texts\.csv$/.test(filename) && this._check_lang_file(filename, allFiles)) {
      return false
    }
    return true
  }

  /**
   *
   * @param filename
   * @param allFiles
   */
  private _check_lang_file(filename, allFiles) {
    // ignores 'Books_texts.csv/json' if there is any 'Books_texts_LANG.csv/json'
    const basename = path.basename(filename)
    const monoLangFiles = allFiles.filter((file) => new RegExp('^' + basename + '_').test(file))
    if (monoLangFiles.length > 0) {
      //DEBUG && DEBUG (`ignoring '${filename}' in favor of [${monoLangFiles}]`)  // eslint-disable-line
      return true
    }
    return false
  }

  /**
   *
   * @param name
   */
  private _entity4(name) {
    let entity = this.adapter.cdsModel.definitions[name]
    if (!entity) {
      if (/(.+)_texts_?/.test(name)) {
        // 'Books_texts', 'Books_texts_de'
        const base = this.adapter.cdsModel.definitions[RegExp.$1]
        return base && this._entity4(base.elements.texts.target)
      } else return
    }
    // We also support insert into simple views if they have no projection
    if (entity.query) {
      let { SELECT } = entity.query
      if (SELECT && !SELECT.columns && SELECT.from.ref && SELECT.from.ref.length === 1) {
        if (this.adapter.cdsModel.definitions[SELECT.from.ref[0]]) return entity
      }
    }
    return entity.name ? entity : { name, __proto__: entity }
  }
}
