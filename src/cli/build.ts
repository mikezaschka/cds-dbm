import { array, boolean } from 'yargs'
import { config } from '../config'
import adapterFactory from '../adapter'

exports.command = 'build '
exports.desc = 'Generates build artifacts'
exports.builder = {
  target: {
    alias: 't',
    type: String,
  },
}
exports.handler = async (argv: any) => {
  for (const service of argv.service) {
    const options = await config(service)
    const adapter = await adapterFactory(service, options)
    //await adapter!.build({ autoUndeploy: argv.autoUndeploy, dryRun: argv.dry, loadMode: argv.loadVia })
    throw "not implemented yet"
  }
}
