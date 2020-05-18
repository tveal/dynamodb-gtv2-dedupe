import 'mocha';
import { expect } from 'chai';

import {
  dedupeUpdate, dedupeBatchWrite, dedupeTransactWrite, dedupePut,
} from '../../src';

describe('index.js', () => {
  const mockDbFunc = (params, cb) => {
    if (cb) {
      cb(null, params);
    }
    return { params, cb };
  };
  const ddb = {
    update: mockDbFunc,
    batchWrite: mockDbFunc,
    transactWrite: mockDbFunc,
    put: mockDbFunc,
  };
  beforeEach(() => {
    process.env.AWS_REGION = 'us-west-2';
  });
  describe('dedupeUpdate', () => {
    it('should throw error for no db', async () => {
      const params = {
        TableName: 'test-db-table-name',
        Keys: ['hk', 'sk'],
        ReturnValues: 'ALL_NEW',
      };

      let err;
      try {
        await dedupeUpdate(undefined)(params);
      } catch (e) {
        err = e;
      }

      expect(err.message).to.equal('db.update is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should throw error for no db.update', async () => {
      const params = {
        TableName: 'test-db-table-name',
        Keys: ['hk', 'sk'],
        ReturnValues: 'ALL_NEW',
      };

      let err;
      try {
        await dedupeUpdate({})(params);
      } catch (e) {
        err = e;
      }

      expect(err.message).to.equal('db.update is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should call db.update with provided callback', async () => {
      let msg;
      await dedupeUpdate(ddb)({}, (err, res) => {
        msg = 'custom callback';
      });
      expect(msg).to.equal('custom callback');
    });

    it('should call db.update with unmodified params', async () => {
      const params = {
        TableName: 'test-db-table-name',
        Keys: ['hk', 'sk'],
        ReturnValues: 'ALL_NEW',
      };

      const res = await dedupeUpdate(ddb)(params);

      expect(res.params).to.deep.equal(params);
    });

    it('should adorn params with aws:rep:updateregion and call db.update', async () => {
      process.env.AWS_REGION = 'us-east-1';
      const params = {
        TableName: 'test-db-table-name',
        Keys: ['hk', 'sk'],
        ReturnValues: 'ALL_NEW',
        UpdateExpression: 'SET #field1 = :field1',
        ExpressionAttributeNames: {
          '#field1': 'message',
        },
        ExpressionAttributeValues: {
          ':field1': 'Aloha Honua!',
        },
      };

      const res = await dedupeUpdate(ddb)(params);

      expect(res.params).to.deep.equal({
        TableName: 'test-db-table-name',
        Keys: ['hk', 'sk'],
        ReturnValues: 'ALL_NEW',
        UpdateExpression: 'SET #field1 = :field1, #awsrepupdateregion = :awsrepupdateregion',
        ExpressionAttributeNames: {
          '#field1': 'message',
          '#awsrepupdateregion': 'aws:rep:updateregion',
        },
        ExpressionAttributeValues: {
          ':field1': 'Aloha Honua!',
          ':awsrepupdateregion': 'us-east-1',
        },
      });
    });
  });

  describe('dedupeBatchWrite', () => {
    it('should throw error for no db', async () => {
      let err;
      try {
        await dedupeBatchWrite(undefined)({});
      } catch (e) {
        err = e;
      }
      expect(err.message).to.equal('db.batchWrite is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should throw error for no db.writeBatch', async () => {
      let err;
      try {
        await dedupeBatchWrite({})({});
      } catch (e) {
        err = e;
      }
      expect(err.message).to.equal('db.batchWrite is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should call db.batchWrite with provided callback', async () => {
      let msg;
      await dedupeBatchWrite(ddb)({}, (err, res) => {
        msg = 'custom callback';
      });
      expect(msg).to.equal('custom callback');
    });

    it('should call db.batchWrite with unmodified params for missing RequestItems', async () => {
      const params = { Invalid: 'bad params' };

      const res = await dedupeBatchWrite(ddb)(params);

      expect(res.params).to.deep.equal({ Invalid: 'bad params' });
    });

    it('should adorn params with aws:rep:updateregion and call db.batchWrite', async () => {
      process.env.AWS_REGION = 'us-west-2';
      const params = {
        RequestItems: {
          'Table-1': [
            {
              DeleteRequest: {
                Key: { HashKey: 'someKey' },
              },
            },
            {
              PutRequest: {
                Item: {
                  HashKey: 'anotherKey',
                  NumAttribute: 1,
                  BoolAttribute: true,
                  ListAttribute: [1, 'two', false],
                  MapAttribute: { foo: 'bar' },
                },
              },
            },
          ],
        },
      };

      const res = await dedupeBatchWrite(ddb)(params);

      expect(res.params).to.deep.equal({
        RequestItems: {
          'Table-1': [
            {
              DeleteRequest: {
                Key: { HashKey: 'someKey' },
              },
            },
            {
              PutRequest: {
                Item: {
                  'HashKey': 'anotherKey',
                  'NumAttribute': 1,
                  'BoolAttribute': true,
                  'ListAttribute': [1, 'two', false],
                  'MapAttribute': { foo: 'bar' },
                  'aws:rep:updateregion': 'us-west-2',
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('dedupeTransactWrite', () => {
    it('should throw error for no db', async () => {
      let err;
      try {
        await dedupeTransactWrite(undefined)({});
      } catch (e) {
        err = e;
      }
      expect(err.message).to.equal('db.transactWrite is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should throw error for no db.transactWrite', async () => {
      let err;
      try {
        await dedupeTransactWrite({})({});
      } catch (e) {
        err = e;
      }
      expect(err.message).to.equal('db.transactWrite is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should call db.transactWrite with provided callback', async () => {
      let msg;
      await dedupeTransactWrite(ddb)({}, (err, res) => {
        msg = 'custom callback';
      });
      expect(msg).to.equal('custom callback');
    });

    it('should call db.transactWrite with unmodified params for missing TransactItems', async () => {
      const params = { Invalid: 'bad params' };

      const res = await dedupeTransactWrite(ddb)(params);

      expect(res.params).to.deep.equal({ Invalid: 'bad params' });
    });

    it('should adorn params with aws:rep:updateregion and call db.transactWrite', async () => {
      process.env.AWS_REGION = 'us-east-3';
      const params = {
        TransactItems: [{
          Put: {
            TableName: 'Table0',
            Item: {
              HashKey: 'haskey',
              NumAttribute: 1,
              BoolAttribute: true,
              ListAttribute: [1, 'two', false],
              MapAttribute: { foo: 'bar' },
              NullAttribute: null,
            },
          },
        }, {
          Update: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
            UpdateExpression: 'set #a = :x + :y',
            ConditionExpression: '#a < :MAX',
            ExpressionAttributeNames: { '#a': 'Sum' },
            ExpressionAttributeValues: {
              ':x': 20,
              ':y': 45,
              ':MAX': 100,
            },
          },
        }],
      };

      const res = await dedupeTransactWrite(ddb)(params);

      expect(res.params).to.deep.equal({
        TransactItems: [{
          Put: {
            TableName: 'Table0',
            Item: {
              'HashKey': 'haskey',
              'NumAttribute': 1,
              'BoolAttribute': true,
              'ListAttribute': [1, 'two', false],
              'MapAttribute': { foo: 'bar' },
              'NullAttribute': null,
              'aws:rep:updateregion': 'us-east-3',
            },
          },
        }, {
          Update: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
            UpdateExpression: 'set #a = :x + :y, #awsrepupdateregion = :awsrepupdateregion',
            ConditionExpression: '#a < :MAX',
            ExpressionAttributeNames: {
              '#a': 'Sum',
              '#awsrepupdateregion': 'aws:rep:updateregion',
            },
            ExpressionAttributeValues: {
              ':x': 20,
              ':y': 45,
              ':MAX': 100,
              ':awsrepupdateregion': 'us-east-3',
            },
          },
        }],
      });
    });

    it('should adorn params with aws:rep:updateregion and call db.transactWrite for just Put Item', async () => {
      process.env.AWS_REGION = 'us-east-3';
      const params = {
        TransactItems: [{
          Put: {
            TableName: 'Table0',
            Item: {
              HashKey: 'haskey',
              NumAttribute: 1,
              BoolAttribute: true,
              ListAttribute: [1, 'two', false],
              MapAttribute: { foo: 'bar' },
              NullAttribute: null,
            },
          },
        }],
      };

      const res = await dedupeTransactWrite(ddb)(params);

      expect(res.params).to.deep.equal({
        TransactItems: [{
          Put: {
            TableName: 'Table0',
            Item: {
              'HashKey': 'haskey',
              'NumAttribute': 1,
              'BoolAttribute': true,
              'ListAttribute': [1, 'two', false],
              'MapAttribute': { foo: 'bar' },
              'NullAttribute': null,
              'aws:rep:updateregion': 'us-east-3',
            },
          },
        }],
      });
    });

    it('should adorn params with aws:rep:updateregion and call db.transactWrite for just Update expressions', async () => {
      process.env.AWS_REGION = 'us-east-3';
      const params = {
        TransactItems: [{
          Update: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
            UpdateExpression: 'set #a = :x + :y',
            ConditionExpression: '#a < :MAX',
            ExpressionAttributeNames: { '#a': 'Sum' },
            ExpressionAttributeValues: {
              ':x': 20,
              ':y': 45,
              ':MAX': 100,
            },
          },
        }],
      };

      const res = await dedupeTransactWrite(ddb)(params);

      expect(res.params).to.deep.equal({
        TransactItems: [{
          Update: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
            UpdateExpression: 'set #a = :x + :y, #awsrepupdateregion = :awsrepupdateregion',
            ConditionExpression: '#a < :MAX',
            ExpressionAttributeNames: {
              '#a': 'Sum',
              '#awsrepupdateregion': 'aws:rep:updateregion',
            },
            ExpressionAttributeValues: {
              ':x': 20,
              ':y': 45,
              ':MAX': 100,
              ':awsrepupdateregion': 'us-east-3',
            },
          },
        }],
      });
    });

    it('should NOT adorn params with aws:rep:updateregion and call db.transactWrite for missing UpdateExpression', async () => {
      process.env.AWS_REGION = 'us-east-3';
      const params = {
        TransactItems: [{
          Update: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
            // UpdateExpression: 'set #a = :x + :y',
            ConditionExpression: '#a < :MAX',
            ExpressionAttributeNames: { '#a': 'Sum' },
            ExpressionAttributeValues: {
              ':x': 20,
              ':y': 45,
              ':MAX': 100,
            },
          },
        }],
      };

      const res = await dedupeTransactWrite(ddb)(params);

      expect(res.params).to.deep.equal({
        TransactItems: [{
          Update: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
            // UpdateExpression: 'set #a = :x + :y, #awsrepupdateregion = :awsrepupdateregion',
            ConditionExpression: '#a < :MAX',
            ExpressionAttributeNames: {
              '#a': 'Sum',
              // '#awsrepupdateregion': 'aws:rep:updateregion',
            },
            ExpressionAttributeValues: {
              ':x': 20,
              ':y': 45,
              ':MAX': 100,
              // ':awsrepupdateregion': 'us-east-3',
            },
          },
        }],
      });
    });

    it('should call db.transactWrite with unmodified Delete Item', async () => {
      process.env.AWS_REGION = 'us-east-3';
      const params = {
        TransactItems: [{
          Delete: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
          },
        }],
      };

      const res = await dedupeTransactWrite(ddb)(params);

      expect(res.params).to.deep.equal({
        TransactItems: [{
          Delete: {
            TableName: 'Table1',
            Key: { HashKey: 'hashkey' },
          },
        }],
      });
    });
  });

  describe('dedupePut', () => {
    it('should throw error for no db', async () => {
      let err;
      try {
        await dedupePut(undefined)({});
      } catch (e) {
        err = e;
      }
      expect(err.message).to.equal('db.put is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should throw error for no db.put', async () => {
      let err;
      try {
        await dedupePut({})({});
      } catch (e) {
        err = e;
      }
      expect(err.message).to.equal('db.put is not a function. Make sure you pass in a DynamoDB.DocumentClient');
    });

    it('should call db.put with provided callback', async () => {
      let msg;
      await dedupePut(ddb)({}, (err, res) => {
        msg = 'custom callback';
      });
      expect(msg).to.equal('custom callback');
    });

    it('should adorn params with aws:rep:updateregion then call db.put', async () => {
      process.env.AWS_REGION = 'us-west-2';
      const params = {
        TableName: 'Table',
        Item: {
          HashKey: 'haskey',
          NumAttribute: 1,
          BoolAttribute: true,
          ListAttribute: [1, 'two', false],
          MapAttribute: { foo: 'bar' },
          NullAttribute: null,
        },
      };

      const res = await dedupePut(ddb)(params);

      expect(res.params).to.deep.equal({
        TableName: 'Table',
        Item: {
          'HashKey': 'haskey',
          'NumAttribute': 1,
          'BoolAttribute': true,
          'ListAttribute': [1, 'two', false],
          'MapAttribute': { foo: 'bar' },
          'NullAttribute': null,
          'aws:rep:updateregion': 'us-west-2',
        },
      });
    });
  });
});
