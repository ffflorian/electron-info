import * as fs from 'fs-extra';
import * as nock from 'nock';
import * as path from 'path';
import * as uuid from 'uuid';

import {ElectronInfo, RawReleaseInfo} from '../src';

const tempDir = path.resolve(__dirname, '.temp');
const mockUrl = 'http://example.com';
const invalidUrl = 'http://invalid.com';
const fixturesDir = path.resolve(__dirname, 'fixtures');
const fullReleasesFile = path.join(fixturesDir, 'electron-releases-full.json');

const createRandomBody = (): RawReleaseInfo[] => [
  {
    node_id: uuid.v4(),
    tag_name: 'v8.0.0-nightly.20190820',
    name: 'electron v8.0.0-nightly.20190820',
    prerelease: true,
    published_at: '2019-08-20T23:37:57Z',
    version: '8.0.0-nightly.20190820',
    npm_dist_tags: [],
    total_downloads: 6,
  },
];

const provideReleaseFile = async () => {
  await fs.remove(tempDir);
  await fs.copy(fullReleasesFile, path.join(tempDir, 'latest.json'));
};

describe('ElectronInfo', () => {
  let releases: string;

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
    releases = await fs.readFile(fullReleasesFile, 'utf8');
  });

  beforeEach(() =>
    nock(mockUrl)
      .get('/')
      .reply(() => releases)
  );

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

      expect(result.length).toBe(29);
    });

    it('Parses dist tags', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getElectronReleases('5-0-x');

      expect(result.length).toBe(1);
    });

    it('Returns nothing for invalid versions', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getElectronReleases('invalid');

      expect(result.length).toBe(0);
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

      expect(result.length).toBe(56);
    });

    it('Returns nothing for invalid versions', async () => {
      const result = await new ElectronInfo({
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getDependencyReleases('chrome', 'invalid');

      expect(result.length).toBe(0);
    });

    it('Limits releases', async () => {
      const limit = 2;

      const result = await new ElectronInfo({
        limit,
        releasesUrl: mockUrl,
        tempDirectory: tempDir,
      }).getDependencyReleases('chrome', 'all');

      expect(result.length).toBe(limit);
    });

    it('Uses a local copy of the releases', async () => {
      nock(invalidUrl)
        .get('/')
        .reply(404);

      await provideReleaseFile();

      await new ElectronInfo({
        releasesUrl: invalidUrl,
        tempDirectory: tempDir,
      }).getDependencyReleases('chrome', 'all');
    });

    it('Forces downloading the release file', async () => {
      const customBody = createRandomBody();
      const customUrl = 'http://custom.com';

      await provideReleaseFile();

      nock(customUrl)
        .get('/')
        .reply(() => customBody);

      const result = await new ElectronInfo({
        forceUpdate: true,
        releasesUrl: customUrl,
        tempDirectory: tempDir,
      }).getElectronReleases('all');

      expect(result).toEqual(customBody);
    });
  });
});
