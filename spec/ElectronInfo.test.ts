import * as fs from 'fs-extra';
import * as nock from 'nock';
import * as path from 'path';

import {ElectronInfo} from '../src';

const tempDir = path.resolve(__dirname, '.temp');
const mockUrl = 'https://example.com';
const fixturesDir = path.resolve(__dirname, 'fixtures');

describe('ElectronInfo', () => {
  beforeAll(async () => {
    await fs.ensureDir(tempDir);

    const releases = await fs.readFile(path.join(fixturesDir, 'electron-releases-full.json'), 'utf8');

    nock(mockUrl)
      .get('/')
      .reply(() => releases);
  });

  afterAll(() => fs.remove(tempDir));

  afterEach(() => nock.cleanAll());

  describe('getElectronReleases', () => {
    it('Parses Electron versions', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getElectronReleases('5.0.8');

      expect(result.length).toBe(1);
      expect(result[0].version).toBe('5.0.8');
    });

    it('Parses Electron SemVer', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getElectronReleases('^5');

      expect(result.length).toBe(27);
    });
  });

  describe('getDependencyReleases', () => {
    it('Parses Chrome versions', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getDependencyReleases('chrome', '71.0.3578.98');

      expect(result.length).toBe(2);
      expect(result[0].deps).toBeDefined();
      expect(result[0].deps!.chrome).toBe('71.0.3578.98');
    });

    it('Parses Chrome SemVer', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getDependencyReleases('chrome', '~66');

      expect(result.length).toBe(55);
    });
  });
});
