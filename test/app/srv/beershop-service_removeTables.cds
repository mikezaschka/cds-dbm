using {csw} from '../db/schema_removeTables';

service BeershopService {
  entity TypeChecks as projection on csw.TypeChecks;
}
