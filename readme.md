# `cds-dbm` (Core Data Services – Database Migrations)

`cds-dbm` is a package that extends the database tooling capabilities of the <a href="https://cap.cloud.sap/docs/about/">**SAP Cloud Application Programming Model's**</a> Node.js Service SDK (<a href="https://www.npmjs.com/package/@sap/cds">@sap/cds</a>) for relational databases other than the native supported ones (SAP HANA and SQLite).

The library offers a set of command line tasks related to deploying a cds data model to the database:

- [deploy](#command_deploy)
- [load](#command_load)
- [diff](#command_diff)
- [drop](#command_drop)

It also contains a `sap/@cds` builder task to create ready-to-deploy build fragments for SAP Business Technology Platform (BTP) Cloud Foundry:

- [Custom Build Task](#command_build)

## Current status

`cds-dbm` is ready to be used!<br>
The library contains all the necessary commands and functionality to build a cds model for and deploy it to the supported databases.

## Database support

Internally `cds-dbm` is relying on the popular Java framework <a href="https://www.liquibase.org/">liquibase</a> to handle (most) of the database activities. Liquibase by default has support for a variety of relational databases, but currently `cds-dbm` offers support for the following ones:

- PostgreSQL (in combination with the <a href="https://github.com/sapmentors/cds-pg">`cds-pg`</a> database adapter)

Support for other databases is planned whenever a corresponding CDS adapter library is available.

There are some example apps already using `cds-dbm` in combination with `cds-pg`:

- https://github.com/mikezaschka/cap-devtoberfest
- https://github.com/gregorwolf/pg-beershop

There are also some blogposts in the SAP Community showcasing the functionality of `cds-dbm`:

- https://blogs.sap.com/2020/11/16/getting-started-with-cap-on-postgresql-node.js/
- https://blogs.sap.com/2020/11/30/run-and-deploy-cap-with-postgresql-on-sap-cloud-platform-cloud-foundry-node.js/

<details><summary>Why does <i>cds-dbm</i> (currently) not support SAP HANA?</summary>
<p>

As SAP HANA is a first class citizen in CAP, SAP offers its own deployment solution (<a href="https://www.npmjs.com/package/@sap/hdi-deploy">@sap/hdi-deploy</a>). With CAP it is possible to directly compile a data model into SAP HANA fragments (.hdbtable, etc.), which can then be deployed by the hdi-deploy module taking care of all the important stuff (delta handling, hdi-management on XSA or SAP BTP, etc.).
<br>
Nevertheless it may be suitable to use the <a href="https://github.com/liquibase/liquibase-hanadb">liquibase-hanadb</a> adapter to add an alternative deployment solution. If so, support might be added in the future.

</p>
</details>
<br>

# How to use

## Prerequisites

Since the project uses liquibase internally, a Java Runtime Environment (JRE) in at least version 8 is required on your system.

## Usage in your CAP project

Simply add this package to your [CAP](https://cap.cloud.sap/docs/) project by running:

```bash
npm install cds-dbm
```

`cds-dbm` requires some additional configuration added to your `package.json`:

```JavaScript
  "cds": {
    //...
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

---

Internally `cds-dbm` uses 3 different schemas during deployment:

- _default_ – The schema containing your currently deployed and thus running schema
- _clone_ – A schema that will be a clone of the _default_ schema during deployment
- _reference_ – The schema that will contain the CDS model

## Automated delta deployments

> TODO: Add full description

In the meantime some notes on the delta processing:

1. Clone current db schema `cds.migrations.db.schema.default` into `cds.migrations.db.schema.clone`.
2. Drop all CDS based views from clone schema because updates on views do not work in the way liquibase is handling this via `CREATE OR REPLACE VIEW`
   (https://liquibase.jira.com/browse/CORE-2377).
3. Deploy the full CDS model to the reference schema `cds.migrations.db.schema.reference`.
4. Let liquibase create a diff between the clone and reference schema (including the recreation of the dropped views).
5. Do some adjustments on the changelog (handle undeployment stuff, fix order of things).
6. Finally deploy changelog to current schema.
7. Load data from .csv files (if requested).

### Dropping tables/views

`cds-dbm` follows a safe approach and does not drop any database tables during deployment. Thus, old tables will still be around even if they are not part of your data model anymore.

You can either remove them manually or rely on `cds-dbm` to handle this for you.

**Undeployment file**

An undeployment file makes it possible to specifically list views and tables that should be dropped from the database schema during the deployment.

The undeployment file's path needs to be specified in the `package.json` configuration (`cds.migrations.deploy.undeployFile`):

```json
# An example undeploy.json:

{
    "views": [],
    "tables": [
        "csw_beers",
        "csw_anotherTable"
    ]
}
```

**auto-undeployment option**

While an `undeploy.json` file gives you fine grained control, it is also possible to automatically remove tables/views from the database schema. When using the `auto-undeploy` flag during deployment, `cds-dbm` will take the cds model as the reference and remove all other existing tables/views.

### Commands

The following commands exists for working with `cds-dbm` in the automated delta deployment mode:

**Currently tall tasks must be called with npx**

```bash
npx cds-dbm <task>
```

<a name="command_deploy"></a>

#### `deploy`

Performs a delta deployment of the current cds data model to the database. By default no csv files are loaded. If this is required, the load strategy has to be defined (`load-via`).

**Usage**

```bash
cds-dbm deploy
```

**Flags**

- `create-db` (_boolean_) - If set, the deploy task tries to create the database before actually deploying the data model. The deployment will not break, if the database has already been created before.
- `auto-undeploy` (_boolean_) - **WARNING**: Drops all tables not known to your data model from the database. This should **only** be used if your cds includes all tables/views in your db (schema). Otherwise it is highly recommended to use an undeployment file.
- `load-via` (_string_) - Can be either `full` (truncate and insert) or `delta` (check for existing records, then update or insert)
- `dry` (_boolean_) - Does not apply the SQL to the database but logs it to stdout

**Examples**

```bash
cds-dbm deploy
cds-dbm deploy --create-db
cds-dbm deploy --load-via delta
cds-dbm deploy --auto-undeploy
cds-dbm deploy --auto-undeploy --dry
```

<a name="command_load"></a>

#### `load`

Loads data from CSV files into the database.
The following conventions apply (according to the default _@sap/cds_ conventions at https://cap.cloud.sap/docs/guides/databases):

- The files must be located in folders db/csv, db/data/, or db/src/csv.
- They contain data for one entity each. File names must follow the pattern <namespace>-<entity>.csv, for example, my.bookshop-Books.csv.
- They must start with a header line that lists the needed element names.

Different to the default mechanism in _@sap/cds_ (which supports only `full` loads), _cds_dbm_ offers two loading strategies:

- `full` – Truncates a table and then inserts all the data from the CSV file
- `delta` – Checks, if an existing record with the same key exists and performs an update. All other records in the table will be left untouched.

**Usage**

```bash
cds-dbm load --via full
cds-dbm load --via delta
```

**Flags**

- `via` (_string_) - Can be either `full` (truncate and insert) or `delta` (check for existing records, then update or insert)

<a name="command_drop"></a>

#### `drop`

Drops all tables and views in your data model from the database. If the `all` parameter is given, then everything in the whole schema will be dropped, not only the cds specific entities.

**Usage**

```bash
cds-dbm drop
```

**Flags**

- `all` (_boolean_) - If set, the whole content of the database/schema is being dropped.

**Examples**

```bash
cds-dbm drop
cds-dbm drop --all
```

<a name="command_diff"></a>

#### `diff`

Generates a descriptive text containing all the differences between the defined cds model and the current status of the database. By default, the information will be logged to the console.

**Usage**

```bash
cds-dbm diff
```

**Flags**

- `to-file` (_string_) - If set, the diff information will be written into the file and not logged in the console.

**Examples**

```bash
cds-dbm diff
cds-dbm diff --to-file db/diff.txt
```

<a name="command_build"></a>

**Multitenancy Support**

Multitenancy support is currently experimental and not intended for produtive use. To enable multitenant deployments, enable the multitenant boolean as shown below.

On deployment, schemas `tenant1` and `tenant2` will be created as clones of default schema `public`.

Currently, tenant data will be lost on re-deployment. a fix is being worked on... 

```JSON
  "cds": {
    "migrations": {
      "db": {
        "multitenant": true,
        "schema": {
          "default": "public",
          "clone": "_cdsdbm_clone",
          "reference": "_cdsdbm_ref",
          "tenants": [ "tenant1", "tenant2"]
        },
        "deploy": {
          "tmpFile": "tmp/_autodeploy.json",
          "undeployFile": "db/undeploy.json"
        }
      }
    }
  }
```



### `Custom Build Task`

Executes the defined cds build task, either from a .cdsrc or the package json. `cds-dbm` comes with a pre-baked build task, to deploy the data model to a PostgreSQL database on SAP BTP Cloud Foundry.

Example configuration:

```json
"build": {
      "tasks": [
        {
          "use": "node-cf",
          "src": "srv"
        },
        {
          "use": "cds-dbm/dist/build/postgres-cf",
          "for": "postgres-cf",
          "src": "db",
          "options": {
            "deployCmd": "npx cds-dbm deploy --load-via delta --auto-undeploy"
          }
        }
      ]
    },
```

**Usage via `cds build`**

```bash
cds build
```

This will generate a specifc set of files into the `gen/db` (or any other configured) folder, that will be deployed to SAP BTP CF environment.


An example configuration for a `mta.yml` leveraging the build fragments:

```yaml
  - name: devtoberfest-db-deployer
    type: custom
    path: gen/db
    parameters:
      buildpacks: [https://github.com/cloudfoundry/apt-buildpack#v0.2.2, nodejs_buildpack] 
      no-route: true
      no-start: true
      disk-quota: 2GB
      memory: 512MB
      tasks:
      - name: deploy_to_postgresql
        command: ./deploy.sh
        disk-quota: 2GB
        memory: 512MB      
    build-parameters:
      ignore: ["node_modules/"]
    requires:
      - name: devtoberfest-database 

resources:
  - name: devtoberfest-database
    parameters:
      path: ./pg-options.json
      service: postgresql-db
      service-plan: trial
      skip-service-updates:
        parameters: true
    type: org.cloudfoundry.managed-service      
```

## Sponsors

Thank you to **p36 (https://p36.io/)** for sponsoring this project.
