import * as nock from 'nock';

import {HTTPService} from '../src/HTTPService';

const mockUrl = 'http://example.com';

describe('HTTPService', () => {
  const httpService = new HTTPService({
    debug: false,
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
        await httpService.downloadReleasesFile(mockUrl, '');
        fail('Should throw on timeout');
      } catch (error) {}
    });
  });
});
