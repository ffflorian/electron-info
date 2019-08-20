import axios from 'axios';
import Chalk from 'chalk';
import * as fs from 'fs';
import * as moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import {table as createTable} from 'table';

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

export interface Options {
  /** If Electron prereleases should be included. Default is `true`. */
  electronPrereleases?: boolean;
  /** Force downloading the latest release file. Default is `false`. */
  forceUpdate?: boolean;
  /** Limit output of releases. Everything below 1 will be treated as no limit. Default: no limit */
  limit?: number;
  /** Default is https://unpkg.com/electron-releases@latest/lite.json. */
  releasesUrl?: string;
  /**
   * If a certain temporary directory should be used.
   * The system's temporary directory will be used if not defined.
   */
  tempDirectory?: string;
}

const {bold} = Chalk;
const {promises: fsAsync} = fs;

const defaultOptions: Required<Options> = {
  electronPrereleases: true,
  forceUpdate: false,
  limit: 0,
  releasesUrl: 'https://unpkg.com/electron-releases@latest/lite.json',
  tempDirectory: '',
};

export const SupportedDependencies: RawDeps = {
  chrome: 'Chrome',
  modules: 'Modules',
  node: 'Node.js',
  openssl: 'OpenSSL',
  uv: 'uv',
  v8: 'V8',
  zlib: 'zlib',
};

export class ElectronInfo {
  private readonly options: Required<Options>;

  constructor(options?: Options) {
    this.options = {...defaultOptions, ...options};
    this.options.limit = Math.max(0, this.options.limit);
  }

  async getAllReleases(formatted?: false, colored?: false, limit?: number): Promise<RawReleaseInfo[]>;
  async getAllReleases(formatted: true, colored?: boolean, limit?: number): Promise<string>;
  async getAllReleases(formatted?: boolean, colored?: boolean, limit?: number): Promise<RawReleaseInfo[] | string> {
    const allReleases = await this.downloadReleases();
    return formatted ? this.formatReleases(allReleases, colored) : allReleases;
  }

