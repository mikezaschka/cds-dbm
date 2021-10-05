import { ConstructedQuery } from '@sap/cds/apis/ql'
import liquibase from '../liquibase'
import fs from 'fs'
import path from 'path'
import { Logger } from 'winston'
import { configOptions, liquibaseOptions } from './../config'
import { ChangeLog } from '../ChangeLog'
import { sortByCasadingViews } from '../util'
import { DataLoader } from '../DataLoader'
import { ViewDefinition } from '../types/AdapterTypes'

/**
 * Base class that contains all the shared stuff.
 */
export abstract class BaseAdapter {
  serviceKey: string
  options: configOptions
  logger: globalThis.Console
  cdsSQL: string[]
  cdsModel: any

  /**
   * The constructor
   *
   * @param serviceKey
   * @param options
   */
  constructor(serviceKey: string, options: configOptions) {
    this.serviceKey = serviceKey
    this.options = options
    this.logger = global.console
  }

  /*
   * Abstract functions
   */

  /**
   * Fully deploy the cds data model to the reference database.
   * The reference database needs to the cleared first.
   *
   * @abstract
   */
  abstract _deployCdsToReferenceDatabase(): Promise<void>

  /**
   * Synchronize the clone schema with the default one.
   *
   * @abstract
   */
  abstract _synchronizeCloneDatabase(): Promise<void>

  /**
   * Drop the views from the clone, since updating views is hard.
   *
   * @abstract
   */
  abstract _dropViewsFromCloneDatabase(): Promise<void>

  /**
   * Truncates a table
   *
   * @abstract
   */
  abstract _truncateTable(table): Promise<void>

  /**
   * Create the database.
   *
   * @abstract
   */
  abstract _createDatabase(): Promise<void>

  /**
   * Return the specific options for liquibase.
   *
   * @abstract
   */
  abstract liquibaseOptionsFor(cmd: string): liquibaseOptions

  abstract getViewDefinition(viewName: string): Promise<ViewDefinition>

  /*
   * Hooks
   */

  /**
   *
   * @param {ChangeLog} changelog
   */
  protected beforeDeploy(changelog: ChangeLog) {
    // Can be implemented in subclasses
  }

  /*
   * API functions
   */

  /**
   * Drop tables and views from the database. If +dropAll+ is
   * true, then the whole schema is dropped including non CDS
   * tables/views.
   *
   * @param {boolean} dropAll
   */
  public async drop({ dropAll = false }) {
    if (dropAll) {
      let liquibaseOptions = this.liquibaseOptionsFor('dropAll')
      await liquibase(liquibaseOptions).run('dropAll')
    } else {
      await this._dropCdsEntitiesFromDatabase(this.serviceKey, false)
    }
    return Promise.resolve()
  }

  /**
   *
   * @param {boolean} isFullMode
   */
  public async load(isFullMode: boolean = false) {
    await this.initCds()
    const loader = new DataLoader(this, isFullMode)
    // TODO: Make more flexible
    await loader.loadFrom(['data', 'csv'])
  }

