[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/tveal/dynamodb-gtv2-dedupe) 

# dynamodb-gtv2-dedupe

A deduplication tool for DynamoDB global tables v2

## Background

**Global Tables v1**
([2017.11.29](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_HowItWorks.html))
- Adorns items written to tables with additional attributes:
    - aws:rep:deleting
    - aws:rep:updatetime
    - aws:rep:updateregion
- You can programmatically ignore events caused from other region(s) so
  you avoid processing duplicates based on the adorned _aws:rep:updateregion_
  attribute
- Since AWS adorns your items after you write, this creates a duplicate write to
  the record just for the addition of the aws:rep fields
- **Summary**: 2 ways to get duplicates
    1. Replication from other region(s)
    2. Items adorned by AWS with aws:rep attributes

**Global Tables v2**
([2019.11.21](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html))
- Does NOT adorn items with additional attributes
- You must handle regional tagging yourself
- No duplicates from AWS-updated items (the no-dupes fix in v2)
- **Summary**: 1 way to get duplicates
    1. Replication from other region(s)

This package provides a way to save your records to DynamoDB with
_aws:rep:updateregion_ so that conditional logic you have/write can still work
with both v1 and v2.

Where you might originally use:
```js
dynamodbDocumentClient.udpate(params);
```

With this package, you would use something like:
```js
dedupeUpdate(dynamodbDocumentClient)(params);
```

Given your params have the required update expression properties, this will
adorn the _aws:rep:udpateregion_ attribute to the params before passing to your
dynamodb document client. This is different than v1 in that it adorns the field
before the save in your application, not after.

### Functions

Function            | Applicable props in params
--------------------|---------------------------
dedupeUpdate        | UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues
dedupeBatchWrite    | PutRequest Item
dedupeTransactWrite | Put Item, Update Expressions
dedupePut           | Put Item

## Sample Usage

```js
const { DynamoDB } = require('aws-sdk');
const { dedupeUpdate } = require('dynamodb-gtv2-dedupe');

const main = async () => {
    const ddb = new DynamoDB.DocumentClient({
        httpOptions: { timeout: 1500 },
        logger: { log: (msg) => console.log(msg) },
        convertEmptyValues: true,
    })
    
    const params = {
        TableName: 'test-db-table-name',
        Keys: ['HashKey', 'SortKey'],
        ReturnValues: 'ALL_NEW',
        UpdateExpression: 'SET #field1 = :field1',
        ExpressionAttributeNames: {
            '#field1': 'message',
        },
        ExpressionAttributeValues: {
            ':field1': 'Aloha Honua!',
        },
    };

    const response = await dedupeUpdate(ddb)(params);
    // when this saves, your item will have the added attribute
    // aws:rep:updateregion set to the process.env.AWS_REGION
};

main();
```

For more examples on using the functions in this package, check out the code on
GitHub, specifically the unit tests.

For params help see the AWS JavaScript SDK for DynamoDB.DocumentClient
- [update](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property)
- [batchWrite](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property)
- [transactWrite](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#transactWrite-property)
- [put](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property)