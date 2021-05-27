const BuildTaskEngine = require('@sap/cds/bin/build/buildTaskEngine')
const dbmBuildTaskHandlerFactory = require('./buildTaskHandlerFactory')

class CdmBuildTaskEngine extends BuildTaskEngine {
  constructor(logger, cds) {
    super(logger, cds)
    this._handlerFactory = new dbmBuildTaskHandlerFactory(this._logger, this._cds)
  }
}
module.exports = CdmBuildTaskEngine
