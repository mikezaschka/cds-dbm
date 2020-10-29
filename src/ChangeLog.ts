import fs from 'fs'
import yaml from 'js-yaml'

export class ChangeLog {
  data: any

  constructor(data: any) {
    this.data = data
  }

  public static fromFile(changelogPath): ChangeLog {
    let fileContents = fs.readFileSync(changelogPath, 'utf8')
    let data: any = JSON.parse(fileContents)

    return new ChangeLog(data)
  }

  public toFile(changelogPath) {
    fs.writeFileSync(changelogPath, JSON.stringify(this.data), 'utf8')
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
  public reorderChangelog() {
    this.data.databaseChangeLog.sort((a: any, b: any) => {
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
  public removeDropTableStatements() {
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
  public addDropStatementsForUndeployEntities(undeployFilePath) {
    if (!fs.existsSync(undeployFilePath)) {
      return
    }

    const fileContent: any = fs.readFileSync(undeployFilePath)
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
