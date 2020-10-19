# cds-dbm 
## Database Migrations for the SAP Cloud Application Programming Model (CAP)

_cds-dbm_ is a library that adds delta deployment and database migration support to the Node.js Service SDK (<a href="https://www.npmjs.com/package/@sap/cds">@sap/cds</a>) of the <a href="https://cap.cloud.sap/docs/about/">SAP Cloud Application Programming Model</a>. The library offers a set of cli commands to either have automated delta deployments of a defined cds data model or to have a full fledged migration concept at hand when building more complex applications.
Internally _cds-dbm_ is based on the popular Java framework <a href="https://www.liquibase.org/">liquibase</a> for handling database deltas and migrations.

Currently _cds-dbm_ offers support for the following databases:

- PostgreSQL (<a href="https://github.com/sapmentors/cds-pg">cds-pg</a>)

Support for other databases is planned whenever a corresponding cds adapter library is available.

<details><summary>Why does <i>cds-dbm</i> (currently) not support SAP HANA?</summary>
<p>

As SAP HANA is a first class citizen in CAP, SAP offers its own deployment solution (<a href="https://www.npmjs.com/package/@sap/hdi-deploy">@sap/hdi-deploy</a>). With CAP it is possible to directly compile a data model into SAP HANA fragments (.hdbtable, etc.), which can then be deployed by the hdi-deploy module taking care  of all the important stuff (delta handling, hdi-management on XSA or SAP Cloud Platform, etc.).
<br>
Nevertheless it may be suitable to use the <a href="https://github.com/liquibase/liquibase-hanadb">liquibase-hanadb</a> adapter to add an alternative deployment solution. If so, support might be added in the future.

</p>
</details>

<details>
<summary>Why does <i>cds-dbm</i> not support SQLite?</summary>
<p>

</p>
</details>

## Current status

- [x] inital project setup including TypeScript and liquibase
- [x] add PostgresSQL adapter (<a href="https://github.com/sapmentors/cds-pg">cds-pg</a>)
- [x] add simple deployment model (deploy delta between cds model and database)
- [ ] add full test suite for simple deployment model
- [ ] implement concept for advanced deployment model including migrations

## Prerequisites

Since the project uses liquibase internally, a Java Runtime Environment (JRE) in at lease version 8 is required on your system.

## Usage in your CAP project

Simply add this package to your [SAP Cloud Application Programming Model](https://cap.cloud.sap/docs/) project by running:

```bash
npm install cds-dbm
```

## Usage with cds-pg (PostgreSQL)

_cds-dbg_ requires some additional configuration added to your package.json:

```JSON
  "cds": {
    ...
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
