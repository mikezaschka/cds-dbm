import Migration from '../interfaces/Migration'
import config from '../config'
import liquibase from '../liquibase'
import sqlite3 from 'sqlite3'
import { Client } from 'pg'
import yaml from 'js-yaml'

import cds from '@sap/cds'
import fs from 'fs'

const _syncMigrationDatabase = async () => {
  const dbPath = 'db/__migrations.db'

  fs.unlinkSync(dbPath)
  const db = new sqlite3.Database(dbPath)
  const model = await cds.load('srv')
  const cdssql = cds.compile.to.sql(model, { as: 'string' })

  db.serialize(function () {
    for (const query of cdssql) {
      db.run(query)
    }
  })
}

const _syncMigrationDatabasePostgres = async () => {
  const client = new Client({
    user: 'postgres',
    password: 'postgres', //default process.env.PGPASSWORD
    host: 'localhost', // default process.env.PGHOST
    database: 'beershop', // default process.env.PGDATABASE || process.env.USER
    port: 5432, // default process.env.PGPORT
  })
  await client.connect()
  await client.query(`DROP SCHEMA migrations CASCADE`)
  await client.query(`CREATE SCHEMA migrations`)
  await client.query(`SET search_path TO migrations;`)

  const model = await cds.load('srv')
  const cdssql = cds.compile.to.sql(model, { as: 'string' })

  cdssql.sort((a: any, b: any) => {
    const [, tableA, entityA] = a.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
    const [, tableB, entityB] = b.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []

    if (tableA && !tableB) {
      return -1
    }
    if (tableB && !tableA) {
      return 1
    }

    if (!tableB && !tableA) {
      if (a.includes(entityB)) {
        return 1
      }
      if (b.includes(entityA)) {
        return -1
      }
    }

    return -1
  })

  for (const query of cdssql) {
    await client.query(cds.services['db'].cdssql2pgsql(query))
  }

  await client.end()
}

const _dropAllViews = async () => {
  const model = await cds.load('srv')
  const cdssql = cds.compile.to.sql(model, { as: 'string' })
  const dropViews = []

  for (let each of cdssql) {
    each = cds.services['db'].cdssql2pgsql(each)
    const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
    if (!table) {
      dropViews.push({ DROP: { view: entity } })
    }
  }

  const tx = cds.services['db'].transaction()
  await tx.run(dropViews)
  return tx.commit()
}

const up = () => {
  return Promise.resolve()
}

const create = () => {
  return Promise.resolve()
}

const _createSnapshot = async (options: any) => {
  return await liquibase({   
    changeLogFile: options.changeLogFile,
    url: options.url,
    username: options.username,
    password: options.password,
    driver: 'org.postgresql.Driver',
    classpath: options.classpath,
    defaultSchemaName: 'public',
    outputFile: "db/snapshots/test.yml",
    snapshotFormat: "yaml"
  }).run('snapshot')
}

const _processChangelog = (changelog: string) => {
  let fileContents = fs.readFileSync(changelog, 'utf8')
  let data = yaml.safeLoad(fileContents)

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

const deploy = async (options: any) => {
  await _dropAllViews()
  await _syncMigrationDatabasePostgres()

  const changelog = 'db/migrations/__deploy.yml'

  // First create the diff
  await liquibase({
    changeLogFile: changelog,
    url: options.url,
    username: options.username,
    password: options.password,
    driver: 'org.postgresql.Driver',
    //classpath: `${options.classpath}:${__dirname}/../drivers/sqlite-jdbc-3.32.3.2.jar`,
    //referenceUrl: "jdbc:sqlite:db/__migrations.db",
    //referenceDriver: 'org.sqlite.JDBC'
    classpath: options.classpath,
    referenceUrl: options.url,
    referenceUsername: options.username,
    referencePassword: options.password,
    referenceDefaultSchemaName: 'migrations',
    defaultSchemaName: 'public',
  }).run('diffChangeLog')

  _processChangelog(changelog)

  // Then deploy to db
  await liquibase({
    changeLogFile: changelog,
    url: options.url,
    username: options.username,
    password: options.password,
    driver: 'org.postgresql.Driver',
    classpath: options.classpath,
  }).run('--logLevel error', 'update')

  fs.unlinkSync(changelog)
}

/**
 * Initializes thef
 */
const init = async (options: any) => {
  const template = fs.readFileSync(`${__dirname}/../template/migrations.yml`)
  fs.writeFileSync('db/migrations.yml', template)

  await _syncMigrationDatabasePostgres()

  // Override specific options
  Object.assign({}, options)

  await liquibase({
    changeLogFile: options.changeLogFile,
    url: options.url,
    username: options.username,
    password: options.password,
    classpath: options.classpath
  }).run('generateChangeLog')

  await _createSnapshot(options)
}

export { init, deploy, create, up }
