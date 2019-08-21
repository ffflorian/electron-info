import axios from 'axios';
import Chalk from 'chalk';
import * as fs from 'fs';
import * as logdown from 'logdown';
import * as moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import {table as createTable} from 'table';
import * as url from 'url';
import {inspect} from 'util';

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
  /** Enable debug logging. Default: `false`. */
  debug?: boolean;
  /** If Electron prereleases should be included. Default: `true`. */
  electronPrereleases?: boolean;
  /** Force downloading the latest release file. Default: `false`. */
  forceUpdate?: boolean;
  /** Limit output of releases. Everything below 1 will be treated as no limit. Default: 0. */
  limit?: number;
  /** Can be a URL or a local path. Default: https://unpkg.com/electron-releases@latest/lite.json. */
  releasesUrl?: string;
  /**
   * Use a custom temporary directory. If not defined, the system's temporary directory will be used.
   */
  tempDirectory?: string;
}

const {bold} = Chalk;
const {promises: fsAsync} = fs;

const defaultOptions: Required<Options> = {
  debug: false,
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
  private readonly logger: logdown.Logger;
  private readonly options: Required<Options>;

  constructor(options?: Options) {
    this.options = {...defaultOptions, ...options};
    this.options.limit = Math.max(0, this.options.limit);
    this.logger = logdown('electron-info/ElectronInfo', {
      logger: console,
      markdown: false,
    });
    if (this.options.debug) {
      this.logger.state.isEnabled = true;
    }
    this.logger.log('Initialized', this.options);
  }

  async getAllReleases(formatted?: false): Promise<RawReleaseInfo[]>;
  async getAllReleases(formatted: true, colored?: boolean): Promise<string>;
  async getAllReleases(formatted?: boolean, colored?: boolean): Promise<RawReleaseInfo[] | string> {
    this.logger.log('Getting all releases:', {colored, formatted});
    const allReleases = await this.getReleases();
    const limitedReleases = this.limitReleases(allReleases, this.options.limit);
    return formatted ? this.formatReleases(limitedReleases, colored) : limitedReleases;
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
    this.logger.log('Getting dependency releases:', {colored, dependency, formatted, version});
    const allReleases = await this.getReleases();
    const dependencyVersions = await this.getVersions(allReleases, dependency, version);
    const filteredReleases = allReleases.filter(
      release => release.deps && dependencyVersions.includes(release.deps[dependency])
    );

    const limitedReleases = this.limitReleases(filteredReleases, this.options.limit);
    return formatted ? this.formatDependencyReleases(limitedReleases, colored) : limitedReleases;
  }

  async getElectronReleases(version: string, formatted?: false): Promise<RawReleaseInfo[]>;
  async getElectronReleases(version: string, formatted: true, colored?: boolean): Promise<string>;
  async getElectronReleases(
    version: string,
    formatted?: boolean,
    colored?: boolean
  ): Promise<RawReleaseInfo[] | string> {
    this.logger.log('Getting Electron releases:', {colored, formatted, version});

    const allReleases = await this.getReleases();
    const electronVersions = await this.getVersions(allReleases, 'electron', version);
    const filteredReleases = allReleases.filter(release => electronVersions.includes(release.version));

    const limitedReleases = this.limitReleases(filteredReleases, this.options.limit);
    return formatted ? this.formatReleases(limitedReleases, colored) : limitedReleases;
  }

  private buildFoundString(releases: RawReleaseInfo[]): string {
    this.logger.log('Building found string:', {releasesLength: releases.length});
    return `Found ${releases.length} release${releases.length === 1 ? '' : 's'}.`;
  }

  private buildRawTables(releases: RawReleaseInfo[], colored?: boolean): string[][][] {
    this.logger.log('Building raw tables:', {releasesLength: releases.length, colored});
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
      this.logger.log('Creating new temp directory');
      this.options.tempDirectory = await fsAsync.mkdtemp(path.join(os.tmpdir(), 'electron-info-'));
      this.logger.log('Created temp directory:', {tempDirectory: this.options.tempDirectory});
    }

    return this.options.tempDirectory;
  }

  private async downloadReleasesFile(downloadUrl: string, targetFile: string): Promise<RawReleaseInfo[]> {
    this.logger.log('Downloading releases file:', {downloadUrl, targetFile});
    const {data: releases} = await axios.get<RawReleaseInfo[]>(downloadUrl);

    this.logger.info(
      '[downloadReleasesFile] Received data from server:',
      `${inspect(releases, {breakLength: Infinity, sorted: true})
        .toString()
        .slice(0, 40)}...`
    );
    if (!Array.isArray(releases)) {
      throw new Error('Invalid data received from server');
    }

    await fsAsync.writeFile(targetFile, JSON.stringify(releases));
    return releases;
  }

  private async fileIsReadable(filePath: string): Promise<boolean> {
    try {
      await fsAsync.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch (error) {
      this.logger.log('File is not readable:', {errorMessage: error.message});
      return false;
    }
  }

  private formatDependencyReleases(releases: RawReleaseInfo[], colored?: boolean): string {
    this.logger.log('Formatting dependency releases:', {colored, releasesLength: releases.length});
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
    this.logger.log('Formatting releases:', {colored, releasesLength: releases.length});
    if (!releases.length) {
      return this.buildFoundString(releases);
    }

    const joinedReleases = this.buildRawTables(releases, colored)
      .map(table => createTable(table))
      .join('\n');

    return `${joinedReleases}\n${this.buildFoundString(releases)}`;
  }

  private async getReleases(): Promise<RawReleaseInfo[]> {
    this.logger.log('Parsing releases URL', {releasesUrl: this.options.releasesUrl});
    const parsedUrl = url.parse(this.options.releasesUrl, false);
    if (!parsedUrl.href) {
      throw new Error('Invalid releases URL provided');
    }

    if (!parsedUrl.href.startsWith('localhost') && !parsedUrl.protocol) {
      this.logger.log('Releases URL points to a local file:', {releasesUrl: this.options.releasesUrl});
      return this.loadReleasesFile(path.resolve(this.options.releasesUrl));
    }

    const tempDirectory = await this.createTempDir();
    const tempFile = path.join(tempDirectory, 'latest.json');

    if ((await this.fileIsReadable(tempFile)) && !this.options.forceUpdate) {
      this.logger.log('Found a local copy of the releases file:', {tempFile});
      return this.loadReleasesFile(tempFile);
    }

    return this.downloadReleasesFile(this.options.releasesUrl, tempFile);
  }

  private async getVersions(
    releases: RawReleaseInfo[],
    key: 'electron' | keyof RawDeps,
    inputVersion: string
  ): Promise<string[]> {
    this.logger.log('Getting versions:', {inputVersion, key});
    const satisfiesVersion = (dependencyVersion: string, inputVersion: string) => {
      const dependencyVersionClean = semver.clean(dependencyVersion, {includePrerelease: true, loose: true}) || '';
      return semver.satisfies(dependencyVersionClean, inputVersion, {
        includePrerelease: true,
        loose: true,
      });
    };

    let dependencyVersions: string[] = [];

    if (!this.options.electronPrereleases) {
      this.logger.log('Removing electron prereleases from found versions');
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

    return dependencyVersions;
  }

  private limitReleases(releases: RawReleaseInfo[], limit?: number): RawReleaseInfo[] {
    if (limit) {
      const slicedArray = releases.slice(0, limit);
      this.logger.log('Limiting found versions', {
        after: slicedArray.length,
        before: releases.length,
        limit,
      });
      return slicedArray;
    }
    return releases;
  }

  private async loadReleasesFile(localPath: string): Promise<RawReleaseInfo[]> {
    this.logger.log('Loading local releases file:', {localPath});
    const rawData = await fsAsync.readFile(localPath, 'utf8');
    return JSON.parse(rawData);
  }
}
