# cds-dbm 

_cds-dbm_ is a node package that adds **delta deployment** and **database migration** support to the Node.js Service SDK (<a href="https://www.npmjs.com/package/@sap/cds">@sap/cds</a>) of the <a href="https://cap.cloud.sap/docs/about/">**SAP Cloud Application Programming Model**</a>. 

The library offers two ways of handling database deployments:<br>
You can either use automated delta deployments of the current cds data model that are in line with the default development workflow in cap projects. For more complex applications and scenarios, there is also integrated support of a full fledged database migration concept.
<br> For both scenarios _cds-dbm_ is relying on the popular Java framework <a href="https://www.liquibase.org/">liquibase</a> to handle (most) of the database activities.

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
- [x] add automated deployment model 
- [ ] add data import of csv files
- [ ] add support for multitenancy
- [ ] add advanced deployment model including migrations
- [ ] add more tests

## Prerequisites

Since the project uses liquibase internally, a Java Runtime Environment (JRE) in at least version 8 is required on your system.

## Usage in your CAP project

Simply add this package to your [CAP](https://cap.cloud.sap/docs/) project by running:

```bash
npm install cds-dbm
```

---

## Automated delta deployments


### Usage with cds-pg (PostgreSQL)

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


### Commands

#### `deploy`

Performs a delta deployment of the current cds data model to the database.

**Usage**

```bash
cds-dbm deploy
```

**Flags**

- `service` (*array*) - The service (defaults to `db`)
- `load` (*string*) - Import data from csv or json files via `full` (relevant tables will be truncated first) or `delta` 
- `auto-undeploy` (*boolean*) - **WARNING**: Drops all tables not known to your data model from the database. This should **only** be used if your cds includes all tables/views in your db (schema).

**Examples**

```bash
cds-dbm deploy
cds-dbm deploy --load delta
cds-dbm deploy --load full --auto-undeploy
```

#### `drop`

Drops all tables and views in your data model from the database. If the `all` parameter is given, then everything in the whole schema will be dropped, not only the cds specific entities.

**Usage**

```bash
cds-dbm drop
```

**Flags**

- `all` (*boolean*) - If set, the whole content of the database/schema is being dropped.


**Examples**

```bash
cds-dbm drop
cds-dbm drop --all
```


## Deploy without explicitly using migrations

`cds-dbm diff`

- drop all known tables/views


`cds-dbm load`

- load csv files into tables

---
## Versioned database development using migrations 

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
