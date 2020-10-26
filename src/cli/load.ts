import { array, Argv, boolean } from 'yargs'
import { config } from '../config'
import adapterFactory from '../adapter'

exports.command = 'load [services]'
exports.desc = 'WARNING: Drops all tables/views from the database'
exports.builder = {
  service: {
    alias: 's',
    type: array,
    default: ['db'],
  },
}
exports.handler = async (argv: any) => {
  for (const service of argv.service) {
    const options = await config(service)
    const adapter = await adapterFactory(service, options)
    await adapter!.load()
  }
}
