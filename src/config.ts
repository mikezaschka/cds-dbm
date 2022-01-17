interface migrationOptions {
  multitenant?: boolean,
  schema?: {
    default: string
    clone: string
    reference: string
    tenants?: string[]
  }
  database?: {
    default: string
    reference: string
  }
  deploy: {
    tmpFile: string
    undeployFile: string
  }
  migrations?: {
    path: string
  }
}

interface credentials {
  host?: string
  hostname?: string
  port?: number
  database?: string
  dbname?: string
  user?: string
  username?: string
  password?: string
  sslcert?: string
  sslrootcert?: string
};

interface serviceOptions {
  name: string
  kind?: string
  label?: string
  dialect?: string
  model: string[]
  tags?: string[]
  impl?: string
  credentials: credentials
}

interface liquibaseOptions {
  liquibase?: string
  changeLogFile?: string
  url?: string
  username?: string
  password?: string
  classpath?: string
  defaultSchemaName?: string
  referenceUrl?: string
  referenceUsername?: string
  referencePassword?: string
  referenceDefaultSchemaName?: string
  outputFile?: string
  driver?: string
}

interface configOptions {
  service: serviceOptions
  migrations: migrationOptions
}

const config = async (service: string): Promise<configOptions> => {
  await cds.connect()

  const serviceOptions = cds.env.requires[service]
  
  // @ts-ignore
  const migrationOptions = cds.env.migrations[service]
  
  return {
    migrations: migrationOptions,
    service: serviceOptions,
  }
}

export { configOptions, credentials, liquibaseOptions, migrationOptions, config }
