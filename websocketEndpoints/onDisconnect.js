const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const { connectionId } = event.requestContext;
  deleteOnlineUser(connectionId);
  callback(null, { statusCode: 200 });
};

function deleteOnlineUser(connectionId) {
  return ddb
    .delete({
      TableName: "injoyOnlineUsers",
      Key: { connectionid: connectionId },
    })
    .promise();
}