  /**
   * Creates a liquibase diff file containing differences between the default
   * and the reference schema.
   *
   * @param {string} outputFile
   */
  public async diff(outputFile = null) {
    let keepFile = true
    await this.initCds()
    await this._deployCdsToReferenceDatabase()
    if (!outputFile) {
      outputFile = 'tmp/diff.txt'
      keepFile = false
    }

    // run update to create internal liquibase tables
    let liquibaseOptions = this.liquibaseOptionsFor('update')
    liquibaseOptions.defaultSchemaName = this.options.migrations.schema.reference

    // Revisit: Possible liquibase bug to not support changelogs by absolute path?
    //liquibaseOptions.changeLogFile = `${__dirname}../../template/emptyChangelog.json`
    const tmpChangelogPath = 'tmp/emptyChangelog.json'
    const dirname = path.dirname(tmpChangelogPath)
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname)
    }
    fs.copyFileSync(`${__dirname}/../../template/emptyChangelog.json`, tmpChangelogPath)
    liquibaseOptions.changeLogFile = tmpChangelogPath
    await liquibase(liquibaseOptions).run('update')
    fs.unlinkSync(tmpChangelogPath)

    // create the diff
    liquibaseOptions = this.liquibaseOptionsFor('diff')
    liquibaseOptions.outputFile = outputFile
    await liquibase(liquibaseOptions).run('diff')
    if (!keepFile) {
      const buffer = fs.readFileSync(liquibaseOptions.outputFile)
      this.logger.log(buffer.toString())
      fs.unlinkSync(liquibaseOptions.outputFile)
    } else {
      this.logger.log(`[cds-dbm] - diff file generated at ${liquibaseOptions.outputFile}`)
    }
  }

  /**
   * Identifies the changes between the cds definition and the database, generates a delta and deploys
   * this to the database.
   * We use a clone and reference schema to identify the delta, because we need to initially drop
   * all the views and we do not want to do this with a potential production database.
   *
   */
  async deploy({ autoUndeploy = false, loadMode = null, dryRun = false, createDb = false }) {
    this.logger.log(`[cds-dbm] - starting delta database deployment of service ${this.serviceKey}`)
    if (createDb) {
      await this._createDatabase()
    }
    await this.initCds()

    const temporaryChangelogFile = `${this.options.migrations.deploy.tmpFile}`
    if (fs.existsSync(temporaryChangelogFile)) {
      fs.unlinkSync(temporaryChangelogFile)
    }
    const dirname = path.dirname(temporaryChangelogFile)
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname)
    }

    // Setup the clone
    await this._synchronizeCloneDatabase()

    // Drop the known views from the clone
    await this._dropViewsFromCloneDatabase()

    // Create the initial changelog
    let liquibaseOptions = this.liquibaseOptionsFor('diffChangeLog')
    liquibaseOptions.defaultSchemaName = this.options.migrations.schema.default
    liquibaseOptions.referenceDefaultSchemaName = this.options.migrations.schema.clone
    liquibaseOptions.changeLogFile = temporaryChangelogFile

    await liquibase(liquibaseOptions).run('diffChangeLog')
    const dropViewsChangeLog = ChangeLog.fromFile(temporaryChangelogFile)
    fs.unlinkSync(temporaryChangelogFile)

    // Deploy the current state to the reference database
    await this._deployCdsToReferenceDatabase()

    // Update the changelog with the real changes and added views
    liquibaseOptions = this.liquibaseOptionsFor('diffChangeLog')
    liquibaseOptions.defaultSchemaName = this.options.migrations.schema.clone
    liquibaseOptions.changeLogFile = temporaryChangelogFile

    await liquibase(liquibaseOptions).run('diffChangeLog')

    const diffChangeLog = ChangeLog.fromFile(temporaryChangelogFile)

    // Merge the changelogs
    diffChangeLog.data.databaseChangeLog = dropViewsChangeLog.data.databaseChangeLog.concat(
      diffChangeLog.data.databaseChangeLog
    )

    // Process the changelog
    if (!autoUndeploy) {
      diffChangeLog.removeDropTableStatements()
    }
    diffChangeLog.addDropStatementsForUndeployEntities(this.options.migrations.deploy.undeployFile)

    const viewDefinitions = {}
    for (const changeLog of diffChangeLog.data.databaseChangeLog) {
      if (changeLog.changeSet.changes[0].dropView) {
        const viewName = changeLog.changeSet.changes[0].dropView.viewName
        viewDefinitions[viewName] = await this.getViewDefinition(viewName)
      }
      if (changeLog.changeSet.changes[0].createView) {
        const viewName = changeLog.changeSet.changes[0].createView.viewName
        viewDefinitions[viewName] = {
          name: viewName,
          definition: changeLog.changeSet.changes[0].createView.selectQuery,
        }
      }
    }
    diffChangeLog.reorderChangelog(viewDefinitions)

    // Call hooks
    this.beforeDeploy(diffChangeLog)

    diffChangeLog.toFile(temporaryChangelogFile)

    // Either log the update sql or deploy it to the database
    const updateCmd = dryRun ? 'updateSQL' : 'update'
    liquibaseOptions = this.liquibaseOptionsFor(updateCmd)
    liquibaseOptions.changeLogFile = temporaryChangelogFile

    const updateSQL: any = await liquibase(liquibaseOptions).run(updateCmd)
    if (!dryRun) {
      this.logger.log(`[cds-dbm] - delta successfully deployed to the database`)

      if (loadMode) {
        await this.load(loadMode.toLowerCase() === 'full')
      }
    } else {
      this.logger.log(updateSQL.stdout)
    }

    fs.unlinkSync(temporaryChangelogFile)
  }

  /*
   * Internal functions
   */

  /**
   * Initialize the cds model (only once)
   */
  private async initCds() {
    try {
      this.cdsModel = await cds.load(this.options.service.model)
    } catch (error) {
      throw new Error(`[cds-dbm] - failed to load model ${this.options.service.model}`)
    }

    this.cdsSQL = cds.compile.to.sql(this.cdsModel) as unknown as string[]
    this.cdsSQL.sort(sortByCasadingViews)

  }

  /**
   * Drops all known views (and tables) from the database.
   *
   * @param {string} service
   */
  protected async _dropCdsEntitiesFromDatabase(service: string, viewsOnly: boolean = true) {
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
    await tx.run(dropViews as unknown as ConstructedQuery)
    await tx.run(dropTables as unknown as ConstructedQuery)
    return tx.commit()
  }
}
