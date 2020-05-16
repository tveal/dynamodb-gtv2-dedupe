import 'mocha';
import { expect } from 'chai';

import { createLogger } from '../../../src/utils';

describe('utils/index.js', () => {
  describe('createLogger', () => {
    it('should create logger with app prefix', () => {
      const log = createLogger('test');

      expect(typeof log.info === 'function').to.be.true;
      expect(typeof log.error === 'function').to.be.true;
      expect(typeof log.debug === 'function').to.be.true;

      expect(log.info.namespace).to.equal('info:test');
      expect(log.error.namespace).to.equal('error:test');
      expect(log.debug.namespace).to.equal('debug:test');
    });

    it('should create logger without app prefix', () => {
      const log = createLogger();

      expect(typeof log.info === 'function').to.be.true;
      expect(typeof log.error === 'function').to.be.true;
      expect(typeof log.debug === 'function').to.be.true;

      expect(log.info.namespace).to.equal('info');
      expect(log.error.namespace).to.equal('error');
      expect(log.debug.namespace).to.equal('debug');
    });
  });
});
