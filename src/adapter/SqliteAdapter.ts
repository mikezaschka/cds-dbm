import fs from 'fs'
import sqlite3 from 'sqlite3'
import { BaseAdapter } from './BaseAdapter'
import { liquibaseOptions } from './../config'
import { sortByCasadingViews } from '../util'

export class SqliteAdapter extends BaseAdapter {
  _createDatabase(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  _truncateTable(table: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
  _deployCdsToReferenceDatabase(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  _synchronizeCloneDatabase(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  _dropViewsFromCloneDatabase(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  liquibaseOptionsFor(cmd: string): liquibaseOptions {
    const credentials = this.options.service.credentials

    const liquibaseOptions: liquibaseOptions = {
      username: this.options.service.credentials.user,
      password: this.options.service.credentials.password,
      url: `jdbc:sqlite:${credentials.database}`,
      classpath: `${__dirname}/../../drivers/sqlite-jdbc-3.32.3.2.jar`,
      driver: 'org.sqlite.JDBC',
    }

    switch (cmd) {
      case 'diffChangeLog':
        liquibaseOptions.referenceUrl = `jdbc:sqlite:${this.options.migrations.database!.reference}`
        break
      case 'update':
      case 'updateSQL':
      default:
        break
    }

    return liquibaseOptions
  }

  _deployToReferenceDatabase = async () => {
    const dbPath = this.options.migrations.database!.reference
    const model = await cds.load(this.options.service.model)
    let cdssql: string[] = (cds.compile.to.sql(model) as unknown) as string[]
    cdssql.sort(sortByCasadingViews)

    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
    }

    sqlite3.verbose()
    const db = new sqlite3.Database(dbPath)
    db.serialize(() => {
      for (const query of cdssql) {
        console.log(query)
        const res = db.run(query)
        console.log(res)
      }
    })
    db.close()
  }

  async deploy(args) {
    super.deploy(args)
    fs.unlinkSync(this.options.migrations.database!.reference)
  }
}