  async getDependencyReleases(dependency: keyof RawDeps, version: string, formatted?: false): Promise<RawReleaseInfo[]>;
  async getDependencyReleases(
    dependency: keyof RawDeps,
    version: string,
    formatted: true,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string>;
  async getDependencyReleases(
    dependency: keyof RawDeps,
    version: string,
    formatted?: boolean,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string> {
    const dependencyVersions = await this.getVersions(dependency, version);
    const allReleases = await this.getAllReleases(false);
    const filteredReleases = allReleases.filter(
      release => release.deps && dependencyVersions.includes(release.deps[dependency])
    );

    return formatted ? this.formatDependencyReleases(filteredReleases, colored) : filteredReleases;
  }

  async getElectronReleases(version: string, formatted?: false): Promise<RawReleaseInfo[]>;
  async getElectronReleases(version: string, formatted: true, colored?: boolean): Promise<string>;
  async getElectronReleases(
    version: string,
    formatted?: boolean,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string> {
    const electronVersions = await this.getVersions('electron', version);
    const allReleases = await this.getAllReleases(false);
    const filteredReleases = allReleases.filter(release => electronVersions.includes(release.version));

    return formatted ? this.formatReleases(filteredReleases, colored) : filteredReleases;
  }

  private buildFoundString(releases: RawReleaseInfo[]): string {
    return `Found ${releases.length} release${releases.length === 1 ? '' : 's'}.`;
  }

  private buildRawTables(releases: RawReleaseInfo[], colored?: boolean): string[][][] {
    const coloredOrNot = (text: string, style: typeof Chalk): string => (colored ? style(text) : text);

    return releases.map(release => {
      const electronVersion = `${release.version}${release.prerelease ? ' (prerelease)' : ''}`;
      const releaseDate = moment(release.published_at).format('L');
      const table = [
        [coloredOrNot('Electron', bold), electronVersion],
        [coloredOrNot('Published on', bold), releaseDate],
      ];

      if (release.deps) {
        table.push(
          [coloredOrNot('Node.js', bold.red), release.deps.node],
          [coloredOrNot('Chrome', bold.green), release.deps.chrome],
          [coloredOrNot('OpenSSL', bold.blue), release.deps.openssl],
          [coloredOrNot('Modules', bold.yellow), release.deps.modules],
          [coloredOrNot('uv', bold.cyan), release.deps.uv],
          [coloredOrNot('V8', bold.rgb(150, 150, 150)), release.deps.v8],
          [coloredOrNot('zlib', bold.magenta), release.deps.zlib]
        );
      }

      return table;
    });
  }

  private async createTempDir(): Promise<string> {
    if (!this.options.tempDirectory) {
      this.options.tempDirectory = await fsAsync.mkdtemp(path.join(os.tmpdir(), 'electron-info-'));
    }

    return this.options.tempDirectory;
  }

  private async downloadReleases(): Promise<RawReleaseInfo[]> {
    const tempDirectory = await this.createTempDir();
    const tempFile = path.join(tempDirectory, 'latest.json');

    if ((await this.fileIsReadable(tempFile)) && !this.options.forceUpdate) {
      const rawData = await fsAsync.readFile(tempFile, 'utf8');
      return JSON.parse(rawData);
    }

    const {data: releases} = await axios.get<RawReleaseInfo[]>(this.options.releasesUrl);

    if (!Array.isArray(releases)) {
      throw new Error('Invalid data received from server');
    }

    await fsAsync.writeFile(tempFile, JSON.stringify(releases));
    return releases;
  }

  private async fileIsReadable(filePath: string): Promise<boolean> {
    try {
      await fsAsync.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  private formatDependencyReleases(releases: RawReleaseInfo[], colored?: boolean): string {
    releases = releases.filter(release => !!release.deps);

    if (!releases.length) {
      return this.buildFoundString(releases);
    }

    const joinedReleases = this.buildRawTables(releases, colored)
      .map(table => createTable(table))
      .join('\n');

    return `${joinedReleases}\n${this.buildFoundString(releases)}`;
  }

  private formatReleases(releases: RawReleaseInfo[], colored?: boolean): string {
    if (!releases.length) {
      return this.buildFoundString(releases);
    }

    const joinedReleases = this.buildRawTables(releases, colored)
      .map(table => createTable(table))
      .join('\n');

    return `${joinedReleases}\n${this.buildFoundString(releases)}`;
  }

  private async getVersions(key: 'electron' | keyof RawDeps, inputVersion: string): Promise<string[]> {
    const satisfiesVersion = (dependencyVersion: string, inputVersion: string) => {
      const dependencyVersionClean = semver.clean(dependencyVersion, {includePrerelease: true, loose: true}) || '';
      return semver.satisfies(dependencyVersionClean, inputVersion, {
        includePrerelease: true,
        loose: true,
      });
    };

    let dependencyVersions: string[] = [];
    let releases = await this.getAllReleases();

    if (!this.options.electronPrereleases) {
      releases = releases.filter(release => semver.prerelease(release.version) === null);
    }

    dependencyVersions = releases
      .filter(release => {
        if (!this.options.electronPrereleases && semver.prerelease(release.version) === null) {
          return false;
        }

        if (key !== 'electron' && !Boolean(release.deps)) {
          return false;
        }

        if (inputVersion === 'all') {
          return true;
        }

        if (key === 'electron' && release.npm_dist_tags && release.npm_dist_tags.includes(inputVersion)) {
          return true;
        }

        return key === 'electron'
          ? satisfiesVersion(release.version, inputVersion)
          : satisfiesVersion(release.deps![key], inputVersion);
      })
      .map(release => (key === 'electron' ? release.version : release.deps![key]));

    if (this.options.limit) {
      dependencyVersions = dependencyVersions.slice(0, this.options.limit);
    }

    return dependencyVersions;
  }
}
