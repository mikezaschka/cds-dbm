'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.NodeCfModuleBuilder = void 0
const buildTaskHandlerOData_1 = require('@sap/cds/lib/build/buildTaskHandlerOData')
class NodeCfModuleBuilder extends buildTaskHandlerOData_1.BuildTaskHandlerOData {
  /**
   *
   * @param task
   * @param buildOptions
   */
  constructor(task, buildOptions) {
    super('Postgres Module Builder', task, buildOptions)
  }
}
exports.NodeCfModuleBuilder = NodeCfModuleBuilder
//# sourceMappingURL=index.js.map
