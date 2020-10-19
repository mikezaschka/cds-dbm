import * as cdsg from '@sap/cds'
import path from 'path'
import adapterFactory from '../src/adapter'
import { configOptions } from '../src/config'
import cds_deploy from '@sap/cds/lib/db/deploy'
import { getTableNames, getCompiledSQL, extractTableColumnNamesFromSQL, extractViewColumnNames } from './util/postgreshelper'
import { BaseAdapter } from '../src/adapter/BaseAdapter'

const cds = cdsg as any

describe('PostgresAdapter', () => {
  beforeEach(() => {
    if (cds.services['db']) {
      cds.services['db'].disconnect()
    }
  })

  const options: configOptions = {
    service: {
      name: 'db',
      impl: 'cds-pg',
      model: ['./test/app/srv/beershop-service.cds'],
      credentials: {
        host: 'localhost',
        port: 5432,
        database: 'beershop',
        user: 'postgres',
        password: 'postgres',
      },
    },
    migrations: {
      schema: {
        default: 'public',
        reference: '__cdsdeploy',
      },
      migrations: {
        path: 'db/migrations',
      },
      format: 'yml',
      tempChangelogFile: path.join(__dirname, 'tmp/_deploy'),
    },
  }

  describe(' drop () ', () => {
    beforeEach(() => {
      // Setup PostgreSQL
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      cds.env.requires.postgres = options.service
    })
    it('should remove all known tables and views from the database', async () => {
      const adapter = await adapterFactory('db', options)

      // use default mechanism to deploy
      await cds_deploy(options.service.model[0], {}).to('db')

      // drop everything
      await adapter.drop()

      const existingTablesInPostgres = await getTableNames(options.service.credentials)
      const model = await getCompiledSQL('db', options.service.model[0])

      for (let each of model) {
        const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain(entity.toLowerCase())
      }
    })
  })
  describe(' deploy() ', () => {
    let adapter: BaseAdapter

    beforeEach(async () => {
      // setup PostgreSQL
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      cds.env.requires.postgres = options.service

      // clean the stage
      adapter = await adapterFactory('db', options)
      await adapter.drop()
    })
    it('should create the complete data model in an empty database', async () => {
      await adapter.deploy()

      const existingTablesInPostgres = await getTableNames(options.service.credentials)
      const model = await getCompiledSQL('db', options.service.model[0])

      for (let each of model) {
        const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
        //console.log(each.split('\n'));
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.toLowerCase())
      }
    })
    describe('- handling deltas -', () => {
      beforeEach(async () => {
        await adapter.deploy()
        cds.services['db'].disconnect()
      })
      it('should add additional tables and views', async () => {
        // load a an updated model
        options.service.model = ['./test/app/srv/beershop-service_addTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy()

        // verify if everythig is ok
        const existingTablesInPostgres = await getTableNames(options.service.credentials)
        const model = await getCompiledSQL('db', options.service.model[0])

        for (let each of model) {
          const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.toLowerCase())
        }
      })
      it('should remove tables and views', async () => {
        // load a an updated model
        options.service.model = ['./test/app/srv/beershop-service_removeTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy()

        // verify if everythig is ok
        const existingTablesInPostgres = await getTableNames(options.service.credentials)
        const model = await getCompiledSQL('db', options.service.model[0])

        for (let each of model) {
          const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.toLowerCase())
        }
      })

      it.todo('should add cascading views')
      it.skip('should add columns to tables and views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_addColumnsTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy()

        const model = await getCompiledSQL('db', options.service.model[0])

        for (let each of model) {
          const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
          if (table) {
            let cdsColumns = extractTableColumnNamesFromSQL(each)
            //let tableColumns = extractTableColumnNames(table)
          }
        }
      })
      it.todo('should remove columns from tables and views')
    })
  })

  describe(' diff() ', () => {
    let adapter: BaseAdapter

    beforeEach(async () => {
      // setup PostgreSQL
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      cds.env.requires.postgres = options.service

      // clean the stage
      adapter = await adapterFactory('db', options)
      await adapter.drop()
    })
    it.skip('should create the complete data model in an empty database', async () => {
      await adapter.diff()
    })
  })
})
