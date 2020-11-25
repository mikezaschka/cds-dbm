const path = require('path')
const fs = require('@sap/cds-foss')('fs-extra')
import * as cdsg from '@sap/cds'
const cds = cdsg as any
const { DbmBuildTaskFactory } = require('./../build/buildTaskFactory')
const BuildTaskEngine = require('./../build/buildTaskEngine')

exports.command = 'build'
exports.desc = 'Generates build artifacts'
exports.builder = {}
exports.handler = async (argv: any) => {
  const logger = global.console
  const projectPath = path.resolve(argv.project || '.')

  if (!fs.lstatSync(projectPath).isDirectory()) {
    return Promise.reject(`Project [${projectPath}] does not exist`)
  }

  if (cds.env.features.snapi === 'runtime-only') cds.env.features.snapi = false
  const buildOptions = _mergeOptions({ root: projectPath }, argv)
  let tasks = await new DbmBuildTaskFactory(logger, cds).getTasks(buildOptions)
  return new BuildTaskEngine(logger, cds).processTasks(tasks, buildOptions)
}

function _mergeOptions(buildOptions, options) {
  buildOptions['log-level'] = options['log-level']
  buildOptions.cli = options.cli
  buildOptions.cmdOptions = options
  return buildOptions
}
