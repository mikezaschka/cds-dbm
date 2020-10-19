import { SqliteAdapter } from "./SqliteAdapter";
import { PostgresAdapter } from "./PostgresAdapter";
import { configOptions } from "../config";

/**
 * Adapter factory returns an instance of the service migration handler.
 * 
 * @param service 
 * @param options 
 */
const getAdapter = async (service: string, options: configOptions) => {
  await cds.connect()

  switch (cds.services[service].constructor.name) {
    case 'PostgresDatabase':
    case 'node_modules/cds-pg/index.js':
      return new PostgresAdapter(service, options)
      break
    case 'SQLiteDatabase':
      return new SqliteAdapter(service, options)
      break    
    default:
      throw "Unsupported database. Currently only SQLite and PostgreSQL (cds-pg) are supported." 
      return null;
      break;  
  }
}

export default getAdapter
