const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
let apiGatewayManagment = undefined;
let sendMessage = undefined;

exports.handler = (event, context, callback) => {
  initApiGatewayManagment();
  const { connectionId } = event.requestContext;
  const payload = JSON.parse(event.body).data;
  const randomRoomEnable = payload.enable;

  updateMyInfoOnRandomRoomUsers(connectionId, randomRoomEnable);

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

function updateMyInfoOnRandomRoomUsers(connectionId, randomRoomEnable) {
  var params = {
    TableName: "injoyOnlineUsers",
    Key: {
      connectionid: connectionId,
    },
    UpdateExpression: "set randomRoom=:r",
    ExpressionAttributeValues: {
      ":r": randomRoomEnable ? Date.now() : randomRoomEnable,
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
      getMatchRandomPartner(connectionId);
    }
  });
}

function getMatchRandomPartner(connectionId) {
  getOnlineUsers().then((data) => {
    const onlineUsers = data.Items;
    const onlineUsersOnRandomRoom = onlineUsers.filter(
      (x) => x.randomRoom && x.connectionid !== connectionId
    );

    if (onlineUsersOnRandomRoom.length > 0) {
      let firstUserLookingForRandomRoomStartTime =
        onlineUsersOnRandomRoom[0].randomRoom;
      let firstUserLookingForRandomRoomConnectionId =
        onlineUsersOnRandomRoom[0].connectionid;

      for (let i = 1; i < onlineUsersOnRandomRoom.length - 1; i++) {
        let userStartTime = onlineUsersOnRandomRoom[i].randomRoom;
        if (userStartTime < firstUserLookingForRandomRoomStartTime) {
          firstUserLookingForRandomRoomStartTime = userStartTime;
          firstUserLookingForRandomRoomConnectionId =
            onlineUsersOnRandomRoom[i].connectionid;
        }
      }

      const randomRoomName = Math.random().toString(36);

      sendMessage(
        firstUserLookingForRandomRoomConnectionId,
        JSON.stringify({ randomRoomName })
      );

      sendMessage(connectionId, JSON.stringify({ randomRoomName }));
    }
  });
}
