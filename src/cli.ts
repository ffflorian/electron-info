#!/usr/bin/env node

import * as commander from 'commander';
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

commander
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
  .option('-L, --latest', 'List only the latest release (alias for --limit 1, ignores limit)')
  .option('-l, --limit <number>', 'Limit output of releases')
  .option('-r, --raw', 'Output raw JSON')
  .option('-s, --source <url>', 'Use a custom releases source URL or path')
  .option('-t, --timeout <number>', 'Use a custom HTTP timeout')
  .version(version, '-v, --version')
  .option('--no-colors', `Don't use colors for displaying`)
  .option('--no-prereleases', `Don't include Electron prereleases`);

const commanderOptions = commander.opts();

commander
  .command('electron')
  .alias('e')
  .description('Get informations about an Electron release')
  .arguments('[version]')
  .action(async (input?: string) => {
    matchedCommand = true;
    if (!input) {
      console.error('No version specified.');
      commander.outputHelp();
      process.exit();
    }
    try {
      const electronInfo = new ElectronInfo({
        ...(commanderOptions.debug && {debug: true}),
        ...(commanderOptions.force && {forceUpdate: true}),
        ...(commanderOptions.latest && {latest: true}),
        ...(commanderOptions.limit && {limit: parseInt(commanderOptions.limit, 10)}),
        ...(typeof commanderOptions.prereleases !== undefined && {electronPrereleases: commanderOptions.prereleases}),
        ...(commanderOptions.source && {releasesUrl: commanderOptions.source}),
        ...(commanderOptions.timeout && {timeout: parseInt(commanderOptions.timeout, 10)}),
      });

      const releases = commanderOptions.raw
        ? await electronInfo.getElectronReleases(input)
        : await electronInfo.getElectronReleases(input, true, commanderOptions.colors);
      console.info(releases);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

for (const [dependencyShortName, dependencyFullName] of Object.entries(SupportedDependencies)) {
  commander
    .command(dependencyShortName)
    .alias(dependencyShortName[0])
    .description(`Get informations about ${dependencyFullName} releases`)
    .arguments('[version]')
    .action(async version => {
      matchedCommand = true;
      if (!version) {
        console.error('No version specified.');
        commander.outputHelp();
        process.exit();
      }
      try {
        const electronInfo = new ElectronInfo({
          ...(commanderOptions.debug && {debug: true}),
          ...(commanderOptions.force && {forceUpdate: true}),
          ...(commanderOptions.latest && {latest: true}),
          ...(commanderOptions.limit && {limit: parseInt(commanderOptions.limit, 10)}),
          ...(typeof commanderOptions.prereleases !== undefined && {electronPrereleases: commanderOptions.prereleases}),
          ...(commanderOptions.source && {releasesUrl: commanderOptions.source}),
          ...(commanderOptions.timeout && {timeout: commanderOptions.timeout}),
        });

        const releases = commanderOptions.raw
          ? await electronInfo.getDependencyReleases(dependencyShortName as keyof RawDeps, version)
          : await electronInfo.getDependencyReleases(
              dependencyShortName as keyof RawDeps,
              version,
              true,
              commanderOptions.colors
            );
        console.info(releases);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
}

commander
  .command('all', {isDefault: true})
  .alias('a')
  .description('Get informations about all releases')
  .action(async () => {
    matchedCommand = true;
    try {
      const electronInfo = new ElectronInfo({
        ...(commanderOptions.debug && {debug: true}),
        ...(commanderOptions.force && {forceUpdate: true}),
        ...(commanderOptions.latest && {latest: true}),
        ...(commanderOptions.limit && {limit: parseInt(commanderOptions.limit, 10)}),
        ...(typeof commanderOptions.prereleases !== undefined && {electronPrereleases: commanderOptions.prereleases}),
        ...(commanderOptions.source && {releasesUrl: commanderOptions.source}),
        ...(commanderOptions.timeout && {timeout: commanderOptions.timeout}),
      });

      const releases = commanderOptions.raw
        ? await electronInfo.getAllReleases()
        : await electronInfo.getAllReleases(true, commanderOptions.colors);

      console.info(releases);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

commander.parse(process.argv);

if (!commander.args.length || !matchedCommand) {
  console.error('Invalid or no command specified.');
  commander.help();
}
