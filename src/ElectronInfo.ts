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

  async getAll(formatted?: false): Promise<RawReleaseInfo[]>;
  async getAll(formatted?: boolean): Promise<RawReleaseInfo[] | string>;
  async getAll(formatted: true): Promise<string>;
  async getAll(formatted: boolean = false): Promise<RawReleaseInfo[] | string> {
    const releases = await this.getReleases();
    if (formatted) {
      return releases.map(release => this.formatElectronRelease(release)).join('\n');
    }
    return releases;
  }

  async getChromeVersion(version: string, formatted?: false): Promise<RawReleaseInfo[] | void>;
  async getChromeVersion(version: string, formatted?: boolean): Promise<RawReleaseInfo[] | string[] | void>;
  async getChromeVersion(version: string, formatted: true): Promise<string[] | void>;
  async getChromeVersion(version: string, formatted: boolean = false): Promise<RawReleaseInfo[] | string[] | void> {
    const parsedVersion = await this.parseVersion('chrome', version);
    const releases = await this.getAll(false);
    const chromeReleases = releases.filter(release => release.deps && release.deps.chrome === parsedVersion);

    if (chromeReleases) {
      if (formatted) {
        return chromeReleases.map(release => this.formatChromeRelease(release));
      }
      return chromeReleases;
    }
  }

  async getElectronVersion(version: string, formatted?: false): Promise<RawReleaseInfo | void>;
  async getElectronVersion(version: string, formatted?: boolean): Promise<RawReleaseInfo | string | void>;
  async getElectronVersion(version: string, formatted: true): Promise<string | void>;
  async getElectronVersion(version: string, formatted: boolean = false): Promise<RawReleaseInfo | string | void> {
    const parsedVersion = await this.parseVersion('electron', version);
    const releases = await this.getAll(false);
    const release = releases.find(release => release.version === parsedVersion);

    if (release) {
      if (formatted) {
        return this.formatElectronRelease(release);
      }
      return release;
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

  private buildTable(release: RawReleaseInfo): string[][] {
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
  }

  private formatElectronRelease(release: RawReleaseInfo): string {
    return createTable(this.buildTable(release));
  }

  private formatChromeRelease(release: RawReleaseInfo): string {
    if (!release.deps) {
      return '';
    }

    return createTable(this.buildTable(release));
  }

  private async parseVersion(key: 'electron' | keyof RawDeps, version: string): Promise<string> {
    let versions: string[] = [];
    const releases = await this.getAll();

    if (key === 'electron') {
      versions = releases.map(release => release.version);
    } else if (releases[0].deps![key]) {
      versions = releases.filter(release => Boolean(release.deps)).map(release => release.deps![key]);
    }

    const parsedVersion =
      version === 'latest'
        ? versions.shift()
        : semver.maxSatisfying(versions, version, {includePrerelease: true, loose: true});

    if (!parsedVersion) {
      throw new Error(`No version found for "${version}"`);
    }

    return parsedVersion;
  }
}
