import fs from 'fs'
import { v4 as uuid } from 'uuid'
import adapterFactory from '../src/adapter'
import { configOptions } from '../src/config'
import cds_deploy from '@sap/cds/lib/deploy'
import {
  getTableNamesFromPostgres,
  getCompiledSQL,
  extractTableColumnNamesFromSQL,
  getEntityNamesFromCds,
  getViewNamesFromPostgres,
  dropDatabase,
  extractColumnNamesFromPostgres,
} from './util/postgreshelper'
import { BaseAdapter } from '../src/adapter/BaseAdapter'

describe('PostgresAdapter', () => {
  beforeEach(() => {
    if (cds.services['db']) {
      
      // @ts-ignore
      cds.services['db'].disconnect()
    }

  })

  const options: configOptions = {
    service: {
      name: 'db',
      dialect: 'plain',
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
      // @ts-ignore
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      // @ts-ignore
      cds.env.requires.postgres = options.service
      console.log(cds.env.requires);
      adapter = await adapterFactory('db', options)
    })
    it('+ dropAll: false + should remove all cds based tables and views from the database', async () => {
      // use build-in mechanism to deploy
      await cds_deploy(options.service.model[0], {}).to('db')

      // drop everything
      await adapter.drop({ dropAll: false })

      const existingTablesInPostgres = await getTableNamesFromPostgres(options)
      const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

      for (const entity of tableAndViewNamesFromCds) {
        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain(entity.name.toLowerCase())
      }
    })

    it('+ dropAll: true + should remove everything from the database', async () => {
      // use build-in mechanism to deploy
      await cds_deploy(options.service.model[0], {}).to('db')

      let existingTablesInPostgres = await getTableNamesFromPostgres(options)
      expect(existingTablesInPostgres.length).not.toEqual(0)

      // drop everything
      await adapter.drop({ dropAll: true })

      existingTablesInPostgres = await getTableNamesFromPostgres(options)
      expect(existingTablesInPostgres.length).toEqual(0)
    })
  })
  describe(' deploy() ', () => {
    let adapter: BaseAdapter

    beforeEach(async () => {
      // setup PostgreSQL
      // @ts-ignore
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      // @ts-ignore
      cds.env.requires.postgres = options.service

      // clean the stage
      adapter = await adapterFactory('db', options)
    })

    it('should create the database if the create-db option is given', async () => {
      await dropDatabase(options.service.credentials)
      await adapter.deploy({ createDb: true })
      const existingTablesInPostgres = await getTableNamesFromPostgres(options)
      expect(existingTablesInPostgres.length).toBeGreaterThan(0)
    })

    it('should create the database if the create-db option is given and Clone Tenant', async () => {
      options.migrations.multitenant = true;
      options.migrations.schema.tenants = ['tenant'];
      await dropDatabase(options.service.credentials)
      await adapter.deploy({ createDb: true })

      // check default schema
      const existingTablesInPostgres = await getTableNamesFromPostgres(options)
      expect(existingTablesInPostgres.length).toBeGreaterThan(0)

      // check tenant
      const existingTablesInPostgresTenant0 = await getTableNamesFromPostgres(options, options.migrations.schema.tenants[0])
      expect(existingTablesInPostgresTenant0.length).toBeGreaterThan(0)

      options.migrations.multitenant = false;
    })

    it('should create the complete data model in an empty database', async () => {
      await adapter.drop({ dropAll: true })
      await adapter.deploy({})

      const existingTablesInPostgres = await getTableNamesFromPostgres(options)
      const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

      for (const entity of tableAndViewNamesFromCds) {
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
      }
    })

    it('should load data when the loadMode is set to full ', async () => {
      await adapter.drop({ dropAll: true })
      await adapter.deploy({ loadMode: 'full' })

      const countResponse = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
      expect(parseInt(countResponse[0].myCount)).toEqual(2)
    })

    describe('- handling multitenant deltas -', () => {
      beforeEach(async () => {
        options.migrations.deploy.undeployFile = ''
        options.service.model = ['./test/app/srv/beershop-service.cds']
        await adapter.drop({ dropAll: true })
        await adapter.deploy({})
      })

      it('should add additional tables and views and sync tenants', async () => {
        // load an updated model
        options.migrations.multitenant = true;
        options.migrations.schema.tenants = ['tenant'];

        options.service.model = ['./test/app/srv/beershop-service_addTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        // Existing Tables in Tenant0
        const existingTablesInPostgres = await getTableNamesFromPostgres(options, options.migrations.schema.tenants[0])
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }
        options.migrations.multitenant = false;
        options.migrations.schema.tenants = [];
      })

    });

    describe('- handling deltas -', () => {
      beforeEach(async () => {
        options.migrations.deploy.undeployFile = ''
        options.service.model = ['./test/app/srv/beershop-service.cds']

        await adapter.drop({ dropAll: true })
        // await adapter.deploy({})
        // use build-in mechanism to deploy
        await cds_deploy(options.service.model[0], {}).to('db')

        // @ts-ignore
        cds.services['db'].disconnect()
      })
      it('should add additional tables and views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_addTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        const existingTablesInPostgres = await getTableNamesFromPostgres(options)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }
      })
      
      it('should Sync Multitenant schemas ', async () => {;
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_addTables.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        const existingTablesInPostgres = await getTableNamesFromPostgres(options)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }
      })

      it('should add cascading views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_viewsOnViews.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        const existingViewsInPostgres = await getViewNamesFromPostgres(options)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          if (entity.isTable) {
            continue
          }
          expect(existingViewsInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }
      })

      it('should redeploy cascading views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_viewsOnViews.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})
        await adapter.deploy({})

        const existingViewsInPostgres = await getViewNamesFromPostgres(options)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          if (entity.isTable) {
            continue
          }
          expect(existingViewsInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }
      })

      it('should not remove tables with autoUndeploy set to false', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_removeTables.cds']
        adapter = await adapterFactory('db', options)

        await adapter.deploy({ autoUndeploy: false })

        const existingTablesInPostgres = await getTableNamesFromPostgres(options)
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain('csw_beers')
        expect(existingTablesInPostgres.map((i) => i.table_name)).toContain('csw_brewery')
      })

      it('should remove tables listed in a given undeploy.json file', async () => {
        options.service.model = ['./test/app/srv/beershop-service_removeTables.cds']
        options.migrations.deploy.undeployFile = './test/app/db/undeploy.json'
        adapter = await adapterFactory('db', options)

        await adapter.deploy({})

        const existingTablesInPostgres = await getTableNamesFromPostgres(options)

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

        const existingTablesInPostgres = await getTableNamesFromPostgres(options)
        const tableAndViewNamesFromCds = await getEntityNamesFromCds('db', options.service.model[0])

        for (const entity of tableAndViewNamesFromCds) {
          expect(existingTablesInPostgres.map((i) => i.table_name)).toContain(entity.name.toLowerCase())
        }

        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain('csw_beers')
        expect(existingTablesInPostgres.map((i) => i.table_name)).not.toContain('csw_brewery')
      })
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
            let tableColumns = await extractColumnNamesFromPostgres(options, entity)

            expect(cdsColumns.map((c) => c.toLowerCase()).sort).toEqual(tableColumns.map((c) => c.column_name).sort)
          }
        }
      })
      it('should remove columns from tables and views', async () => {
        // load an updated model
        options.service.model = ['./test/app/srv/beershop-service_removeColumns.cds']
        adapter = await adapterFactory('db', options)
        await adapter.deploy({})

        const model = await getCompiledSQL('db', options.service.model[0])

        for (let each of model) {
          const [, table, entity] = each.match(/^\s*CREATE (?:(TABLE)|VIEW)\s+"?([^\s(]+)"?/im) || []
          if (table) {
            let cdsColumns = extractTableColumnNamesFromSQL(each)
            let tableColumns = await extractColumnNamesFromPostgres(options, entity)

            expect(cdsColumns.map((c) => c.toLowerCase()).sort).toEqual(tableColumns.map((c) => c.column_name).sort)
          }
        }
      })

      it('should load data when the loadMode is set to delta ', async () => {
        adapter = await adapterFactory('db', options)

        // insert an entity
        await INSERT.into('csw.Beers').entries([{ ID: uuid(), name: 'Test' }])

        // should load two rows from the db
        await adapter.deploy({ loadMode: 'delta' })

        const countResponse = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(countResponse[0].myCount)).toEqual(3)
      })
    })
  })

  describe(' diff() ', () => {
    let adapter: BaseAdapter

    beforeEach(async () => {
      // setup PostgreSQL
      // @ts-ignore
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      // @ts-ignore
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

  describe(' load() ', () => {
    let adapter: BaseAdapter

    beforeEach(async () => {
      // setup PostgreSQL
      // @ts-ignore
      cds.env.requires.db = Object.assign({ kind: 'postgres' }, options.service)
      // @ts-ignore
      cds.env.requires.postgres = options.service

      // clean the stage
      adapter = await adapterFactory('db', options)
      await adapter.drop({ dropAll: true })
      await adapter.deploy({})
    })
    describe('in full mode', () => {
      it('should load the csv data when the table is empty', async () => {
        let response = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(response[0].myCount)).toEqual(0)
        await adapter.load(true)
        response = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(response[0].myCount)).toEqual(2)
      })
      it('should delete data from the table and contain only the loaded data', async () => {
        // insert an entity
        const insertedUuid = uuid()
        await INSERT.into('csw.Beers').entries([{ ID: insertedUuid, name: 'Test' }])

        // load the csv file
        await adapter.load(true)

        // only two rows
        const countResponse = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(countResponse[0].myCount)).toEqual(2)

        // inserted value is no more present
        const insertedEntry = await SELECT.from('csw.Beers').where({ ID: insertedUuid })
        expect(parseInt(insertedEntry.length)).toEqual(0)
      })
    })
    describe('in delta mode', () => {
      it('should load the csv data when the table is empty', async () => {
        let response = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(response[0].myCount)).toEqual(0)
        await adapter.load(false)
        response = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(response[0].myCount)).toEqual(2)
      })
      it('should keep existing data not in a csv file', async () => {
        // insert an entity
        const insertedUuid = uuid()
        await INSERT.into('csw.Beers').entries([{ ID: insertedUuid, name: 'Test' }])

        // load the csv file
        await adapter.load(false)

        // only two rows
        const countResponse = await SELECT.from('csw.Beers').columns('COUNT(*) as myCount')
        expect(parseInt(countResponse[0].myCount)).toEqual(3)

        // inserted value is no more present
        const insertedEntry = await SELECT.from('csw.Beers').where({ ID: insertedUuid })
        expect(parseInt(insertedEntry.length)).toEqual(1)
      })
    })
  })
})
