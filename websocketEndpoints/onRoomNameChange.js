const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
let apiGatewayManagment = undefined;
let sendMessage = undefined;

exports.handler = (event, context, callback) => {
  initApiManagment(event);
  const { connectionId } = event.requestContext;
  const payload = JSON.parse(event.body).data;
  const displayName = payload.displayName || "";
  const roomName = payload.roomName || "";
  const newRoomName = payload.newRoomName || "";

  updateUsers(displayName, roomName, newRoomName, connectionId);

  callback(null, { statusCode: 200 });
};

function initApiManagment(event) {
  apiGatewayManagment = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint:
      event.requestContext.domainName + "/" + event.requestContext.stage,
  });

  sendMessage = async (connectionId, data) => {
    await apiGatewayManagment
      .postToConnection({ ConnectionId: connectionId, Data: data })
      .promise();
  };
}

function getOnlineUsers(roomName) {
  return ddb.scan({ TableName: "injoyOnlineUsers" }).promise();
}

function updateUsers(displayName, roomName, newRoomName, connectionId) {
  getOnlineUsers().then((data) => {
    var onlineUsers = data.Items;

    var onlineUsersOnRoom = onlineUsers.filter((x) => x.roomName === roomName);

    for (let i = 0; i < onlineUsersOnRoom.length; i++) {
      var params = {
        TableName: "injoyOnlineUsers",
        Key: {
          connectionid: onlineUsersOnRoom[i].connectionid,
        },
        UpdateExpression: "set roomAlias=:r",
        ExpressionAttributeValues: {
          ":r": newRoomName,
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

        sendMessage(
          onlineUsersOnRoom[i].connectionid,
          JSON.stringify({ displayName, newRoomName })
        );
      });
    }
  });
}
