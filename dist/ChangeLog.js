'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.ChangeLog = void 0
const fs_1 = __importDefault(require('fs'))
class ChangeLog {
  constructor(data) {
    this.data = data
  }
  static fromFile(changelogPath) {
    let fileContents = fs_1.default.readFileSync(changelogPath, 'utf8')
    let data = JSON.parse(fileContents)
    return new ChangeLog(data)
  }
  toFile(changelogPath) {
    fs_1.default.writeFileSync(changelogPath, JSON.stringify(this.data), 'utf8')
  }
  /**
   * The created changelog file needs to be sorted in order to work well.
   * The sort order should be:
   *
   * - alter table statements (add_column, drop_column, ...)
   * - create table statements
   * - create view statements that are not based on other views
   * - create view statements that are based on other views
   *
   * @param {string} changelog
   */
  reorderChangelog() {
    this.data.databaseChangeLog.sort((a, b) => {
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
  }
  /**
   *
   * @param changelog
   */
  removeDropTableStatements() {
    for (const changeLog of this.data.databaseChangeLog) {
      changeLog.changeSet.changes = changeLog.changeSet.changes.filter((change) => {
        return !change.dropTable
      })
    }
    for (const changeLog in this.data.databaseChangeLog) {
      if (this.data.databaseChangeLog[changeLog].changeSet.changes.length < 1) {
        delete this.data.databaseChangeLog[changeLog]
      }
    }
    // Remove empty items
    this.data.databaseChangeLog = this.data.databaseChangeLog.filter((n) => n)
  }
  /**
   * Create drop changesets for all tables and views that are specified
   * in the given undeploy file.
   *
   * @param {string} undeployFilePath
   */
  addDropStatementsForUndeployEntities(undeployFilePath) {
    if (!fs_1.default.existsSync(undeployFilePath)) {
      return
    }
    const fileContent = fs_1.default.readFileSync(undeployFilePath)
    const undeployList = JSON.parse(fileContent)
    const timestamp = new Date().getTime()
    let counter = 1
    for (const view of undeployList.views) {
      this.data.databaseChangeLog.push({
        changeSet: {
          id: `${timestamp}-${counter++}`,
          author: 'cds-dbm auto-undeploy (generated)',
          preConditions: [
            {
              onFail: 'MARK_RAN',
              viewExists: {
                viewName: view,
              },
            },
          ],
          changes: [
            {
              dropView: {
                viewName: view,
              },
            },
          ],
        },
      })
    }
    for (const table of undeployList.tables) {
      this.data.databaseChangeLog.push({
        changeSet: {
          id: `${timestamp}-${counter++}`,
          author: 'cds-dbm auto-undeploy (generated)',
          preConditions: [
            {
              onFail: 'MARK_RAN',
              tableExists: {
                tableName: table,
              },
            },
          ],
          changes: [
            {
              dropTable: {
                tableName: table,
              },
            },
          ],
        },
      })
    }
  }
}
exports.ChangeLog = ChangeLog
//# sourceMappingURL=ChangeLog.js.map
