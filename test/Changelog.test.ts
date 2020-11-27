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

describe('Changelog', () => {
  describe('reordering', () => {
    let changelog = ChangeLog.fromFile(`${mockpath}/changelog.json`)
    // apply random factor
    changelog.data.databaseChangeLog = shuffle(changelog.data.databaseChangeLog)
    changelog.reorderChangelog()

    it('should put the dropView statements first', () => {
      const count = countStatements(changelog, 'dropView')
      for (let index = 0; index < count; index++) {
        const [change] = Object.keys(changelog.data.databaseChangeLog[0].changeSet.changes[0])
        expect(change).toEqual('dropView')

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
