import { array, Argv } from 'yargs'
import { config } from '../config'
import adapterFactory from '../adapter'

exports.command = 'diff [services]'
exports.desc = 'Creates a local text file containing the changes between you data model and the database'
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
    await adapter!.diff()
  }
}
