#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';
import {ElectronInfo, SupportedDependencies} from './ElectronInfo';

const packageJsonPath = path.join(__dirname, '../package.json');
const {description, name, version} = require(packageJsonPath);

const needsN = (name: string) => `a${/^[aeoui]/.test(name) ? 'n' : ''} ${name}`;

program
  .name(name)
  .description(description)
  .option('-f, --force', 'Force downloading the latest release file')
  .option('-r, --raw', 'Output raw JSON')
  .option('--no-colors', `Don't use colors for displaying`)
  .version(version, '-v, --version');

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
      const releases = await new ElectronInfo().getElectronReleases(version, !parent.raw as any, !parent.disableColors);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

for (const dependency of SupportedDependencies) {
  program
    .command(dependency)
    .alias(dependency[0])
    .description(`Get informations about ${needsN(dependency)} version`)
    .arguments('[version]')
    .action(async (version, {parent}) => {
      if (!version) {
        program.outputHelp();
        process.exit();
      }
      try {
        const releases = await new ElectronInfo().getDependencyReleases(
          dependency,
          version,
          !parent.raw as any,
          !parent.disableColors
        );
        console.log(releases);
      } catch (error) {
        console.error(error);
      }
    });
}

program
  .command('all')
  .description('Get informations about all versions')
  .action(async ({parent}) => {
    try {
      const releases = await new ElectronInfo().getAllReleases(!parent.raw as any, !parent.disableColors);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
