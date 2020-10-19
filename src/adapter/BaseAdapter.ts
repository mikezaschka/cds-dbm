import { ConstructedQuery } from '@sap/cds/apis/ql'
import liquibase from '../liquibase'
import fs from 'fs'
import yaml from 'js-yaml'
import { configOptions, liquibaseOptions } from './../config'

/**
 *
 */
export abstract class BaseAdapter {
  serviceKey: string
  options: configOptions

  /**
   * The constructor
   *
   * @param serviceKey
   * @param options
   */
  constructor(serviceKey: string, options: configOptions) {
    this.serviceKey = serviceKey
    this.options = options
  }

  /**
   * @abstract
   */
  abstract async _syncMigrationDatabase(): Promise<void>

  /**
   * @abstract
   */
  abstract liquibaseOptionsFor(cmd: string): liquibaseOptions

  /**
   * 
   */
  public async drop() {
    await this._dropEntities(this.serviceKey, false)
  }

  public async diff() {
    await this._syncMigrationDatabase()
    let liquibaseOptions = this.liquibaseOptionsFor('diff')
    liquibaseOptions.outputFile = 'mydiff.txt'
    await liquibase(liquibaseOptions).run('diff')
  }

  public async deploy() {
    await this._dropEntities(this.serviceKey)
    await this._syncMigrationDatabase()

    const temporaryChangelogFile = 'tmp/__deploy.yml'
    //const temporaryChangelogFile = `${this.options.deploy.tempChangelogFile}.${this.options.deploy.format}`

    let liquibaseOptions = this.liquibaseOptionsFor('diffChangeLog')
    liquibaseOptions.changeLogFile = temporaryChangelogFile

    // Create the diff
    await liquibase(liquibaseOptions).run('diffChangeLog')

    // Process the file
    await this._reorderChangelog(temporaryChangelogFile)

    // Deploy to database
    liquibaseOptions = this.liquibaseOptionsFor('update')
    liquibaseOptions.changeLogFile = temporaryChangelogFile

    await liquibase(liquibaseOptions).run('--logLevel error', 'update')

    fs.unlinkSync(temporaryChangelogFile)
  }

  /**
   * Drops all known views from the database.
   *
   * @param {string} service
   */
  protected async _dropEntities(service: string, viewsOnly: boolean = true) {
    const model = await cds.load(this.options.service.model)
    const cdssql = cds.compile.to.sql(model)
    const dropViews = []
    const dropTables = []

    for (let each of cdssql) {
      const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
      if (!table) {
        dropViews.push({ DROP: { view: entity } })
      }
      if (!viewsOnly && table) {
        dropTables.push({ DROP: { table: entity } })
      }
    }

    const tx = cds.services[service].transaction({})
    await tx.run((dropViews as unknown) as ConstructedQuery)
    await tx.run((dropTables as unknown) as ConstructedQuery)
    return tx.commit()
  }

  /**
   * The created changelog file needs to be sorted in order to work well.
   * The sort order should be:
   *
   * - alter table statements (add_column, drop_column, ...)
   * - create table statements
   * - create view statements that are not based on other views
   * - create view statements that are based on other views
   *
   * @param {string} changelog
   */
  async _reorderChangelog(changelog: string) {
    let fileContents = fs.readFileSync(changelog, 'utf8')
    let data: any = yaml.safeLoad(fileContents)

    data.databaseChangeLog.sort((a: any, b: any) => {
      if (a.changeSet.changes[0].createView || !b.changeSet.changes[0].createView) {
        return 1
      }
      if (!a.changeSet.changes[0].createView || b.changeSet.changes[0].createView) {
        return -1
      }

      if (a.changeSet.changes[0].createView || b.changeSet.changes[0].createView) {
        if (a.changeSet.changes[0].createView.selectQuery.contains(b.changeSet.changes[0].createView.viewName)) {
          return -1
        }
        if (b.changeSet.changes[0].createView.selectQuery.contains(a.changeSet.changes[0].createView.viewName)) {
          return 1
        }
      }
      return 0
    })

    let yamlStr = yaml.safeDump(data)
    fs.writeFileSync(changelog, yamlStr, 'utf8')
  }
}
