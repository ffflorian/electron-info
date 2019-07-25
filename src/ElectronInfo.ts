import axios from 'axios';
import Chalk from 'chalk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import {table as createTable} from 'table';
import {promisify} from 'util';

export interface RawDeps {
  chrome: string;
  modules: string;
  node: string;
  openssl: string;
  uv: string;
  v8: string;
  zlib: string;
}

export interface RawReleaseInfo {
  deps?: RawDeps;
  name: string;
  node_id: string;
  npm_dist_tags: string[];
  npm_package_name: string;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
  total_downloads: number;
  version: string;
}

interface Options {
  /** Default is `true`. */
  electronPrereleases?: boolean;
  /** Default is `false`. */
  forceUpdate?: boolean;
  /** Default is https://unpkg.com/electron-releases@latest/lite.json. */
  releasesUrl?: string;
  /** Will be created if not defined. */
  tempDirectory?: string;
}

const mkdtempAsync = promisify(fs.mkdtemp);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const accessAsync = promisify(fs.access);
const {bold} = Chalk;

const defaultOptions: Required<Options> = {
  electronPrereleases: true,
  forceUpdate: false,
  releasesUrl: 'https://unpkg.com/electron-releases@latest/lite.json',
  tempDirectory: '',
};

export const SupportedDependencies: Array<keyof RawDeps> = ['chrome', 'modules', 'node', 'openssl', 'uv', 'v8', 'zlib'];

export class ElectronInfo {
  private readonly options: Required<Options>;

  constructor(options?: Options) {
    this.options = {...defaultOptions, ...options};
  }

  async getAllReleases(formatted?: false): Promise<RawReleaseInfo[]>;
  async getAllReleases(formatted: true, colored?: boolean): Promise<string>;
  async getAllReleases(formatted?: boolean, colored?: boolean): Promise<RawReleaseInfo[] | string> {
    const allReleases = await this.downloadReleases();
    if (formatted) {
      return this.formatReleases(allReleases, colored);
    }
    return allReleases;
  }

  async getDependencyReleases(
    dependency: keyof RawDeps,
    version: string,
    formatted?: false
  ): Promise<RawReleaseInfo[] | void>;
  async getDependencyReleases(
    dependency: keyof RawDeps,
    version: string,
    formatted: true,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string | void>;
  async getDependencyReleases(
    dependency: keyof RawDeps,
    version: string,
    formatted?: boolean,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string | void> {
    const parsedVersions = await this.getVersions(dependency, version);
    const allReleases = await this.getAllReleases(false);
    const filteredReleases = allReleases.filter(
      release => release.deps && parsedVersions.includes(release.deps[dependency])
    );

    if (filteredReleases) {
      if (formatted) {
        return this.formatDependencyReleases(filteredReleases, colored);
      }
      return filteredReleases;
    }
  }

  async getElectronReleases(version: string, formatted?: false): Promise<RawReleaseInfo[] | void>;
  async getElectronReleases(version: string, formatted: true, colored?: boolean): Promise<string | void>;
  async getElectronReleases(
    version: string,
    formatted?: boolean,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string | void> {
    const parsedVersions = await this.getVersions('electron', version);
    const allReleases = await this.getAllReleases(false);
    const electronReleases = allReleases.filter(release => parsedVersions.includes(release.version));

    if (electronReleases) {
      if (formatted) {
        return this.formatReleases(electronReleases, colored);
      }
      return electronReleases;
    }
  }

  private buildFoundString(releases: RawReleaseInfo[]): string {
    return `Found ${releases.length} release${releases.length === 1 ? '' : 's'}.`;
  }

  private async fileIsReadable(filePath: string): Promise<boolean> {
    try {
      await accessAsync(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async downloadReleases(): Promise<RawReleaseInfo[]> {
    const tempDirectory = await this.createTempDir();
    const tempFile = path.join(tempDirectory, 'latest.json');

    if ((await this.fileIsReadable(tempFile)) && !this.options.forceUpdate) {
      const rawData = await readFileAsync(tempFile, 'utf8');
      return JSON.parse(rawData);
    }

    const {data} = await axios.get(this.options.releasesUrl);
    await writeFileAsync(tempFile, JSON.stringify(data));
    return data;
  }

  private async createTempDir(): Promise<string> {
    if (!this.options.tempDirectory) {
      this.options.tempDirectory = await mkdtempAsync(path.join(os.tmpdir(), 'electron-info-'));
    }

    return this.options.tempDirectory;
  }

  private buildRawTables(releases: RawReleaseInfo[], colored: boolean = false): string[][][] {
    const coloredOrNot = (text: string, style: typeof Chalk, colored: boolean = false): string =>
      colored ? style(text) : text;

    return releases.map(release => {
      const electronVersion = `${release.version}${release.prerelease ? ' (prerelease)' : ''}`;
      const table = [
        [coloredOrNot('Dependency', bold, colored), coloredOrNot('Version', bold, colored)],
        [coloredOrNot('Electron', bold, colored), electronVersion],
      ];

      if (release.deps) {
        table.push(
          [coloredOrNot('Node.js', bold.red, colored), release.deps.node],
          [coloredOrNot('Chrome', bold.green, colored), release.deps.chrome],
          [coloredOrNot('OpenSSL', bold.blue, colored), release.deps.openssl],
          [coloredOrNot('Modules', bold.yellow, colored), release.deps.modules],
          [coloredOrNot('uv', bold.cyan, colored), release.deps.uv],
          [coloredOrNot('V8', bold.gray, colored), release.deps.v8],
          [coloredOrNot('zlib', bold.magenta, colored), release.deps.zlib]
        );
      }

      return table;
    });
  }

  private formatReleases(releases: RawReleaseInfo[], colored: boolean = false): string {
    if (!releases.length) {
      return this.buildFoundString(releases);
    }

    const joinedReleases = this.buildRawTables(releases, colored)
      .map(table => createTable(table))
      .join('\n');

    return `${joinedReleases}\n${this.buildFoundString(releases)}`;
  }

  private formatDependencyReleases(releases: RawReleaseInfo[], colored: boolean = false): string {
    releases = releases.filter(release => !!release.deps);

    if (!releases.length) {
      return this.buildFoundString(releases);
    }

    const joinedReleases = this.buildRawTables(releases, colored)
      .map(table => createTable(table))
      .join('\n');

    return `${joinedReleases}\n${this.buildFoundString(releases)}`;
  }

  private async getVersions(key: 'electron' | keyof RawDeps, inputVersion: string): Promise<string[]> {
    let dependencyVersions: string[] = [];
    let releases = await this.getAllReleases();

    if (!this.options.electronPrereleases) {
      releases = releases.filter(release => semver.prerelease(release.version) === null);
    }

    if (key === 'electron') {
      dependencyVersions = releases.map(release => release.version);
    } else if (releases[0].deps![key]) {
      dependencyVersions = releases.filter(release => Boolean(release.deps)).map(release => release.deps![key]);
    }

    const satisfiesArbitrary = (dependencyVersion: string, inputVersion: string) => {
      const dependencyVersionClean = semver.clean(dependencyVersion, {includePrerelease: true, loose: true}) || '';
      return semver.satisfies(dependencyVersionClean, inputVersion, {
        includePrerelease: true,
        loose: true,
      });
    };

    const parsedVersions: string[] =
      inputVersion === 'latest'
        ? [dependencyVersions.shift()!]
        : dependencyVersions.filter(dependencyVersion => satisfiesArbitrary(dependencyVersion, inputVersion));

    return parsedVersions;
  }
}
