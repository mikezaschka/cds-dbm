import * as cdsg from '@sap/cds'
import fs from 'fs'
import adapterFactory from '../src/adapter'
import { configOptions } from '../src/config'
import cds_deploy from '@sap/cds/lib/db/deploy'
import {
  getTableNamesFromPostgres,
  getCompiledSQL,
  extractTableColumnNamesFromSQL,
  getEntityNamesFromCds,
  extractViewColumnNames,
  extractColumnNamesFromPostgres,
} from './util/postgreshelper'
import { BaseAdapter } from '../src/adapter/BaseAdapter'

const cds = cdsg as any

describe('PostgresAdapter', () => {
  beforeEach(() => {
    if (cds.services['db']) {
      cds.services['db'].disconnect()
    }

    // avoid timeouts
    jest.setTimeout(30000)
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
        clone: '__cdsclone',
      },
      deploy: {
        tmpFile: './test/tmp/_deploy.json',
        undeployFile: '',
      },
    },
  }

  describe(' drop () ', () => {
    let adapter: BaseAdapter

    beforeEach(async () => {
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      cds.env.requires.postgres = options.service
      adapter = await adapterFactory('db', options)
    })
    it('+ dropAll: false + should remove all cds based tables and views from the database', async () => {
      // use build-in mechanism to deploy
      await cds_deploy(options.service.model[0], {}).to('db')

      // drop everything
      await adapter.drop({ dropAll: false })

      const existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
      const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

      for (const entity of tableAndViewNamesFromCds) {
        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain(entity.name.toLowerCase())
      }
    })

    it('+ dropAll: true + should remove everything from the database', async () => {
      // use build-in mechanism to deploy
      await cds_deploy(options.service.model[0], {}).to('db')

      let existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
      expect(existingTablesInPostgres.length).not.toEqual(0)

      // drop everything
      await adapter.drop({ dropAll: true })

      existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
      expect(existingTablesInPostgres.length).toEqual(0)
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
    })
    it('should create the complete data model in an empty database', async () => {
      await adapter.drop({ dropAll: true })
      await adapter.deploy({})

      const existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
      const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

      for (const entity of tableAndViewNamesFromCds) {
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
      }
    })

    describe('- handling deltas -', () => {
      beforeEach(async () => {
        options.migrations.deploy.undeployFile = ''
        options.service.model = ['./test/app/srv/beershop-service.cds']

        await adapter.drop({ dropAll: true })
        //await adapter.deploy({})
        // use build-in mechanism to deploy
        await cds_deploy(options.service.model[0], {}).to('db')

        cds.services['db'].disconnect()
      })
      it('should add additional tables and views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_addTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        const existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }
      })

      it('should not remove tables with autoUndeploy set to false', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_removeTables.cds']
        adapter = await adapterFactory('db', options)

        await adapter.deploy({ autoUndeploy: false })

        const existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain('csw_beers')
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain('csw_brewery')
      })

      it('should remove tables listed in a given undeploy.json file', async () => {
        options.service.model = ['./test/app/srv/beershop-service_removeTables.cds']
        options.migrations.deploy.undeployFile = './test/app/db/undeploy.json'
        adapter = await adapterFactory('db', options)

        console.log(await getTableNamesFromPostgres(options.service.credentials))

        await adapter.deploy({})

        const existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)

        // named in undeployFile
        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain('csw_beers')

        // not named in undeployFile
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain('csw_brewery')
      })
      it('should remove tables with autoUndeploy set to true', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_removeTables.cds']
        adapter = await adapterFactory('db', options)

        await adapter.deploy({ autoUndeploy: true })

        const existingTablesInPostgres = await getTableNamesFromPostgres(options.service.credentials)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }

        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain('csw_beers')
        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain('csw_brewery')
      })

      it('should add cascading views', async () => {})
      it('should add columns to tables and views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_addColumns.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        const model = await getCompiledSQL('db', options.service.model[0])

        for (let each of model) {
          const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
          if (table) {
            let cdsColumns = extractTableColumnNamesFromSQL(each)
            let tableColumns = await extractColumnNamesFromPostgres(options.service.credentials, entity)

            expect(cdsColumns.map((c) => c.toLowerCase()).sort).toEqual(tableColumns.map((c) => c.column_name).sort)
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
      await adapter.drop({ dropAll: true })
    })
    it('should create a diff file at the defined path', async () => {
      // load an updated model
      options.service.model = ['./test/app/srv/beershop-service_addColumns.cds']
      adapter = await adapterFactory('db', options)
      await adapter.deploy({})

      const filePath = 'test/tmp/diff.txt'
      await adapter.diff(filePath)

      expect(fs.existsSync(filePath)).toBeTruthy()

      fs.unlinkSync(filePath)
    })
  })
})
