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
  'create-db': {
    alias: 'c',
    type: boolean,
  },
}
exports.handler = async (argv: any) => {
  for (const service of argv.service) {
    const options = await config(service)
    const adapter = await adapterFactory(service, options)
    await adapter!.deploy({
      autoUndeploy: argv.autoUndeploy,
      dryRun: argv.dry,
      loadMode: argv.loadVia,
      createDb: argv.createDb,
    })
  }
}
