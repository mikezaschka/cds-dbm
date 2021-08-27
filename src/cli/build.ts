exports.command = 'build'
exports.desc = 'Generates build artifacts'
exports.builder = {}
exports.handler = require('@sap/cds/bin/build')