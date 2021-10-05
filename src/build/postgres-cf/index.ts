import foss from '@sap/cds-foss'
const fs = foss('fs-extra')
import { chmodSync, existsSync } from 'fs'
import path from 'path'
const BuildTaskHandlerInternal = require('@sap/cds/bin/build/provider/buildTaskHandlerInternal')
const { getHanaDbModuleDescriptor } = require('@sap/cds/bin/build/mtaUtil')
const { FOLDER_GEN, FILE_EXT_CDS } = require('@sap/cds/bin/build/constants')

const DEBUG = process.env.DEBUG
const FILE_NAME_MANIFEST_YML = 'manifest.yml'
const DEFAULT_COMPILE_DEST_FOLDER = path.normalize('src/gen')
const FILE_EXT_CSV = '.csv'
const FILE_NAME_PACKAGE_JSON = 'package.json'
const DEPLOY_CMD = 'npx cds-dbm deploy --load-via delta'

class PostgresCfModuleBuilder extends BuildTaskHandlerInternal {
  /**
   *
   * @param task
   * @param buildOptions
   */
  constructor(task, buildOptions) {
    super('PostgreSQL CF Module Builder', task, buildOptions)
  }

  init() {
    this.task.options.deployCmd = this.task.options.deployCmd || DEPLOY_CMD

    this.task.options.compileDest = path.resolve(
      this.task.dest,
      this.task.options.compileDest || DEFAULT_COMPILE_DEST_FOLDER
    )
  }

  get priority() {
    return 1
  }

  /**
   * name
   */
  public async build() {
    const { src, dest } = this.task
    const destGen = this.isStagingBuild() ? dest : path.join(dest, FOLDER_GEN)
    const model = await this.model()
    const extCsn = this.cds.compile.to.json(model)
    await this.write(extCsn).to(path.join(destGen, 'csn.json'))

    await this._copyNativeContent(src, dest)
    await this._writePackageJson()
    await this._writeManifestYml()
    await this._writeDeployShellScript()
    await this._writeUndeployJson(src)
    await this._writeCfIgnore()

    const aptFile = path.join(__dirname, 'template', 'apt.yml')
    await this.copy(aptFile).to(path.join(this.task.dest, 'apt.yml'))
  }

  /**
   * Deletes any content that has been created in folder '#this.task.dest/src/gen' by some inplace mode.
   * <br>
   * Note: Content created in staging build will be deleted by the #BuildTaskEngine itself.
   */
  async clean() {
    if (this.isStagingBuild()) {
      return super.clean()
    }
    return fs.remove(this.task.options.compileDest)
  }

  /**
   * Copies the entire content of the db module located in the given <src> folder to the folder <dest>.
   * '*.csv' and '*.hdbtabledata' files located in a subfolder 'data' or 'csv' will be copied to '<dest>/src/gen/data>'||'<dest>/src/gen/csv>'
   *
   * @param {string} src
   * @param {string} dest
   */
  async _copyNativeContent(src, dest) {
    const dbCsvDir = path.join(src, 'csv')
    const dbDataDir = path.join(src, 'data')
    const csvDirs = [dbCsvDir, dbDataDir]

    ;(await super.copyNativeContent(src, dest, (entry) => {
      if (fs.statSync(entry).isDirectory()) {
        return true // using common filter for folders
      }
      const extname = path.extname(entry)
      return (
        (extname !== FILE_EXT_CSV && extname !== FILE_EXT_CDS && entry !== this.env.build.outputfile) ||
        (extname === FILE_EXT_CSV && !entry.startsWith(dbCsvDir) && !entry.startsWith(dbCsvDir))
      )
    })) || []
  }

