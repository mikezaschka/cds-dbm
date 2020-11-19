'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.config = void 0
const config = async (service) => {
  const cds = require('@sap/cds')
  await cds.connect()
  const serviceOptions = cds.env.requires[service]
  const migrationOptions = cds.env.migrations[service]
  return {
    migrations: migrationOptions,
    service: serviceOptions,
  }
}
exports.config = config
//# sourceMappingURL=config.js.map
