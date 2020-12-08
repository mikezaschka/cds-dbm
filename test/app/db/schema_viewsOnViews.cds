namespace csw;

using {cuid} from '@sap/cds/common';


entity Beers : cuid {
  name    : String(100) @( title: '{i18n>BeerName}' );
  abv     : Decimal(3, 1) @( title: '{i18n>abv}' );
  ibu     : Integer @( title: '{i18n>ibu}', description : '{i18n>ibuDescription}' );
  brewery : Association to one Brewery;
};

entity Brewery : cuid {
  name  : String(150) @( title: '{i18n>BreweryName}' );
  beers : Association to many Beers on beers.brewery = $self;
};

@Aggregation.ApplySupported.PropertyRestrictions : true
entity BreweryAnalytics as projection on Brewery {
    ID,
    @Analytics.Dimension : true
    name as breweryname,
    @Analytics.Dimension : true
    beers.name as beername,
    @Analytics.Measure   : true
    @Aggregation.default : #SUM
    1 as lines : Integer
};
