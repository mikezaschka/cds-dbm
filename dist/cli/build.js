'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const config_1 = require('../config')
const adapter_1 = __importDefault(require('../adapter'))
exports.command = 'build '
exports.desc = 'Generates build artifacts'
exports.builder = {
  target: {
    alias: 't',
    type: String,
  },
}
exports.handler = async (argv) => {
  for (const service of argv.service) {
    const options = await config_1.config(service)
    const adapter = await adapter_1.default(service, options)
    await adapter.build({ autoUndeploy: argv.autoUndeploy, dryRun: argv.dry, loadMode: argv.loadVia })
  }
}
//# sourceMappingURL=build.js.map
