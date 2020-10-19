// Config
// https://cap.cloud.sap/docs/advanced/config


const deploy = async () => {
    const cds = require('@sap/cds')
    const cds_deploy = require('@sap/cds/lib/db/deploy')

    await cds.connect()
    console.log(cds.env.migrations);
}

deploy();

