const BuildTaskFactory = require('@sap/cds/bin/build/buildTaskFactory')
const DbmBuildTaskHandlerFactory = require('./buildTaskHandlerFactory')

export class DbmBuildTaskFactory extends BuildTaskFactory {
  constructor(logger, cds) {
    super(logger, cds)
    this._handlerFactory = new DbmBuildTaskHandlerFactory(this._logger, this._cds)
  }
}
