# cds-dbm 

_cds-dbm_ is a node package that adds **automated delta deployment** and (as a planned, but not yet integrated feature) **full database migration support** to the Node.js Service SDK (<a href="https://www.npmjs.com/package/@sap/cds">@sap/cds</a>) of the <a href="https://cap.cloud.sap/docs/about/">**SAP Cloud Application Programming Model**</a>. 

The library offers two ways of handling database deployments:<br>
You can either use automated delta deployments of the current cds data model that are in line with the default development workflow in cap projects. For more complex applications and scenarios, there will also be integrated support of a full fledged database migration concept.
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

## Current status

This is an early alpha version not yet released as an npm package and not ready to be used in production environments.
The rough plan ahead:

**Project setup**
- [x] inital project setup including TypeScript and liquibase
- [ ] add build pipeline (github actions, ts > js)
- [ ] release as npm package

**General features**
- [x] add automated deployment model 
- [x] add support for auto-undeployment (implicit drop)
- [ ] add support for updeployment files (explicit drop)
- [ ] add data import of csv files
- [ ] add support for multitenancy
- [ ] add advanced deployment model including migrations
- [ ] add more tests

**Database support**
- [x] add PostgresSQL adapter (<a href="https://github.com/sapmentors/cds-pg">cds-pg</a>)
- [ ] verify and maybe add support for SQLite

Contributions are welcome. Details on how to contribute will be added soon.

## Prerequisites

Since the project uses liquibase internally, a Java Runtime Environment (JRE) in at least version 8 is required on your system.

## Usage in your CAP project

Simply add this package to your [CAP](https://cap.cloud.sap/docs/) project by running:

```bash
npm install cds-dbm
```

---

## Automated delta deployments

> TODO: Add description

### Usage with cds-pg (PostgreSQL)

_cds-dbm_ requires some additional configuration added to your package.json:

```JSON
  "cds": {
    ...
    "migrations": {
      "db": {
        "schema": {
          "default": "public",
          "clone": "_cdsdbm_clone",
          "reference": "_cdsdbm_ref"
        },
        "deploy": {
          "tmpFile": "tmp/_autodeploy.json",
          "undeployFile": "db/undeploy.json"  
        }
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
- `auto-undeploy` (*boolean*) - **WARNING**: Drops all tables not known to your data model from the database. This should **only** be used if your cds includes all tables/views in your db (schema). Otherwise it is highly recommended to use an undeployment file.
- `dry-run` (*boolean*) - Does not apply the SQL to the database but logs it to stdout

**Examples**

```bash
cds-dbm deploy
cds-dbm deploy --auto-undeploy
cds-dbm deploy --auto-undeploy --dry-run
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

#### `diff`

Generates a descriptive text file containing all the differences between the defined cds model and the current status of the database.

**Usage**

```bash
cds-dbm diff
```

**Flags**

- `file` (*string*) - The file path of the diff file. If not set this will default to `<project-root>/diff.txt`


**Examples**

```bash
cds-dbm diff
cds-dbm diff --file db/diff.txt
```

---

## Versioned database development using migrations 

_Not yet implemented_

## Sponsors

Thank you to **p36 (https://p36.io/)** for sponsoring this project. 
