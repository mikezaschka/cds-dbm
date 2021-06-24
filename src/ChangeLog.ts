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
   * - drop view statements
   * - drop table statements
   * - create table statements
   * - alter table statements (add_column, drop_column, ...)
   * - create view statements that are not based on other views
   * - create view statements that are based on other views
   *
   * @param {string} changelog
   */
  public reorderChangelog(viewDefinitions = {}) {
    this.data.databaseChangeLog.sort((a: any, b: any) => {
      // Drop view
      if (a.changeSet.changes[0].dropView && !b.changeSet.changes[0].dropView) {
        return -1
      }
      if (b.changeSet.changes[0].dropView && !a.changeSet.changes[0].dropView) {
        return 1
      }

      // Make sure cascading views work
      if (a.changeSet.changes[0].dropView && b.changeSet.changes[0].dropView) {
        const aViewName = a.changeSet.changes[0].dropView.viewName
        const bViewName = b.changeSet.changes[0].dropView.viewName

        const aRegex = RegExp(`FROM \\(?${aViewName}|JOIN \\(?${aViewName}`, 'gm')
        const bRegex = RegExp(`FROM \\(?${bViewName}|JOIN \\(?${bViewName}`, 'gm')

        // Does b directly depend on a
        if (bRegex.test(viewDefinitions[aViewName].definition)) {
          return -1
        }

        // Does a directly depend on b
        if (aRegex.test(viewDefinitions[bViewName].definition)) {
          return 1
        }

        // Does a depend on any other view
        for (const key in viewDefinitions) {
          if (aRegex.test(viewDefinitions[key].definition)) {
            return 1
          }
        }

        // Does b depend on any other view
        for (const key in viewDefinitions) {
          if (bRegex.test(viewDefinitions[key].definition)) {
            return -1
          }
        }

        // Nothing? Then order by name
        return aViewName > bViewName ? -1 : 1
      }

      // Drop table
      if (a.changeSet.changes[0].dropTable) {
        return !b.changeSet.changes[0].dropView ? -1 : 1
      }

      if (b.changeSet.changes[0].dropTable) {
        return !a.changeSet.changes[0].dropView ? 1 : -1
      }

      // Create table
      if (a.changeSet.changes[0].createTable) {
        return !b.changeSet.changes[0].dropTable && !b.changeSet.changes[0].dropView ? -1 : 1
      }

      if (b.changeSet.changes[0].createTable) {
        return !a.changeSet.changes[0].dropTable && !a.changeSet.changes[0].dropView ? 1 : -1
      }

      // Drop Column
      if (a.changeSet.changes[0].dropColumn) {
        return !b.changeSet.changes[0].createTable &&
          !b.changeSet.changes[0].dropTable &&
          !b.changeSet.changes[0].dropView
          ? -1
          : 1
      }

      if (b.changeSet.changes[0].dropColumn) {
        return !a.changeSet.changes[0].createTable &&
          !a.changeSet.changes[0].dropTable &&
          !a.changeSet.changes[0].dropView
          ? 1
          : -1
      }

      // Add Column
      if (a.changeSet.changes[0].addColumn) {
        return !b.changeSet.changes[0].dropColumn &&
          !b.changeSet.changes[0].createTable &&
          !b.changeSet.changes[0].dropTable &&
          !b.changeSet.changes[0].dropView
          ? -1
          : 1
      }

      if (b.changeSet.changes[0].addColumn) {
        return !a.changeSet.changes[0].dropColumn &&
          !a.changeSet.changes[0].createTable &&
          !a.changeSet.changes[0].dropTable &&
          !a.changeSet.changes[0].dropView
          ? 1
          : -1
      }

      // Modify data type
      if (a.changeSet.changes[0].modifyDataType) {
        return !b.changeSet.changes[0].addColumn &&
          !b.changeSet.changes[0].dropColumn &&
          !b.changeSet.changes[0].createTable &&
          !b.changeSet.changes[0].dropTable &&
          !b.changeSet.changes[0].dropView
          ? -1
          : 1
      }

      if (b.changeSet.changes[0].modifyDataType) {
        return !a.changeSet.changes[0].addColumn &&
          !a.changeSet.changes[0].dropColumn &&
          !a.changeSet.changes[0].createTable &&
          !a.changeSet.changes[0].dropTable &&
          !a.changeSet.changes[0].dropView
          ? 1
          : -1
      }

      // Create View
      if (a.changeSet.changes[0].createView && !b.changeSet.changes[0].createView) {
        return !b.changeSet.changes[0].modifyDataType &&
          !b.changeSet.changes[0].addColumn &&
          !b.changeSet.changes[0].dropColumn &&
          !b.changeSet.changes[0].createTable &&
          !b.changeSet.changes[0].dropTable &&
          !b.changeSet.changes[0].dropView
          ? -1
          : 1
      }

      if (b.changeSet.changes[0].createView && !b.changeSet.changes[0].createView) {
        return !a.changeSet.changes[0].modifyDataType &&
          !a.changeSet.changes[0].addColumn &&
          !a.changeSet.changes[0].dropColumn &&
          !a.changeSet.changes[0].createTable &&
          !a.changeSet.changes[0].dropTable &&
          !a.changeSet.changes[0].dropView
          ? 1
          : -1
      }

      // Make sure cascading views work
      if (a.changeSet.changes[0].createView && b.changeSet.changes[0].createView) {
        const aViewName = a.changeSet.changes[0].createView.viewName
        const bViewName = b.changeSet.changes[0].createView.viewName

        const aRegex = RegExp(`FROM \\(?${aViewName}|JOIN \\(?${aViewName}`, 'gm')
        const bRegex = RegExp(`FROM \\(?${bViewName}|JOIN \\(?${bViewName}`, 'gm')

        if (bRegex.test(a.changeSet.changes[0].createView.selectQuery)) {
          return 1
        }
        if (aRegex.test(b.changeSet.changes[0].createView.selectQuery)) {
          return -1
        }

        return 0
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
