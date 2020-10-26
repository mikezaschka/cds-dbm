import * as cdsg from '@sap/cds'
import adapterFactory from '../src/adapter'
import { configOptions } from '../src/config'

const cds = cdsg as any

describe('Adapter factory', () => {
  const options: configOptions = {
    service: {
      name: 'db',
      model: ['srv'],
      credentials: {},
    },
    migrations: {
      deploy: {
        tmpFile: '',
        undeployFile: '',
      },
      migrations: {
        path: 'db',
      },
    },
  }

  beforeEach(() => {
    if (cds.services['db']) {
      cds.services['db'].disconnect()
    }
  })

  it.skip('should create an adapter instance for SQLite', async () => {
    // Setup SQLite
    cds.env.requires.db = { kind: 'sql' }

    const adapter = await adapterFactory('db', options)
    expect(adapter.constructor.name).toEqual('SqliteAdapter')
  })

  it('should create an adapter instance for PostgreSQL', async () => {
    // Setup PostgreSQL
    cds.env.requires.db = { kind: 'postgres' }
    cds.env.requires.postgres = {
      impl: 'cds-pg',
    }

    const adapter = await adapterFactory('db', options)
    expect(adapter.constructor.name).toEqual('PostgresAdapter')
  })

  it.todo('should throw an error for any other database')
})
