import 'mocha';
import { DynamoDB } from 'aws-sdk';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { dedupeUpdate } from '../../src';

const AWS = require('aws-sdk-mock');

describe('index.js', () => {
  describe('dedupeUpdate', () => {
    let ddb;
    beforeEach(() => {
      delete process.env.AWS_REGION;
      ddb = new DynamoDB.DocumentClient({
        httpOptions: { timeout: 1500 },
        logger: { log: /* istanbul ignore next */ (msg) => console.log(msg) },
        convertEmptyValues: true,
      });
      AWS.mock('DynamoDB.DocumentClient', 'udpate', (params, cb) => cb(null, params));
    });
    afterEach(() => {
      sinon.restore();
      AWS.restore('DynamoDB.DocumentClient');
    });

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

    it('should call db.update', async () => {
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
});
