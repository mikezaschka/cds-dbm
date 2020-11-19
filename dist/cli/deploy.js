'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const yargs_1 = require('yargs')
const config_1 = require('../config')
const adapter_1 = __importDefault(require('../adapter'))
exports.command = 'deploy [services]'
exports.desc = 'Dynamically identifies changes in your cds data model and deploys them to the database'
exports.builder = {
  service: {
    alias: 's',
    type: yargs_1.array,
    default: ['db'],
  },
  'auto-undeploy': {
    alias: 'a',
    type: yargs_1.boolean,
  },
  dry: {
    alias: 'd',
    type: yargs_1.boolean,
  },
  'load-via': {
    alias: 'l',
    type: String,
  },
}
exports.handler = async (argv) => {
  for (const service of argv.service) {
    const options = await config_1.config(service)
    const adapter = await adapter_1.default(service, options)
    await adapter.deploy({ autoUndeploy: argv.autoUndeploy, dryRun: argv.dry, loadMode: argv.loadVia })
  }
}
//# sourceMappingURL=deploy.js.map
