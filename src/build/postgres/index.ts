import { BuildTaskHandlerOData } from '@sap/cds/lib/build/buildTaskHandlerOData'

export class NodeCfModuleBuilder extends BuildTaskHandlerOData {
  /**
   *
   * @param task
   * @param buildOptions
   */
  constructor(task, buildOptions) {
    super('Postgres Module Builder', task, buildOptions)
  }
}
