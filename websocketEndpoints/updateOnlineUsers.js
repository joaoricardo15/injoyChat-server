const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
let apiGatewayManagment = undefined;
let sendMessage = undefined;

exports.handler = (event, context, callback) => {
  const { connectionId } = event.requestContext;
  initApiGatewayManagment();

  sendUpdatesToOnlineUsers(connectionId);

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

function getUsers() {
  return ddb.scan({ TableName: "injoyUsers" }).promise();
}

function getOnlineUsers() {
  return ddb.scan({ TableName: "injoyOnlineUsers" }).promise();
}

function sendUpdatesToOnlineUsers(connectionId) {
  getOnlineUsers().then((data) => {
    var onlineRooms = [];
    var onlineUsers = data.Items;

    let roomAlias = "";
    const userAlreadyOnRoomWithUpdatedRoomNameIndex = onlineUsers.findIndex(
      (x) => x.roomAlias
    );
    if (userAlreadyOnRoomWithUpdatedRoomNameIndex > -1)
      roomAlias =
        onlineUsers[userAlreadyOnRoomWithUpdatedRoomNameIndex].roomAlias;

    for (var i = 0; i < onlineUsers.length; i++) {
      if (onlineUsers[i].roomName && onlineUsers[i].roomName !== "null") {
        var roomIndex = onlineRooms.findIndex(
          (x) => x.roomName === onlineUsers[i].roomName
        );
        if (roomIndex < 0)
          onlineRooms.push({
            roomName: onlineUsers[i].roomName,
            roomAlias: roomAlias,
            users: [
              {
                id: onlineUsers[i].id,
                displayName: onlineUsers[i].displayName,
              },
            ],
          });
        else
          onlineRooms[roomIndex].users.push({
            id: onlineUsers[i].id,
            displayName: onlineUsers[i].displayName,
          });
      }
    }

    getUsers().then((usersData) => {
      var users = usersData.Items;

      for (var j = 0; j < onlineUsers.length; j++) {
        var myIndexOnUsers = users.findIndex((x) => x.id === onlineUsers[j].id);
        let myOnlineFriends = [];
        let myFriendsRooms = [];

        if (users[myIndexOnUsers].friends) {
          myOnlineFriends = onlineUsers.filter((x) =>
            users[myIndexOnUsers].friends.includes(x.id)
          );
          myFriendsRooms = onlineRooms.filter((x) =>
            x.users.some((y) => users[myIndexOnUsers].friends.includes(y.id))
          );
        }

        sendMessage(
          onlineUsers[j].connectionid,
          JSON.stringify({
            onlineUsers: myOnlineFriends,
            onlineRooms: myFriendsRooms,
          })
        ).catch((error) => {
          ddb.delete({
            TableName: "injoyOnlineUsers",
            Key: { connectionid: onlineUsers[j].connectionid },
          });
        });
      }
    });
  });
}
