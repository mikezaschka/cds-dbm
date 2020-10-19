using {csw} from '../db/schema_addTables';

service BeershopService {
  entity Foos      as projection on csw.Foo;
  entity Beers      as projection on csw.Beers;
  entity Breweries  as projection on csw.Brewery;
  entity TypeChecks as projection on csw.TypeChecks;
}
