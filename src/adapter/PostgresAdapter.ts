import { Client } from 'pg'
import { BaseAdapter } from './BaseAdapter'
import { liquibaseOptions } from './../config'
import { sortByCasadingViews } from '../util'
import { PostgresDatabase } from './../types/PostgresDatabase'

export class PostgresAdapter extends BaseAdapter {
  /**
   * Returns the liquidbase options for the given command.
   * 
   * @override
   * @param {string} cmd
   */
  liquibaseOptionsFor(cmd: string): liquibaseOptions {
    const credentials = this.options.service.credentials

    const liquibaseOptions: liquibaseOptions = {
      username: this.options.service.credentials.user,
      password: this.options.service.credentials.password,
      url: `jdbc:postgresql://${credentials.host}:${credentials.port}/${credentials.database}`,
      classpath: `${__dirname}/../../drivers/postgresql-42.2.8.jar`,
      driver: 'org.postgresql.Driver',
    }

    switch (cmd) {
      case 'diffChangeLog':
      case 'diff':
        liquibaseOptions.referenceUrl = liquibaseOptions.url
        liquibaseOptions.referenceUsername = liquibaseOptions.username
        liquibaseOptions.referencePassword = liquibaseOptions.password
        liquibaseOptions.defaultSchemaName = this.options.migrations.schema!.default
        liquibaseOptions.referenceDefaultSchemaName = this.options.migrations.schema!.reference
        break
      case 'update':
      default:
        break
    }

    return liquibaseOptions
  }

  async _syncMigrationDatabase() {
    const credentials = this.options.service.credentials
    const referenceSchema = this.options.migrations.schema!.reference
    const client = new Client({
      user: credentials.user,
      password: credentials.password,
      host: credentials.host,
      database: credentials.database,
      port: credentials.port,
    })
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS ${referenceSchema} CASCADE`)
    await client.query(`CREATE SCHEMA ${referenceSchema}`)
    await client.query(`SET search_path TO ${referenceSchema};`)

    const model = await cds.load(this.options.service.model)
    const serviceInstance = cds.services[this.serviceKey] as PostgresDatabase

    let cdssql: string[] = (cds.compile.to.sql(model) as unknown) as string[]
    cdssql.sort(sortByCasadingViews)

    for (const query of cdssql) {
      await client.query(serviceInstance.cdssql2pgsql(query))
    }

    await client.end()
  }
}
