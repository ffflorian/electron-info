import * as nock from 'nock';

import {FileService} from '../src/FileService';

const mockUrl = 'http://example.com';

describe('FileService', () => {
  const fileService = new FileService({
    debug: false,
    electronPrereleases: false,
    forceUpdate: false,
    limit: 0,
    releasesUrl: mockUrl,
    tempDirectory: '',
    timeout: 500,
  });

  beforeEach(() =>
    nock(mockUrl)
      .get('/')
      .delayBody(5000)
      .reply(200, [{data: 'invalid'}])
  );

  afterEach(() => nock.cleanAll());

  describe('downloadReleasesFile', () => {
    it('honors a custom timeout', async () => {
      try {
        await fileService['downloadReleasesFile'](mockUrl, '');
        fail('Should throw on timeout');
      } catch (error) {}
    });
  });
});