  /**
   *
   */
  async _writePackageJson() {
    const packageJson = path.join(this.task.src, 'package.json')
    const exists = await fs.pathExists(packageJson)

    if (DEBUG && exists) {
      this.logger.log(`[cds] - skip create [${this.stripProjectPaths(packageJson)}], already existing`)
    }
    if (this.isStagingBuild() && !exists) {
      const targetPackageJson = await this._readTemplateAsJson(FILE_NAME_PACKAGE_JSON)

      // if specified, add a start command
      if (this.task.options.deployCmd) {
        targetPackageJson.scripts['start'] = this.task.options.deployCmd
      }

      const rootPackageJsonPath = `${this.buildOptions.root}/package.json`
      const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath))

      // Merge schema options
      if (rootPackageJson.cds?.migrations?.schema) {
        targetPackageJson.cds.migrations.schema = rootPackageJson.cds.migrations.schema
      }

      // Update dependency versions
      const dependencies = rootPackageJson.dependencies
      for (const dependency in dependencies) {
        if (
          targetPackageJson.dependencies[dependency] &&
          !(
            (typeof dependencies[dependency] === 'string' && dependencies[dependency].startsWith('.')) ||
            dependencies[dependency].startsWith('file:')
          )
        ) {
          targetPackageJson.dependencies[dependency] = rootPackageJson.dependencies[dependency]
        }
      }

      await this.write(targetPackageJson).to(path.join(this.task.dest, FILE_NAME_PACKAGE_JSON))
    }
  }

  /**
   *
   */
  async _writeDeployShellScript() {
    const deployFile = path.join(__dirname, 'template', 'deploy.sh')
    const targetDeployFile = path.join(this.task.dest, 'deploy.sh')
    await this.copy(deployFile).to(targetDeployFile)
    fs.appendFileSync(targetDeployFile, this.task.options.deployCmd)
    chmodSync(targetDeployFile, 0o755)
  }

  /**
   *
   * @param src
   */
  async _writeUndeployJson(src) {
    const migrationOptions = cds.env['migrations']['db']
    if (migrationOptions.deploy.undeployFile && existsSync(path.join(src, migrationOptions.deploy.undeployFile))) {
      this.logger.log(`[cds] - ${this.task.for}: copy existing undeploy.json`)
      await this.copy(path.join(src, migrationOptions.deploy.undeployFile)).to(
        path.join(this.task.dest, 'undeploy.json')
      )
    }
  }

  /**
   *
   */
  async _writeManifestYml() {
    if (!this.isStagingBuild()) {
      return
    }
    if (
      (await fs.pathExists(path.join(this.task.src, FILE_NAME_MANIFEST_YML))) ||
      (await fs.pathExists(path.join(this.task.src, 'manifest.yml')))
    ) {
      if (DEBUG) {
        this.logger.log(`[cds] - ${this.task.for}: skip cf manifest generation, already existing`)
      }
      return
    }

    try {
      const descriptor = await getHanaDbModuleDescriptor(
        this.buildOptions.root,
        path.basename(this.task.src),
        this.logger
      )

      const MANIFEST_YML_CONTENT = `---
applications:
- name: ${descriptor.appName}
path: .
no-route: true
health-check-type: process
memory: 512M
disk_quota: 2G
buildpacks:
  - https://github.com/cloudfoundry/apt-buildpack#v0.2.2
  - nodejs_buildpack`

      await this.write(MANIFEST_YML_CONTENT).to(path.join(this.task.dest, FILE_NAME_MANIFEST_YML))
    } catch (e) {
      if (e.name === 'YAMLSyntaxError') {
        this.logger.log(`[cds] - ${this.task.for}: failed to parse [mta.yaml] - skip manifest.yml generation`)
      }
      this.logger.error(e)
    }
  }

  private async _writeCfIgnore() {
    const content = `node_modules/\n`
    await this.write(content).to(path.join(path.dirname(this.task.dest), '.cfignore'))
  }

  async _readTemplateAsJson(template) {
    const templatePath = path.join(__dirname, 'template', template)
    return fs.readJSON(templatePath, 'utf-8').catch((error) => {
      this.logger.error(`Failed to read template [${templatePath}]`)
      return Promise.reject(error)
    })
  }
}

module.exports = PostgresCfModuleBuilder
