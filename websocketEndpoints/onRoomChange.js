const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda({ region: "us-east-1" });

exports.handler = (event, context, callback) => {
  const { connectionId } = event.requestContext;
  const payload = JSON.parse(event.body).data;
  const id = payload.id || "";
  const displayName = payload.displayName || "";
  const roomName = payload.roomName || "";

  if (id) updateMyInfo(id, displayName, roomName, connectionId, event);

  callback(null, { statusCode: 200 });
};

function updateMyInfo(id, displayName, roomName, connectionId, event) {
  var params = {
    TableName: "injoyOnlineUsers",
    Key: {
      connectionid: connectionId,
    },
    UpdateExpression: "set id=:i, displayName =:d, roomName=:r",
    ExpressionAttributeValues: {
      ":i": id,
      ":d": displayName,
      ":r": roomName,
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
      // if entering in a room
      if (roomName) {
        updateUsers(id, roomName, connectionId, event);
      } else {
        sendUpdatesToOnlineUsers(event);
      }
    }
  });
}

function getUsers() {
  return ddb.scan({ TableName: "injoyUsers" }).promise();
}

function getOnlineUsers() {
  return ddb.scan({ TableName: "injoyOnlineUsers" }).promise();
}

function updateUsers(id, roomName, connectionId, event) {
  getUsers().then((data) => {
    var users = data.Items;
    var myIndexOnUsers = users.findIndex((x) => x.id === id);

    getOnlineUsers().then((data) => {
      var onlineUsers = data.Items;

      var usersOnMyRoom = onlineUsers.filter((x) => x.roomName === roomName);

      for (let i = 0; i < usersOnMyRoom.length; i++) {
        var userOnRoomIndexOnUsers = users.findIndex(
          (x) => x.id === usersOnMyRoom[i].id
        );

        let userOnRoomFriends = users[userOnRoomIndexOnUsers].friends || [];

        for (let j = 0; j < usersOnMyRoom.length; j++) {
          if (i != j) {
            var myIndexOnUser = userOnRoomFriends.findIndex(
              (x) => x === usersOnMyRoom[j].id
            );
            if (myIndexOnUser < 0) {
              userOnRoomFriends.push(usersOnMyRoom[j].id);
            }
          }
        }

        // if ((!users[userOnRoomIndexOnUsers].friends &&  userOnRoomFriends.length > 0) || (users[userOnRoomIndexOnUsers].friends && users[userOnRoomIndexOnUsers].friends.length < userOnRoomFriends.length)) {

        var params = {
          TableName: "injoyUsers",
          Key: {
            id: usersOnMyRoom[i].id,
          },
          UpdateExpression: "set friends=:f",
          ExpressionAttributeValues: {
            ":f": userOnRoomFriends,
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
        // }
      }
      sendUpdatesToOnlineUsers(event);
    });
  });
}

function sendUpdatesToOnlineUsers(event) {
  lambda.invoke(
    {
      FunctionName: "injoyWebsocket_updateOnlineUsers",
      InvocationType: "Event",
      Payload: JSON.stringify(event, null, 2),
    },
    function (error, data) {
      if (error) {
        context.done("error", error);
      }
      if (data.Payload) {
        context.succeed(data.Payload);
      }
    }
  );
}
