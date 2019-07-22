#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';
import {ElectronInfo} from './ElectronInfo';

const packageJsonPath = path.join(__dirname, '../package.json');
const {description, name, version} = require(packageJsonPath);

program
  .name(name)
  .description(description)
  .option('-f, --force', 'Force downloading the latest release file')
  .version(version, '-v, --version');

program
  .command('chrome')
  .alias('c')
  .description('Get informations about a Chrome version (e.g. "chrome 73")')
  .arguments('[version]')
  .action(async version => {
    try {
      const releases = await new ElectronInfo().getChromeVersion(version, true);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program
  .command('electron')
  .description('Get informations about an Electron version (e.g. "electron 5.0.7")')
  .arguments('[version]')
  .action(async version => {
    try {
      const releases = await new ElectronInfo().getElectronVersion(version, true);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program
  .command('all')
  .description('Get informations about all Electron versions')
  .action(async () => {
    try {
      const releases = await new ElectronInfo().getAll(true);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
