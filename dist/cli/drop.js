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
exports.command = 'drop [services]'
exports.desc = 'WARNING: Drops all tables/views from the database'
exports.builder = {
  service: {
    alias: 's',
    type: yargs_1.array,
    default: ['db'],
  },
  all: {
    type: yargs_1.boolean,
    default: false,
  },
}
exports.handler = async (argv) => {
  for (const service of argv.service) {
    const options = await config_1.config(service)
    const adapter = await adapter_1.default(service, options)
    await adapter.drop({ dropAll: argv.all })
  }
}
//# sourceMappingURL=drop.js.map
