import omit from 'lodash/omit';
import { createLogger } from './utils';

/* eslint-disable import/prefer-default-export */

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property
export const dedupeUpdate = (db) => (params, callback) => {
  const log = createLogger('dedupUpdate');
  validateFunction(db, 'update');
  let { UpdateExpression } = params;
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  } = params;

  if (process.env.AWS_REGION && UpdateExpression && ExpressionAttributeNames && ExpressionAttributeValues) {
    log.info('Adorning global table v2 dedupe attribute');
    const attrName = 'aws:rep:updateregion';
    const alphaNum = (str) => str.replace(/[^a-zA-Z0-9]/g, '');
    UpdateExpression += `, #${alphaNum(attrName)} = :${alphaNum(attrName)}`;
    ExpressionAttributeNames[`#${alphaNum(attrName)}`] = attrName;
    ExpressionAttributeValues[`:${alphaNum(attrName)}`] = process.env.AWS_REGION;

    params = {
      ...omit(params, [
        'UpdateExpression',
        'ExpressionAttributeNames',
        'ExpressionAttributeValues',
      ]),
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };
  } else {
    log.info('Not adorning global tatble v2 dedupe attribute; Not all conditions satisfied.');
  }

  return db.update(params, callback);
};

const validateFunction = (db, funcName) => {
  if (!(db && typeof db[funcName] === 'function')) throw new Error('db.update is not a function. Make sure you pass in a DynamoDB.DocumentClient');
};
