#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';
import {ElectronInfo} from './ElectronInfo';

const packageJsonPath = path.join(__dirname, '../package.json');
const {description, name, version} = require(packageJsonPath);

program
  .name(name)
  .description(description)
  .option('-f, --force', 'Force downloading the latest release file (default: false)')
  .option('-r, --raw', 'Output raw JSON (default: false)')
  .version(version, '-v, --version');

program
  .command('chrome')
  .alias('c')
  .description('Get informations about a Chrome version (e.g. "chrome 73" or "chrome latest")')
  .arguments('[version]')
  .action(async (version, {parent}) => {
    if (!version) {
      program.outputHelp();
      process.exit();
    }
    try {
      const releases = await new ElectronInfo().getChromeVersion(version, !parent.raw);
      if (parent.raw) {
        console.log(releases);
      } else {
        if (releases) {
          for (const release of releases) {
            console.log(release);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

program
  .command('electron')
  .alias('e')
  .description('Get informations about an Electron version (e.g. "electron 5.0.7" or "electron latest")')
  .arguments('[version]')
  .action(async (version, {parent}) => {
    if (!version) {
      program.outputHelp();
      process.exit();
    }
    try {
      const releases = await new ElectronInfo().getElectronVersion(version, !parent.raw);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program
  .command('all')
  .description('Get informations about all Electron versions')
  .action(async ({parent}) => {
    try {
      const releases = await new ElectronInfo().getAllReleases(!parent.raw);
      if (parent.raw || typeof releases === 'string') {
        console.log(releases);
      } else {
        if (Array.isArray(releases)) {
          for (const release of releases) {
            console.log(release);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
