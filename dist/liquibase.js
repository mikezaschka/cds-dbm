'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const child_process_1 = __importDefault(require('child_process'))
const path_1 = __importDefault(require('path'))
class Liquibase {
  /**
   * Returns an instance of a lightweight Liquibase Wrapper.
   */
  constructor(params = {}) {
    const defaultParams = {
      liquibase: path_1.default.join(__dirname, './../liquibase/liquibase'),
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
  run(action = 'update', params = '') {
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
      const value = this.params[key]
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
  _exec(command, options = {}) {
    //console.warn(command)
    let child
    let promise = new Promise((resolve, reject) => {
      child = child_process_1.default.exec(command, options, (error, stdout, stderr) => {
        //console.log('\n', stdout)
        //console.error('\n', stderr)
        if (error) {
          error.stderr = stderr
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
function LiquibaseGenerator(params) {
  return new Liquibase(params)
}
exports.default = LiquibaseGenerator
//# sourceMappingURL=liquibase.js.map
