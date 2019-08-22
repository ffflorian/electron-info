#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';
import {ElectronInfo, RawDeps, SupportedDependencies} from './ElectronInfo';

const packageJsonPath = path.join(__dirname, '../package.json');
const {description, name, version} = require(packageJsonPath);

const needsLetterN = (name: string) => `a${/^[aeoui]/.test(name) ? 'n' : ''} ${name}`;
let matchedCommand = false;

program
  .name(name)
  .description(
    `${description}

Allowed version argument inputs:
  - SemVer versions (e.g. "~7")
  - npm dist tags (e.g. "5-0-x", only Electron)
  - "all"`
  )
  .option('-d, --debug', 'Enable debug logging')
  .option('-f, --force', 'Force downloading the latest release file')
  .option('-l, --limit <number>', 'Limit output of releases')
  .option('-r, --raw', 'Output raw JSON')
  .option('-s, --source <url>', 'Use a custom releases source URL or path')
  .option('--no-colors', `Don't use colors for displaying`)
  .option('--no-prereleases', `Don't include Electron prereleases`)
  .version(version, '-v, --version');

program
  .command('electron')
  .alias('e')
  .description('Get informations about an Electron release')
  .arguments('[version]')
  .action(async (version, {parent}) => {
    matchedCommand = true;
    if (!version) {
      console.error('No version specified.');
      program.outputHelp();
      process.exit();
    }
    try {
      const electronInfo = new ElectronInfo({
        ...(parent.debug && {debug: true}),
        ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
        ...(parent.prereleases && {electronPrereleases: parent.prereleases}),
        ...(parent.source && {releasesUrl: parent.source}),
      });

      const releases = parent.raw
        ? electronInfo.getElectronReleases(version)
        : electronInfo.getElectronReleases(version, true, parent.colors);
      console.log(releases);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

for (const dependency in SupportedDependencies) {
  program
    .command(dependency)
    .alias(dependency[0])
    .description(`Get informations about ${needsLetterN(dependency)} release`)
    .arguments('[version]')
    .action(async (version, {parent}) => {
      matchedCommand = true;
      if (!version) {
        console.error('No version specified.');
        program.outputHelp();
        process.exit();
      }
      try {
        const electronInfo = new ElectronInfo({
          ...(parent.debug && {debug: true}),
          ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
          ...(parent.prereleases && {electronPrereleases: parent.prereleases}),
          ...(parent.source && {releasesUrl: parent.source}),
        });

        const releases = parent.raw
          ? electronInfo.getDependencyReleases(dependency as keyof RawDeps, version)
          : electronInfo.getDependencyReleases(dependency as keyof RawDeps, version, true, parent.colors);
        console.log(releases);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
}

program
  .command('all', {isDefault: true})
  .alias('a')
  .description('Get informations about all releases')
  .action(async ({parent}) => {
    matchedCommand = true;
    try {
      const electronInfo = new ElectronInfo({
        ...(parent.debug && {debug: true}),
        ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
        ...(parent.prereleases && {electronPrereleases: parent.prereleases}),
        ...(parent.source && {releasesUrl: parent.source}),
      });

      const releases = parent.raw
        ? await electronInfo.getAllReleases()
        : await electronInfo.getAllReleases(true, parent.colors);
      console.log(releases);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!program.args.length || !matchedCommand) {
  console.log('Invalid or no command specified.');
  program.help();
}
