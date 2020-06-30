const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
let apiGatewayManagment = undefined;
let sendMessage = undefined;

exports.handler = (event, context, callback) => {
  initApiGatewayManagment();
  const { connectionId } = event.requestContext;
  const payload = JSON.parse(event.body).data;
  const id = payload.id || "";
  const displayName = payload.displayName || "";
  const roomName = payload.roomName || "";
  const message = payload.message || "";

  sendMessageToOnlineUsers(id, displayName, roomName, connectionId, message);

  callback(null, { statusCode: 200 });
};

function initApiGatewayManagment() {
  apiGatewayManagment = new AWS.ApiGatewayManagementApi({
    region: "us-east-1",
    apiVersion: "2018-11-29",
    endpoint: "18b0p3qzk7.execute-api.us-east-1.amazonaws.com/beta",
  });

  sendMessage = (connectionId, data) => {
    return apiGatewayManagment
      .postToConnection({ ConnectionId: connectionId, Data: data })
      .promise();
  };
}

function getOnlineUsers() {
  return ddb.scan({ TableName: "injoyOnlineUsers" }).promise();
}

function sendMessageToOnlineUsers(
  id,
  displayName,
  roomName,
  connectionId,
  message
) {
  getOnlineUsers().then((data) => {
    const onlineUsers = data.Items;
    const myIndexOnOnlineUsers = onlineUsers.findIndex(
      (x) => x.connectionid === connectionId
    );
    const onlineUsersOnRoom = onlineUsers.filter(
      (x) => x.roomName === onlineUsers[myIndexOnOnlineUsers].roomName
    );

    for (var i = 0; i < onlineUsersOnRoom.length; i++) {
      sendMessage(
        onlineUsers[i].connectionid,
        JSON.stringify({ id, displayName, roomName, message })
      );
    }
  });
}
