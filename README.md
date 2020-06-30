# websocket Api endpoints:

- onConnect:
  - update my info on table 'injoyOnlineUser';
  - delete all connections with same id as mine on table 'injoyOnlineUsers';
  - update my info on table 'injoyUsers';
  
- onDisconnect:
  - delete my connection on table 'injoyOnlineUsers';
  
- updateOnlineUsers:
  - send arrays of onlineRooms and onlineFriends to all users on table 'injoyOnlineUsers';
  
- onRoomChange:
  - update my info on table 'injoyOnlineUser';
  - update all users on room's friends property on table 'injoyUsers';
  - call endpoint 'updateOnlineUsers';
  
- onRoomNameChange:
  - update all users on room's roomAlias property on table 'injoyOnlineUsers';
  - send updated room name to all users on room on table 'injoyOnlineUsers';
  
- onMessage:
  - send message to all users on room on table 'injoyOnlineUsers';
  
- onRandomRoom:
  - update my ramdomRoom property on table 'injoyOnlineUsers';
  - send random room name to matched users on table 'injoyOnlineUsers';
