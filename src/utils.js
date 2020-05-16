/* eslint-disable import/prefer-default-export */
export const createLogger = (app) => {
  const log = {};
  ['info', 'error', 'debug'].forEach((level) => {
    let loggerPrefix = level;
    if (app) {
      loggerPrefix = `${level}:${app}`;
    }
    // eslint-disable-next-line global-require
    log[level] = require('debug')(loggerPrefix);
    // log[level].log = console.log.bind(console); // send to stdout instead of stderr
  });
  return log;
};
