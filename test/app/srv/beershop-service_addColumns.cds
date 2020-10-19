using {csw} from '../db/schema_addColumns';

service BeershopService {
  entity Beers      as projection on csw.Beers;
  entity Breweries  as projection on csw.Brewery;
  entity TypeChecks as projection on csw.TypeChecks;
}
