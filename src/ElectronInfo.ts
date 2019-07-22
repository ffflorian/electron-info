import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
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
}

const mkdtempAsync = promisify(fs.mkdtemp);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const accessAsync = promisify(fs.access);

export class ElectronInfo {
  private tempDirectory?: string;
  private readonly releasesUrl: string;
  private readonly options: Options;

  constructor(options: Options = {}) {
    this.options = options;
    this.releasesUrl = 'https://unpkg.com/electron-releases@latest/lite.json';
    this.tempDirectory = '';
  }

  async getAll(formatted: true): Promise<string>;
  async getAll(formatted?: false): Promise<RawReleaseInfo[]>;
  async getAll(formatted: boolean = false): Promise<RawReleaseInfo[] | string> {
    const releases = await this.getReleases();
    if (formatted) {
      return releases.map(release => this.formatElectronRelease(release)).join('\n');
    }
    return releases;
  }

  async getChromeVersion(version: string, formatted: boolean = false): Promise<RawReleaseInfo | string | void> {
    const parsedVersion = await this.parseVersion('chrome', version);
    const releases = await this.getAll(false);
    const release = releases.find(release => release.deps && release.deps.chrome === parsedVersion);

    if (release) {
      if (formatted) {
        return this.formatChromeRelease(release!);
      }
      return release;
    }
  }

  async getElectronVersion(version: string, formatted: boolean = false): Promise<RawReleaseInfo | string | void> {
    const parsedVersion = await this.parseVersion('electron', version);
    const releases = await this.getAll(false);
    const release = releases.find(release => release.version === parsedVersion);

    if (release) {
      if (formatted) {
        return this.formatElectronRelease(release!);
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

    const {data} = await axios.get(this.releasesUrl);
    await writeFileAsync(tempFile, JSON.stringify(data));
    return data;
  }

  private async createTempDir(): Promise<string> {
    if (!this.tempDirectory) {
      this.tempDirectory = await mkdtempAsync(path.join(os.tmpdir(), 'electron-info-'));
    }

    return this.tempDirectory;
  }

  private formatElectronRelease(release: RawReleaseInfo): string {
    let formatted = `Electron v${release.version}`;
    if (release.prerelease) {
      formatted += ' (prerelease)';
    }
    if (release.deps) {
      formatted += `\nNode.js v${release.deps.node}`;
      formatted += `\nChrome v${release.deps.chrome}`;
      formatted += `\nOpenSSL v${release.deps.openssl}`;
      formatted += `\nV8 v${release.deps.v8}`;
    }
    return formatted;
  }

  private formatChromeRelease(release: RawReleaseInfo): string {
    console.log('release', release);
    let formatted = '';
    if (release.deps) {
      formatted += `Chrome v${release.deps.chrome}`;
      formatted += `\nNode.js v${release.deps.node}`;
      formatted += `\nChrome v${release.deps.chrome}`;
      formatted += `\nOpenSSL v${release.deps.openssl}`;
      formatted += `\nV8 v${release.deps.v8}`;
    }
    return formatted;
  }

  private async parseVersion(key: 'electron' | keyof RawDeps, version: string): Promise<string> {
    if (!semver.valid(version)) {
      throw new Error(`Invalid version number "${version}"`);
    }

    let versions: string[] = [];
    const releases = await this.getAll();

    if (key === 'electron') {
      versions = releases.map(release => release.version);
    } else if (releases[0].deps![key]) {
      versions = releases.filter(release => Boolean(release.deps)).map(release => release.deps![key]);
    }

    const parsedVersion = semver.maxSatisfying(versions, version);
    if (!parsedVersion) {
      throw new Error(`No version found for "${version}"`);
    }
    return parsedVersion;
  }
}
