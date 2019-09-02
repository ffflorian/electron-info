import axios from 'axios';
import * as fs from 'fs';
import * as logdown from 'logdown';
import * as moment from 'moment';
import * as os from 'os';
import parsePath = require('parse-path');
import * as path from 'path';
import {inspect} from 'util';

import {Options, RawReleaseInfo} from './ElectronInfo';

const {promises: fsAsync} = fs;

export class FileService {
  private readonly logger: logdown.Logger;
  private readonly options: Required<Options>;

  constructor(options: Required<Options>) {
    this.options = options;
    this.logger = logdown('electron-info/FileService', {
      logger: console,
      markdown: false,
    });
    if (this.options.debug) {
      this.logger.state.isEnabled = true;
    }
    this.logger.log('Initialized', this.options);
  }

  async getReleases(): Promise<RawReleaseInfo[]> {
    this.logger.log('Parsing releases URL', {releasesUrl: this.options.releasesUrl});
    const parsedUrl = parsePath(this.options.releasesUrl);
    if (!parsedUrl.href) {
      throw new Error('Invalid releases URL provided');
    }

    if (parsedUrl.protocol === 'file') {
      this.logger.log('Releases URL points to a local file:', {releasesUrl: this.options.releasesUrl});
      return this.loadReleasesFile(path.resolve(this.options.releasesUrl));
    }

    this.logger.log('Releases URL points to a URL:', {releasesUrl: this.options.releasesUrl});

    const tempDirectory = await this.createTempDir();
    const tempFile = path.join(tempDirectory, 'latest.json');
    const tempFileExists = await this.isPathReadable(tempFile);

    if (this.options.forceUpdate) {
      this.logger.log(`Force download of the releases file requested`, {
        forceUpdate: this.options.forceUpdate,
        releasesUrl: this.options.releasesUrl,
        tempFile,
      });
      return this.downloadReleasesFile(this.options.releasesUrl, tempFile);
    }

    if (tempFileExists) {
      this.logger.log('Found a local copy of the releases file:', {tempFile});

      const tempFileFromToday = await this.isFileFromToday(tempFile);
      this.logger.log(`Releases file "${tempFile}" is from today:`, tempFileFromToday);

      if (tempFileFromToday) {
        return this.loadReleasesFile(tempFile);
      }
    }

    return this.downloadReleasesFile(this.options.releasesUrl, tempFile);
  }

  private async createTempDir(): Promise<string> {
    const tempDirectory = this.options.tempDirectory || path.join(os.tmpdir(), 'electron-info');
    const tempDirectoryExists = await this.isPathReadable(tempDirectory);

    if (!tempDirectoryExists) {
      this.logger.log('Creating temp directory', {tempDirectory});
      await fsAsync.mkdir(tempDirectory);
    } else {
      this.logger.log('Temp directory exists', {tempDirectory});
    }

    return tempDirectory;
  }

  private async downloadReleasesFile(downloadUrl: string, targetFile: string): Promise<RawReleaseInfo[]> {
    this.logger.log('Downloading releases file:', {downloadUrl, targetFile});
    const {data: releases} = await axios.get<RawReleaseInfo[]>(downloadUrl, {timeout: this.options.timeout});

    this.logger.info(
      'Received data from server:',
      inspect(releases)
        .toString()
        .slice(0, 40),
      '...'
    );

    if (!Array.isArray(releases)) {
      throw new Error('Invalid data received from server');
    }

    await fsAsync.writeFile(targetFile, JSON.stringify(releases));
    return releases;
  }

  private async isFileFromToday(fileName: string): Promise<boolean> {
    const fileStat = await fsAsync.stat(fileName);
    const fileAge = moment(fileStat.mtime);
    this.logger.log(`File "${fileName}" is from "${fileAge.toString()}"`);
    return fileAge.isAfter(moment().subtract(1, 'days')).valueOf();
  }

  private async isPathReadable(filePath: string): Promise<boolean> {
    try {
      await fsAsync.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch (error) {
      this.logger.log('File is not readable:', {errorMessage: error.message});
      return false;
    }
  }

  private async loadReleasesFile(localPath: string): Promise<RawReleaseInfo[]> {
    this.logger.log('Loading local releases file:', {localPath});
    const rawData = await fsAsync.readFile(localPath, 'utf8');
    const releases = JSON.parse(rawData);

    if (!Array.isArray(releases)) {
      throw new Error('Invalid data in releases file');
    }

    return releases;
  }
}
