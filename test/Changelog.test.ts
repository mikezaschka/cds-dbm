import * as cdsg from '@sap/cds'
import { ChangeLog } from '../src/ChangeLog'

const mockpath = './test/mock/'
const shuffle = (a) => {
  var j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}

const viewDefintions = {
  beershopservice_typechecks: {
    name: 'beershopservice_typechecks',
    definition: `SELECT typechecks_0.id,
      typechecks_0.type_boolean,
      typechecks_0.type_int32,
      typechecks_0.type_int64,
      typechecks_0.type_decimal,
      typechecks_0.type_double,
      typechecks_0.type_date,
      typechecks_0.type_time,
      typechecks_0.type_datetime,
      typechecks_0.type_timestamp,
      typechecks_0.type_string,
      typechecks_0.type_binary,
      typechecks_0.type_largebinary,
      typechecks_0.type_largestring
    FROM csw_typechecks typechecks_0;`,
  },
  beershopservice_breweries: {
    name: 'beershopservice_breweries',
    definition: `SELECT brewery_0.id,
    brewery_0.name
   FROM csw_brewery brewery_0;`,
  },
  beershopservice_beers: {
    name: 'beershopservice_beers',
    definition: `SELECT beers_0.id,
    beers_0.name,
    beers_0.abv,
    beers_0.ibu,
    beers_0.anothercolumn,
    beers_0.brewery_id
   FROM csw_beers beers_0;`,
  },
  csw_breweryanalytics: {
    name: 'csw_breweryanalytics',
    definition: `SELECT brewery_0.id,
    brewery_0.name AS breweryname,
    beers_1.name AS beername,
    1 AS lines
   FROM (csw_brewery brewery_0
     LEFT JOIN csw_beers beers_1 ON (((beers_1.brewery_id)::text = (brewery_0.id)::text)));`,
  },
  beershopservice_breweryanalytics: {
    name: 'beershopservice_breweryanalytics',
    definition: `SELECT breweryanalytics_0.id,
    breweryanalytics_0.breweryname,
    breweryanalytics_0.beername,
    breweryanalytics_0.lines
   FROM csw_breweryanalytics breweryanalytics_0;`,
  },
}

describe('Changelog', () => {
  describe('reordering', () => {
    let changelog = ChangeLog.fromFile(`${mockpath}/changelog.json`)
    // apply random factor
    changelog.data.databaseChangeLog = shuffle(changelog.data.databaseChangeLog)
    //changelog.toFile("before.json")
    changelog.reorderChangelog(viewDefintions)
    //changelog.toFile("after.json")

    it('should put the dropView statements first', async () => {
      const viewOnViewIndex = changelog.data.databaseChangeLog.findIndex(
        (change) => change.changeSet.changes[0].dropView.viewName === 'beershopservice_breweryanalytics'
      )
      const relatedViewIndex = changelog.data.databaseChangeLog.findIndex(
        (change) => change.changeSet.changes[0].dropView.viewName === 'csw_breweryanalytics'
      )
      expect(relatedViewIndex).toBeGreaterThan(viewOnViewIndex)

      const count = countStatements(changelog, 'dropView')
      for (let index = 0; index < count; index++) {
        const change = changelog.data.databaseChangeLog[0].changeSet.changes[0]
        const [key] = Object.keys(change)
        expect(key).toEqual('dropView')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(0, 1)
      }
    })
    it('should put the dropTable statements second', () => {
      const count = countStatements(changelog, 'dropTable')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('dropTable')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(index, 1)
      }
    })

    it('should put the dropColumn statements third', () => {
      const count = countStatements(changelog, 'dropColumn')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('dropColumn')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(index, 1)
      }
    })

    it('should put the addColumn statements fourth', () => {
      const count = countStatements(changelog, 'addColumn')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('addColumn')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(index, 1)
      }
    })

    it('should put the modifyDataType statements fifth', () => {
      const count = countStatements(changelog, 'modifyDataType')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('modifyDataType')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(index, 1)
      }
    })

    it('should put the createTable statements sixth', () => {
      const count = countStatements(changelog, 'createTable')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('createTable')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(index, 1)
      }
    })
    it('should put the createView statements seventh', () => {
      const count = countStatements(changelog, 'createView')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('createView')

        // Remove from the changelog
        changelog.data.databaseChangeLog.splice(index, 1)
      }
    })
  })
})

const countStatements = (changelog, statement): Number => {
  return changelog.data.databaseChangeLog.reduce((result, item) => {
    const [key] = Object.keys(item.changeSet.changes[0])
    if (key === statement) {
      result += 1
    }
    return result
  }, 0)
}
