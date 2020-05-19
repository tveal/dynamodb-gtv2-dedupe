import get from 'lodash/get';

export { createLogger } from './utils';

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property
export const dedupeUpdate = (db) => (params, callback) => {
  validateFunction(db, 'update');

  modifyUpdateExpections(params);

  if (params.AttributeUpdates) {
    params.AttributeUpdates['aws:rep:updateregion'] = {
      Action: 'PUT',
      Value: process.env.AWS_REGION,
    };
  }

  if (callback) {
    return db.update(params, callback);
  } else {
    return db.update(params);
  }
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

  Object.keys(RequestItems)
    .map((table) => ({
      table,
      actions: RequestItems[table],
    }))
    .map((uow) => uow.actions.forEach((action) => {
      if (action.PutRequest) action.PutRequest.Item['aws:rep:updateregion'] = process.env.AWS_REGION;
    }));

  if (callback) {
    return db.batchWrite(params, callback);
  } else {
    return db.batchWrite(params);
  }
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#transactWrite-property
export const dedupeTransactWrite = (db) => (params, callback) => {
  validateFunction(db, 'transactWrite');
  const TransactItems = get(params, 'TransactItems', []);

  TransactItems.forEach((action) => {
    const putItem = get(action, 'Put.Item');
    if (putItem) {
      putItem['aws:rep:updateregion'] = process.env.AWS_REGION;
    } else if (action.Update) {
      modifyUpdateExpections(action.Update);
    }
  });

  if (callback) {
    return db.transactWrite(params, callback);
  } else {
    return db.transactWrite(params);
  }
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
export const dedupePut = (db) => (params, callback) => {
  validateFunction(db, 'put');
  if (params.Item) {
    params.Item['aws:rep:updateregion'] = process.env.AWS_REGION;
  }

  if (callback) {
    return db.put(params, callback);
  } else {
    return db.put(params);
  }
};

const validateFunction = (db, funcName) => {
  if (!(db && typeof db[funcName] === 'function')) throw new Error(`db.${funcName} is not a function. Make sure you pass in a DynamoDB.DocumentClient`);
};
