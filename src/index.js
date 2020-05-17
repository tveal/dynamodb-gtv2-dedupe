import get from 'lodash/get';
import { createLogger } from './utils';

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property
export const dedupeUpdate = (db) => (params, callback) => {
  validateFunction(db, 'update');
  const log = createLogger('dedupUpdate');

  if (process.env.AWS_REGION) {
    modifyUpdateExpections(params);
  } else {
    log.info('Not adorning global tatble v2 dedupe attribute; Not all conditions satisfied.');
  }

  return db.update(params, callback);
};

const modifyUpdateExpections = (params) => {
  if (params.UpdateExpression && params.ExpressionAttributeNames && params.ExpressionAttributeValues) {
    const attrName = 'aws:rep:updateregion';
    const alphaNum = (str) => str.replace(/[^a-zA-Z0-9]/g, '');
    params.UpdateExpression += `, #${alphaNum(attrName)} = :${alphaNum(attrName)}`;
    params.ExpressionAttributeNames[`#${alphaNum(attrName)}`] = attrName;
    params.ExpressionAttributeValues[`:${alphaNum(attrName)}`] = process.env.AWS_REGION;
  }
  return params;
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property
export const dedupeBatchWrite = (db) => (params, callback) => {
  validateFunction(db, 'batchWrite');
  const RequestItems = get(params, 'RequestItems', {});

  if (process.env.AWS_REGION) {
    Object.keys(RequestItems)
      .map((table) => ({
        table,
        actions: RequestItems[table],
      }))
      .map((uow) => uow.actions.forEach((action) => {
        if (action.PutRequest) action.PutRequest.Item['aws:rep:updateregion'] = process.env.AWS_REGION;
      }));
  }

  return db.batchWrite(params, callback);
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#transactWrite-property
export const dedupeTransactWrite = (db) => (params, callback) => {
  validateFunction(db, 'transactWrite');
  const TransactItems = get(params, 'TransactItems', []);
  if (process.env.AWS_REGION) {
    TransactItems.forEach((action) => {
      const putItem = get(action, 'Put.Item');
      if (putItem) {
        putItem['aws:rep:updateregion'] = process.env.AWS_REGION;
      } else if (action.Update) {
        modifyUpdateExpections(action.Update);
      }
    });
  }
  return db.transactWrite(params, callback);
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
export const dedupePut = (db) => (params, callback) => {
  validateFunction(db, 'put');
  if (process.env.AWS_REGION && params.Item) {
    params.Item['aws:rep:updateregion'] = process.env.AWS_REGION;
  }
  return db.put(params, callback);
};

const validateFunction = (db, funcName) => {
  if (!(db && typeof db[funcName] === 'function')) throw new Error(`db.${funcName} is not a function. Make sure you pass in a DynamoDB.DocumentClient`);
};
