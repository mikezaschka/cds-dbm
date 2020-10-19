import { DatabaseService } from '@sap/cds/apis/services'

export interface PostgresDatabase extends DatabaseService {
  cdssql2pgsql(query: string): string
}
