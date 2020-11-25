import childProcess from 'child_process'
import path from 'path'
import { liquibaseOptions } from './config'

class Liquibase {
  params: liquibaseOptions

  /**
   * Returns an instance of a lightweight Liquibase Wrapper.
   */
  constructor(params = {}) {
    const defaultParams = {
      liquibase: path.join(__dirname, './../liquibase/liquibase'), // Liquibase executable
    }
    this.params = Object.assign({}, defaultParams, params)
  }

  /**
   * Executes a Liquibase command.
   *
   * @param {string} action a string for the Liquibase command to run. Defaults to `'update'`
   * @param {string} params any parameters for the command
   * @returns {Promise} Promise of a node child process.
   */
  public run(action = 'update', params = '') {
    return this._exec(`${this._command} ${action} ${params}`)
  }

  /**
   * Internal getter that returns a node child process compatible command string.
   *
   * @returns {string}
   * @private
   */
  get _command() {
    let cmd = `${this.params.liquibase}`

    Object.keys(this.params).forEach((key) => {
      if (key === 'liquibase') {
        return
      }
      const value = this.params[key as keyof liquibaseOptions]
      cmd = `${cmd} --${key}=${value}`
    })

    return cmd
  }

  /**
   *
   * Internal method for executing a child process.
   *
   * @param {string} command Liquibase command
   * @param {*} options any options
   * @private
   * @returns {Promise} Promise of a node child process.
   */

  private _exec(command: string, options = {}) {
    //console.warn(command)
    let child
    let promise = new Promise((resolve, reject) => {
      child = childProcess.exec(command, options, (error: any, stdout: any, stderr: any) => {
        if (error) {
          //console.log('\n', stdout)
          //console.error('\n', stderr)

          // Log things in case of an error
          error.stderr = stdout
          return reject(error)
        }

        resolve({
          stdout: stdout,
        })
      })
    })
    //promise.child = child
    return promise
  }
}

function LiquibaseGenerator(params: liquibaseOptions) {
  return new Liquibase(params)
}

export default LiquibaseGenerator
