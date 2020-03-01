import { globalStore } from '../store/index.js';

export const userConnect = (data, id, currentUser, usersRoom, lobby, newRoom, host) => {
    class User {
        constructor(name, id, userCount, accessToken, devices, timeJoined, roomID, host, mainDevice) {
            this.name = name;
            this.id = id;
            this.userCount = userCount;
            this.accessToken = accessToken;
            this.devices = devices;
            this.timeJoined = timeJoined;
            this.roomID = roomID;
            this.host = host;
            this.mainDevice = mainDevice;
        }
    }

    const user = new User(data.display_name, data.id, 1, data.access_token, JSON.parse(data.devices), Date.now(), id, data.id === host, data.mainDevice);

    if (usersRoom[id] === undefined) {
        usersRoom[id] = [];
    }
    
    let usersPreExist = usersRoom[id].find(curr => curr.id === data.id);
    currentUser.active = user;

    let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);  
    if (usersPreExist === undefined) {
        usersRoom[id].push(user);

        // Update lobby
        //lobby.emit('updateLobby', globalStore.rooms);
        // Add user to "globalStore.rooms.user" array
        if (globalStore.rooms[currentRoom] !== undefined) {
            if (globalStore.rooms[currentRoom].hasOwnProperty('users') === false) {
                globalStore.rooms[currentRoom].users = [];
            }

            globalStore.rooms[currentRoom].users.push(user);
            // Add queue to room if not current
            if (globalStore.rooms[currentRoom].hasOwnProperty('queue') === false) {
                globalStore.rooms[currentRoom].queue = [];
                globalStore.rooms[currentRoom].history = [];
                globalStore.rooms[currentRoom].skipCount = new Set();
                globalStore.rooms[currentRoom].currentTrack = {'track': '', 'currentPlaying': false, 'artist': ''};
                globalStore.rooms[currentRoom].host = host;
                globalStore.rooms[currentRoom].timeCounts = [];
            }
        }
    } else {
        // Add instance count to user object
        usersRoom[id].forEach((item, index) => {
            if (item.id === data.id) {
                usersRoom[id][index].userCount += 1;
            }
        });
    }   

    const emitData = {'messageData': {'message': 'User Joined', 'type': 'info', 'name': user.name, 'timeJoined': Date.now()}, 'users': usersRoom[id]}
    newRoom.emit('user', emitData);
    newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);
}