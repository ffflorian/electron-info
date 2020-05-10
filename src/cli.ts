#!/usr/bin/env node

import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import {ElectronInfo, RawDeps, SupportedDependencies} from './ElectronInfo';

const defaultPackageJsonPath = path.join(__dirname, 'package.json');
const packageJsonPath = fs.existsSync(defaultPackageJsonPath)
  ? defaultPackageJsonPath
  : path.join(__dirname, '../package.json');

const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
const {description, name, version}: {description: string; name: string; version: string} = JSON.parse(packageJson);

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
  .option('-t, --timeout <number>', 'Use a custom HTTP timeout')
  .version(version, '-v, --version')
  .option('--no-colors', `Don't use colors for displaying`)
  .option('--no-prereleases', `Don't include Electron prereleases`);

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
        ...(parent.force && {forceUpdate: true}),
        ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
        ...(typeof parent.prereleases !== undefined && {electronPrereleases: parent.prereleases}),
        ...(parent.source && {releasesUrl: parent.source}),
        ...(parent.timeout && {timeout: parseInt(parent.timeout, 10)}),
      });

      const releases = parent.raw
        ? await electronInfo.getElectronReleases(version)
        : await electronInfo.getElectronReleases(version, true, parent.colors);
      console.info(releases);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

for (const [dependencyShortName, dependencyFullName] of Object.entries(SupportedDependencies)) {
  program
    .command(dependencyShortName)
    .alias(dependencyShortName[0])
    .description(`Get informations about ${dependencyFullName} releases`)
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
          ...(parent.force && {forceUpdate: true}),
          ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
          ...(typeof parent.prereleases !== undefined && {electronPrereleases: parent.prereleases}),
          ...(parent.source && {releasesUrl: parent.source}),
          ...(parent.timeout && {timeout: parent.timeout}),
        });

        const releases = parent.raw
          ? await electronInfo.getDependencyReleases(dependencyShortName as keyof RawDeps, version)
          : await electronInfo.getDependencyReleases(
              dependencyShortName as keyof RawDeps,
              version,
              true,
              parent.colors
            );
        console.info(releases);
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
        ...(parent.force && {forceUpdate: true}),
        ...(parent.limit && {limit: parseInt(parent.limit, 10)}),
        ...(typeof parent.prereleases !== undefined && {electronPrereleases: parent.prereleases}),
        ...(parent.source && {releasesUrl: parent.source}),
        ...(parent.timeout && {timeout: parent.timeout}),
      });

      const releases = parent.raw
        ? await electronInfo.getAllReleases()
        : await electronInfo.getAllReleases(true, parent.colors);

      console.info(releases);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!program.args.length || !matchedCommand) {
  console.error('Invalid or no command specified.');
  program.help();
}
