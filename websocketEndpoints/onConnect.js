const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const { connectionId } = event.requestContext;
  const id = event.queryStringParameters.id || "";
  const displayName = event.queryStringParameters.displayName || "";

  if (id) updateMyInfo(id, displayName, connectionId);

  callback(null, { statusCode: 200 });
};

function updateMyInfo(id, displayName, connectionId) {
  var params = {
    TableName: "injoyOnlineUsers",
    Key: {
      connectionid: connectionId,
    },
    UpdateExpression: "set id=:i, displayName =:d",
    ExpressionAttributeValues: {
      ":i": id,
      ":d": displayName,
    },
    ReturnValues: "UPDATED_NEW",
  };

  ddb.update(params, function (err, data) {
    if (err) {
      console.error(
        "Unable to update item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
    } else {
      deleteOldConnections(id, connectionId);

      var params = {
        TableName: "injoyUsers",
        Key: {
          id: id,
        },
        UpdateExpression: "set connectionid=:c",
        ExpressionAttributeValues: {
          ":c": connectionId,
        },
        ReturnValues: "UPDATED_NEW",
      };

      ddb.update(params, function (err, data) {
        if (err) {
          console.error(
            "Unable to update item. Error JSON:",
            JSON.stringify(err, null, 2)
          );
        }
      });
    }
  });
}

function getOnlineUsers() {
  return ddb.scan({ TableName: "injoyOnlineUsers" }).promise();
}

function deleteOldConnections(id, connectionId) {
  getOnlineUsers().then((data) => {
    var onlineUsers = data.Items;

    for (var i = 0; i < onlineUsers.length; i++) {
      if (
        onlineUsers[i].id === id &&
        onlineUsers[i].connectionid !== connectionId
      ) {
        ddb
          .delete({
            TableName: "injoyOnlineUsers",
            Key: { connectionid: onlineUsers[i].connectionid },
          })
          .promise();
      }
    }
  });
}
