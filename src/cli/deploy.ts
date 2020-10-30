import { array, boolean } from 'yargs'
import { config } from '../config'
import adapterFactory from '../adapter'

exports.command = 'deploy [services]'
exports.desc = 'Dynamically identifies changes in your cds data model and deploys them to the database'
exports.builder = {
  service: {
    alias: 's',
    type: array,
    default: ['db'],
  },
  'auto-undeploy': {
    alias: 'a',
    type: boolean,
  },
  dry: {
    alias: 'd',
    type: boolean,
  },
  'load-via': {
    alias: 'l',
    type: String,
  },
}
exports.handler = async (argv: any) => {
  for (const service of argv.service) {
    const options = await config(service)
    const adapter = await adapterFactory(service, options)
    const isFull = argv.full || !argv.delta
    await adapter!.deploy({ autoUndeploy: argv.autoUndeploy, dryRun: argv.dry, loadMode: argv.loadVia })
  }
}
