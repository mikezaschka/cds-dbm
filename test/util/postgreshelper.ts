import { Client } from 'pg'
import { PostgresDatabase } from '../../src/types/PostgresDatabase'

async function getTableNamesFromPostgres(credentials) {
  const client = new Client({
    user: credentials.user,
    password: credentials.password,
    host: credentials.host,
    database: credentials.database,
    port: credentials.port,
  })
  await client.connect()
  const { rows } = await client.query(
    `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
  )
  await client.end()

  return rows
}

const extractColumnNamesFromPostgres = async (credentials, table) => {
  const client = new Client({
    user: credentials.user,
    password: credentials.password,
    host: credentials.host,
    database: credentials.database,
    port: credentials.port,
  })
  await client.connect()
  const { rows } = await client.query({
    text: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name;`,
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
  let cdssql: string[] = (cds.compile.to.sql(csn) as unknown) as string[]
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

export {
  extractColumnNamesFromPostgres,
  getTableNamesFromPostgres,
  getCompiledSQL,
  getEntityNamesFromCds,
  extractTableColumnNamesFromSQL,
  extractViewColumnNames,
}
