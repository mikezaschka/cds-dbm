let fs = require('@sap/cds-foss')('fs-extra')
const BuildTaskHandlerFactory = require('@sap/cds/lib/build/buildTaskHandlerFactory')
const { BUILD_TASK_USE_PREFIX, BUILD_TASK_NPM_SCOPE } = require('@sap/cds/lib/build/constants')
const path = require('path')
const DEBUG = process.env.DEBUG

class DbmBuildTaskHandlerFactory extends BuildTaskHandlerFactory {
  constructor(args) {
    super(args)
  }

  /**
   * Loads the build task handler implementation for the given build task.
   * 'for' defines an alias for built-in handlers like 'hana', 'java-cf', 'node-cf', 'fiori' or 'mtx'.
   * 'use' defines the fully qualified module name of external build task handler implemenations.
   * @param {*} task
   */
  loadHandler(task) {
    const modulePath = DbmBuildTaskHandlerFactory._getModulePathFromTask(task)
    try {
      //return module.parent.require("./../../node_modules/@sap/cds/lib/build/node-cf")
      return require(modulePath)
    } catch (e) {
      console.error(e)
      throw new Error(`Build task could not be resolved - module [${modulePath}] cannot be loaded`)
    }
  }

  /**
   * Resolves the given build task based on the project root folder.<br>
   * The task is validated in order to ensure that 'src' refers to a valid folder and 'for' or 'use' reference can be required.
   * @param {*} task
   * @param {*} buildOptions
   */
  resolveTask(task, buildOptions) {
    // first validate handler implementation
    this.loadHandler(task)

    // second valdiate src path
    const resolvedTask = JSON.parse(JSON.stringify(task))
    if (!resolvedTask.use) {
      resolvedTask.use = DbmBuildTaskHandlerFactory._getUseValueFromTask(resolvedTask)
    }
    if (!resolvedTask.for) {
      resolvedTask.for = DbmBuildTaskHandlerFactory._getForValueFromTask(resolvedTask)
    }
    try {
      // resolving sym-links, but be careful as realpathSync is throwing exception if directory does not exist
      resolvedTask.src = fs.realpathSync(path.resolve(buildOptions.root, task.src))
    } catch (e) {
      throw new Error(
        `Build task [${resolvedTask.use}] could not be resolved - folder src [${path.resolve(
          buildOptions.root,
          task.src
        )}] does not exist`
      )
    }
    resolvedTask.dest = path.resolve(buildOptions.target, task.dest || task.src)
    return resolvedTask
  }

  /**
   * @override
   * @param task
   */
  static _getModulePathFromTask(task) {
    let modulePath = DbmBuildTaskHandlerFactory._getUseValueFromTask(task)
    if (!modulePath) {
      throw new Error(`Invalid build task definition - value of property 'for' or 'use' is missing.`)
    }

    switch (modulePath) {
      case 'postgres-cf':
        return './' + modulePath + '/'
      default:
        return '@sap/cds/lib/build/' + modulePath + '/'
    }

    return modulePath
  }

  static _getForValueFromTask(task) {
    if (task.for) {
      return task.for
    }
    return task.use && task.use.startsWith(BUILD_TASK_USE_PREFIX)
      ? task.use.substring(BUILD_TASK_USE_PREFIX.length)
      : null
  }
}
module.exports = DbmBuildTaskHandlerFactory
