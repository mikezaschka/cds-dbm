import { Client } from 'pg'
import { PostgresDatabase } from '../../src/types/PostgresDatabase'
import { configOptions, credentials } from '../../src/config';

function getCredentialsForClient(credentials) {
  if (typeof credentials.username !== 'undefined') {
    credentials.user = credentials.username
  }
  if (typeof credentials.hostname !== 'undefined') {
    credentials.host = credentials.hostname
  }
  if (typeof credentials.dbname !== 'undefined') {
    credentials.database = credentials.dbname
  }
  return {
    user: credentials.user,
    password: credentials.password,
    host: credentials.host,
    database: credentials.database,
    port: credentials.port,
  }
}

async function getTableNamesFromPostgres(options: configOptions, tenant?: string) {
  let schema = options.migrations.schema.default;
  
  // override default schema with tenant schema
  if (tenant) {
    schema = tenant;
  }
  const credentials = options.service.credentials;
  const query = `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = '` + schema + `' ORDER BY table_name;` as string;
  const client = new Client(getCredentialsForClient(credentials))
  await client.connect()
  const { rows } = await client.query(query)
  await client.end()

  return rows
}

async function getViewNamesFromPostgres(options: configOptions) {

  const credentials = options.service.credentials as credentials;
  const query = `SELECT table_name FROM information_schema.views WHERE table_schema = '` + options.migrations.schema.default + `' ORDER BY table_name;` as string;
  const client = new Client(getCredentialsForClient(credentials))
  await client.connect()
  const { rows } = await client.query(query)
  await client.end()

  return rows
}

const extractColumnNamesFromPostgres = async (options: configOptions, table) => {

  const credentials = options.service.credentials as credentials;
  const query = `SELECT column_name FROM information_schema.columns WHERE table_schema = '` + options.migrations.schema.default + `' AND table_name = $1 ORDER BY column_name;` as string;
  const client = new Client(getCredentialsForClient(credentials))
  await client.connect()
  const { rows } = await client.query({
    text: query,
    values: [table],
  })
  await client.end()

  return rows
}

const extractTableColumnNamesFromSQL = (sql) => {
  const regex = /(CREATE TABLE(.+)\()*(\s+(?<name>.+?)\s.+,\n)/gim
  let m
  const names = []
  while ((m = regex.exec(sql)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex === 4) {
        names.push(match.toLowerCase())
      }
    })
  }
  return names
}

const extractViewColumnNames = (sql) => {
  const regex = /(CREATE VIEW(.+)\()*(\s+(?<name>.+?)\s.+,\n)/gim
  let m
  const names = []
  while ((m = regex.exec(sql)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex === 4) {
        names.push(match.split('.')[0].toLowerCase())
      }
    })
  }
  return names
}

const getCompiledSQL = async (service, model) => {
  const csn = await cds.load(model)
  let cdssql: string[] = cds.compile.to.sql(csn) as unknown as string[]
  const serviceInstance = cds.services[service] as PostgresDatabase

  for (const index in cdssql) {
    cdssql[index] = serviceInstance.cdssql2pgsql(cdssql[index])
  }

  return cdssql
}

const getEntityNamesFromCds = async (service, model) => {
  const queries = await getCompiledSQL(service, model)
  return queries.map((query) => {
    const [, table, entity] = query.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
    return { name: entity, isTable: table }
  })
}

async function dropDatabase(credentials) {
  const clientCredentials = getCredentialsForClient(credentials)
  const { database } = clientCredentials
  delete clientCredentials.database

  const client = new Client(clientCredentials)
  await client.connect()
  try {
    await client.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database}';`)
    await client.query(`DROP database ${database} `)
  } catch (error) {
    console.error(error)
  }

  await client.end()
}

export {
  extractColumnNamesFromPostgres,
  getTableNamesFromPostgres,
  getViewNamesFromPostgres,
  getCompiledSQL,
  getEntityNamesFromCds,
  extractTableColumnNamesFromSQL,
  extractViewColumnNames,
  dropDatabase,
}
