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
    `${description}

Allowed version argument inputs:
  - SemVer versions (e.g. "~7")
  - npm dist tags (e.g. "5-0-x", only Electron)
  - "all"`
  )
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
    if (!version) {
      program.outputHelp();
      process.exit();
    }
    try {
      const releases = await new ElectronInfo({
        ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
        ...(parent.prereleases && {electronPrereleases: parent.prereleases}),
        ...(parent.source && {releasesUrl: parent.source}),
      }).getElectronReleases(version, !parent.raw as any, parent.colors);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

for (const dependency in SupportedDependencies) {
  program
    .command(dependency)
    .alias(dependency[0])
    .description(`Get informations about ${needsN(dependency)} release`)
    .arguments('[version]')
    .action(async (version, {parent}) => {
      if (!version) {
        program.outputHelp();
        process.exit();
      }
      try {
        const releases = await new ElectronInfo({
          ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
          ...(parent.prereleases && {electronPrereleases: parent.prereleases}),
          ...(parent.source && {releasesUrl: parent.source}),
        }).getDependencyReleases(dependency as keyof RawDeps, version, !parent.raw as any, parent.colors);
        console.log(releases);
      } catch (error) {
        console.error(error);
      }
    });
}

program
  .command('all')
  .description('Get informations about all releases')
  .action(async ({parent}) => {
    try {
      const releases = await new ElectronInfo({
        ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
        ...(parent.prereleases && {electronPrereleases: parent.prereleases}),
        ...(parent.source && {releasesUrl: parent.source}),
      }).getAllReleases(!parent.raw as any, parent.colors);
      console.log(releases);
    } catch (error) {
      console.error(error);
    }
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
