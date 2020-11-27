import { array, Argv } from 'yargs'
import { config } from '../config'
import adapterFactory from '../adapter'

exports.command = 'diff'
exports.desc = 'Show the changes between the cds data model and the database'
exports.builder = {
  service: {
    alias: 's',
    type: array,
    default: ['db'],
  },
  'to-file': {
    alias: 'f',
    type: String,
  },
}
exports.handler = async (argv: any) => {
  for (const service of argv.service) {
    const options = await config(service)
    const adapter = await adapterFactory(service, options)
    await adapter!.diff(argv.toFile)
  }
}
