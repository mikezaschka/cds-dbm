using {csw} from '../db/schema_removeColumns';

service BeershopService {
  entity Beers      as projection on csw.Beers;
  entity Breweries  as projection on csw.Brewery;
  entity TypeChecks as projection on csw.TypeChecks;
}
