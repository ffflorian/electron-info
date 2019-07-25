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
  forceUpdate?: boolean;
  releasesUrl?: string;
  tempDirectory?: string;
}

const mkdtempAsync = promisify(fs.mkdtemp);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const accessAsync = promisify(fs.access);
const {bold} = Chalk;

const defaultOptions: Required<Options> = {
  forceUpdate: false,
  releasesUrl: 'https://unpkg.com/electron-releases@latest/lite.json',
  tempDirectory: '',
};

export class ElectronInfo {
  private readonly options: Required<Options>;

  constructor(options?: Options) {
    this.options = {...defaultOptions, ...options};
  }

  async getAllReleases(formatted?: false): Promise<RawReleaseInfo[]>;
  async getAllReleases(formatted?: boolean): Promise<RawReleaseInfo[] | string>;
  async getAllReleases(formatted: true): Promise<string>;
  async getAllReleases(formatted: boolean = false): Promise<RawReleaseInfo[] | string> {
    const releases = await this.getReleases();
    if (formatted) {
      return releases.map(release => this.formatElectronReleases([release])).join('\n');
    }
    return releases;
  }

  async getChromeVersion(version: string, formatted?: false): Promise<RawReleaseInfo[] | void>;
  async getChromeVersion(version: string, formatted?: boolean): Promise<RawReleaseInfo[] | string[] | void>;
  async getChromeVersion(version: string, formatted: true): Promise<string[] | void>;
  async getChromeVersion(version: string, formatted: boolean = false): Promise<RawReleaseInfo[] | string[] | void> {
    const parsedVersions = await this.getVersions('chrome', version);
    const releases = await this.getAllReleases(false);
    const chromeReleases = releases.filter(release => release.deps && parsedVersions.includes(release.deps.chrome));

    if (chromeReleases) {
      if (formatted) {
        return chromeReleases.map(release => this.formatChromeRelease([release]));
      }
      return chromeReleases;
    }
  }

  async getElectronVersion(version: string, formatted?: false): Promise<RawReleaseInfo[] | void>;
  async getElectronVersion(version: string, formatted?: boolean): Promise<RawReleaseInfo[] | string | void>;
  async getElectronVersion(version: string, formatted: true): Promise<string | void>;
  async getElectronVersion(version: string, formatted: boolean = false): Promise<RawReleaseInfo[] | string | void> {
    const parsedVersions = await this.getVersions('electron', version);
    const releases = await this.getAllReleases(false);
    const electronReleases = releases.filter(release => parsedVersions.includes(release.version));

    if (electronReleases) {
      if (formatted) {
        return this.formatElectronReleases(electronReleases);
      }
      return electronReleases;
    }
  }

  private async fileIsReadable(filePath: string): Promise<boolean> {
    try {
      await accessAsync(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getReleases(): Promise<RawReleaseInfo[]> {
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

  private buildTables(releases: RawReleaseInfo[]): string[][][] {
    return releases.map(release => {
      const electronVersion = `${release.version}${release.prerelease ? ' (prerelease)' : ''}`;
      const table = [[bold('Dependency'), bold('Version')], [bold('Electron'), electronVersion]];

      if (release.deps) {
        table.push(
          [bold.red('Node.js'), release.deps.node],
          [bold.green('Chrome'), release.deps.chrome],
          [bold.blue('OpenSSL'), release.deps.openssl],
          [bold.yellow('V8'), release.deps.v8]
        );
      }

      return table;
    });
  }

  private formatElectronReleases(releases: RawReleaseInfo[]): string {
    return this.buildTables(releases)
      .map(table => createTable(table))
      .join('\n');
  }

  private formatChromeRelease(releases: RawReleaseInfo[]): string {
    releases = releases.filter(release => !!release.deps);

    if (!releases.length) {
      return '';
    }

    return this.buildTables(releases)
      .map(table => createTable(table))
      .join('\n');
  }

  private async getVersions(key: 'electron' | keyof RawDeps, inputVersion: string): Promise<string[]> {
    let dependencyVersions: string[] = [];
    const releases = await this.getAllReleases();

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

    if (!parsedVersions) {
      throw new Error(`No version found for "${inputVersion}"`);
    }

    return parsedVersions;
  }
}
