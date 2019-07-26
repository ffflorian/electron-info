#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';
import {ElectronInfo, RawDeps, SupportedDependencies} from './ElectronInfo';

const packageJsonPath = path.join(__dirname, '../package.json');
const {description, name, version} = require(packageJsonPath);

const needsN = (name: string) => `a${/^[aeoui]/.test(name) ? 'n' : ''} ${name}`;

program
  .name(name)
  .description(
    `${description}\n\nAllowed version argument inputs:\n  - SemVer versions (e.g. "~7")\n  - Electron dist tags (e.g. "5-0-x")\n  - "all"`
  )
  .option('-f, --force', 'Force downloading the latest release file')
  .option('-r, --raw', 'Output raw JSON')
  .option('--no-colors', `Don't use colors for displaying`)
  .option('--no-prereleases', `Don't include Electron prereleases`)
  .version(version, '-v, --version');

program
  .command('electron')
  .alias('e')
  .description('Get informations about an Electron version')
  .arguments('[version]')
  .action(async (version, {parent}) => {
    if (!version) {
      program.outputHelp();
      process.exit();
    }
    try {
      const releases = await new ElectronInfo({electronPrereleases: parent.prereleases}).getElectronReleases(
        version,
        !parent.raw as any,
        parent.colors
      );
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

for (const dependency in SupportedDependencies) {
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
        const releases = await new ElectronInfo({electronPrereleases: parent.prereleases}).getDependencyReleases(
          dependency as keyof RawDeps,
          version,
          !parent.raw as any,
          parent.colors
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
      const releases = await new ElectronInfo({electronPrereleases: parent.prereleases}).getAllReleases(
        !parent.raw as any,
        parent.colors
      );
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
