#!/usr/bin/env node
/* eslint-disable */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node update-server-json-version.js <version>');
  process.exit(1);
}

const serverJsonPath = path.join(__dirname, '..', 'server.json');

try {
  const data = JSON.parse(fs.readFileSync(serverJsonPath, 'utf8'));

  data.version = version;

  if (data.packages && data.packages.length > 0) {
    data.packages[0].version = version;
  }

  fs.writeFileSync(serverJsonPath, JSON.stringify(data, null, 2) + '\n');

  console.log(`Updated server.json to version ${version}`);
} catch (error) {
  console.error(`Failed to update server.json: ${error.message}`);
  process.exit(1);
}
