interface DeployOptions {
  dryRun?: boolean
  loadMode?: string
  autoUndeploy?: boolean
}

interface ViewDefinition {
  name: string
  definition: string
}

export { ViewDefinition, DeployOptions }
