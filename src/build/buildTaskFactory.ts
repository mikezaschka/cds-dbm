const BuildTaskFactory = require('@sap/cds/lib/build/buildTaskFactory')
const DbmBuildTaskHandlerFactory = require('./buildTaskHandlerFactory')

export class DbmBuildTaskFactory extends BuildTaskFactory {
  constructor(logger, cds) {
    super(logger, cds)
    this._handlerFactory = new DbmBuildTaskHandlerFactory(this._logger, this._cds)
  }
}
