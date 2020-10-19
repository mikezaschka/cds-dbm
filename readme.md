# cds-dbm – Database Migrations for the SAP Cloud Application Programming Model (CAP)

_cds-dbm_ is a library that adds delta deployment and database migration support to the Node.js Service SDK (<a href="https://www.npmjs.com/package/@sap/cds">@sap/cds</a>) of the <a href="https://cap.cloud.sap/docs/about/">SAP Cloud Application Programming Model</a>. The library offers a set of cli commands to either have automated delta deployments of a defined cds data model or to have a full fledged migration concept at hand when building more complex applications.
Internally _cds-dbm_ is based on the popular Java framework <a href="https://www.liquibase.org/">liquibase</a> for handling database deltas and migrations.

Currently _cds-dbm_ offers support for the following databases:

- PostgreSQL (<a href="https://github.com/sapmentors/cds-pg">cds-pg</a>)

Support for other databases is planned when a corresponding cds adapter library is available.

<details>
  <summary>Why does <i>cds-dbm</i> (currently) not support SAP HANA?</summary>
  Since SAP HANA is a first class citizen in CAP, SAP offers its own deployment solution to SAP HANA (<a href="https://www.npmjs.com/package/@sap/hdi-deploy">@sap/hdi-deploy</a>). With CAP it is possible to directly compile a data model into SAP HANA fragments (.hdbtable, etc.), which can then be deployed by the hdi-deploy module taking care of deltas and all the important stuff required for dealing with the hdi on XSA or SAP Cloud Platform.
  <br><br>
  Nevertheless it may be suitable to use the <a href="https://github.com/liquibase/liquibase-hanadb">liquibase-hanadb</a> adapter to add an alternative deployment solution?
  <br><br>
</details>
<details>
  <summary>Why does <i>cds-dbm</i> not support SQLite?</summary>
</details>

## Current status

## Usage in your CAP project

Add this package to your [SAP Cloud Application Programming Model](https://cap.cloud.sap/docs/) project by running:

```bash
npm install cds-dbm
```

## Usage with cds-pg (PostgreSQL)

Then add this configuration to the cds section of your package.json:

```JSON
  "cds": {
    "requires": {
      "db": {
        "kind": "postgres"
      },
      "postgres": {
        "impl": "cds-pg",
        "model": [
          "srv"
        ]
      }
    },
    "migrations": {
      "db": {
        "schema": {
          "default": "public",
          "reference": "_cdsdbm",
        },
        "format": "yml",
        "tempChangelogFile": "tmp/_deploy"
      }
    }
  }
```

## Deploy without explicitly using migrations

`cds-dbm deploy`

- deploy to hidden schema
- create hidden diff against schema
- apply hidden diff to db

`cds-dbm diff`

- drop all known tables/views

`cds-dbm drop`

- drop all known tables/views

`cds-dbm load`

- load csv files into tables

## Deploy with migrations

`cds-dbm init db`

- create Migration (if existing)
- create snapshot

Änderung in der Datei

cds-dbm deploy
-> deploy to hidden sqlite3 in memory
-> create hidden diff against sqlite3 in memory
-> apply hidden diff to db

cds-dbm commit
-> deploy
-> create changeset from shapshot to db

--- Production workflow

NODE_ENV production cds-dbm deploy
-> apply changesets to db
