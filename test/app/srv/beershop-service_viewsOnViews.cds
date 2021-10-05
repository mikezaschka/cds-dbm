using {csw} from '../db/schema_viewsOnViews';

service BeershopService {
  //entity Beers      as projection on csw.Beers;
  @readonly
  entity Breweries  as projection on csw.Brewery;
  @readonly
  entity BreweryAnalytics as projection on csw.BreweryAnalytics;
}
