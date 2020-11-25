import foss from '@sap/cds-foss'
const fs = foss('fs-extra')
import { chmodSync, existsSync } from 'fs'
import path from 'path'
const BuildTaskHandlerOData = require('@sap/cds/lib/build/buildTaskHandlerOData')
const { BuildMessage, BuildError } = require('@sap/cds/lib/build/util')
const { getHanaDbModuleDescriptor } = require('@sap/cds/lib/build/mtaUtil')
const { FOLDER_GEN, FILE_EXT_CDS } = require('@sap/cds/lib/build/constants')

const DEBUG = process.env.DEBUG
const FILE_NAME_MANIFEST_YML = 'manifest.yml'
const DEFAULT_COMPILE_DEST_FOLDER = path.normalize('src/gen')
const FILE_EXT_CSV = '.csv'
const FILE_NAME_PACKAGE_JSON = 'package.json'
const DEPLOY_CMD = 'npx cds-dbm deploy --load-via delta'

class PostgresCfModuleBuilder extends BuildTaskHandlerOData {
  constructor(task, buildOptions) {
    super('PostgreSQL CF Module Builder', task, buildOptions)
    this._result = {
      dest: this.task.dest,
    }
  }

  init() {
    this.task.options.deployCmd = this.task.options.deployCmd || DEPLOY_CMD

    this.task.options.compileDest = path.resolve(
      this.task.dest,
      this.task.options.compileDest || DEFAULT_COMPILE_DEST_FOLDER
    )
  }

  /**
   * name
   */
  public async build() {
    const { src, dest } = this.task
    const modelPaths = this.resolveModel()
    const destGen = this.isStagingBuild() ? dest : path.join(dest, FOLDER_GEN)
    if (!modelPaths || modelPaths.length === 0) {
      this.logger.log('[cds] - no model found, skip build')
      return this._result
    }
    if (DEBUG) {
      this.logger.log(`[cds] - model: ${this.stripProjectPaths(modelPaths).join(', ')}`)
    }

    const model = await this.loadModel(modelPaths)

    const extCsn = this.cds.compile.to.json(model)
    const extModel = JSON.parse(extCsn)
    await this.write(extCsn).to(path.join(destGen, 'csn.json'))

    await this._copyNativeContent(src, dest)
    await this._writePackageJson()
    await this._writeManifestYml()

    const aptFile = path.join(__dirname, 'template', 'apt.yml')
    await this.copy(aptFile).to(path.join(this.task.dest, 'apt.yml'))

    const migrationOptions = cds.env['migrations']['db']
    if (migrationOptions.deploy.undeployFile && existsSync(path.join(src, migrationOptions.deploy.undeployFile))) {
      await this.copy(path.join(src, migrationOptions.deploy.undeployFile)).to(
        path.join(this.task.dest, 'undeploy.json')
      )
    }

    const deployFile = path.join(__dirname, 'template', 'deploy.sh')
    const targetDeployFile = path.join(this.task.dest, 'deploy.sh')
    await this.copy(deployFile).to(targetDeployFile)
    fs.appendFileSync(targetDeployFile, this.task.options.deployCmd)
    chmodSync(targetDeployFile, '777')
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

  async _writePackageJson() {
    const packageJson = path.join(this.task.src, 'package.json')
    const exists = await fs.pathExists(packageJson)

    if (DEBUG && exists) {
      this.logger.log(`[cds] - skip create [${this.stripProjectPaths(packageJson)}], already existing`)
    }
    if (this.isStagingBuild() && !exists) {
      const content = await this._readTemplateAsJson(FILE_NAME_PACKAGE_JSON)
      await this.write(content).to(path.join(this.task.dest, FILE_NAME_PACKAGE_JSON))
    }
  }

  async _writeManifestYml() {
    if (!this.isStagingBuild()) {
      return
    }
    if (
      (await fs.pathExists(path.join(this.task.src, FILE_NAME_MANIFEST_YML))) ||
      (await fs.pathExists(path.join(this.task.src, 'manifest.yml')))
    ) {
      if (DEBUG) {
        this.logger.log('[cds] - skip cf manifest generation, already existing')
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
        this.logger.error('Failed to parse [mta.yaml] - skip manifest.yml generation')
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
