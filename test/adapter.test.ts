import adapterFactory from '../src/adapter'
import { configOptions } from '../src/config'

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

      // @ts-ignore
      cds.services['db'].disconnect()
    }
  })

  it('should create an adapter instance for PostgreSQL', async () => {
    // Setup PostgreSQL
    // @ts-ignore
    cds.env.requires.db = { kind: 'postgres' }
    // @ts-ignore
    cds.env.requires.postgres = {
      impl: 'cds-pg',
    }

    const adapter = await adapterFactory('db', options)
    expect(adapter.constructor.name).toEqual('PostgresAdapter')
  })

  it.todo('should throw an error for any other database')
})
