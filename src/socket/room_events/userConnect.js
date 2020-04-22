import { globalStore } from '../store/index.js';
import { userHosts } from './userHosts.js';

export const userConnect = (data, id, currentUser, usersRoom, lobby, newRoom, host, socketID) => {
    class User {
        constructor(name, id, userCount, accessToken, devices, timeJoined, roomID, host, mainDevice, premium, hostMode, image) {
            this.name = name;
            this.id = id;
            this.userCount = userCount;
            this.accessToken = accessToken;
            this.devices = devices;
            this.timeJoined = timeJoined;
            this.roomID = roomID;
            this.host = host;
            this.mainDevice = mainDevice;
            this.premium = premium;
            this.hostMode = hostMode
            this.image = image
        }
    }

    let userImage = false;

    try {
        const TEMP_IMAGES = JSON.parse(data.images);
        if (TEMP_IMAGES.length && TEMP_IMAGES[0].hasOwnProperty('url')) {
            // Confirm URL is valid
            if (TEMP_IMAGES[0].url.indexOf('https://profile-images.scdn.co/images/userprofile/default/') === 0) {
                let TEMP_ID = TEMP_IMAGES[0].url.replace('https://profile-images.scdn.co/images/userprofile/default/', '');

                // Replace all non-alphanumeric characters
                TEMP_ID = TEMP_ID.replace(/[\W_]/g, '')

                if (TEMP_ID.length === 40) {
                    userImage = {'imageURL': `https://profile-images.scdn.co/images/userprofile/default/${TEMP_ID}`, 'imageID': TEMP_ID};
                }
            }
        }
    } catch (e) {
        userImage = '';
    }
    
    const user = new User(data.display_name, data.id, 1, data.access_token, JSON.parse(data.devices), Date.now(), id, data.id === host, data.mainDevice, data.premium, data.hostMode, userImage);

    if (usersRoom[id] === undefined) {
        usersRoom[id] = [];
    }
    
    let usersPreExist = usersRoom[id].find(curr => curr.id === data.id);
    currentUser.active = user;

    let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);  
    if (usersPreExist === undefined) {
        usersRoom[id].push(user);

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
                globalStore.rooms[currentRoom].trackHosts = new Set();
                globalStore.rooms[currentRoom].pauseList = new Set();
                globalStore.rooms[currentRoom].hostSocketID = socketID;
                globalStore.rooms[currentRoom].noHost = false;
                globalStore.rooms[currentRoom].playData = {};
            }

            if (user.host === true) {
                userHosts({'active': user, 'host': true});

                if (user.premium === 'false') {
                    globalStore.rooms[currentRoom].noHost = true;
                }
            } else if (user.host !== true && user.hostMode === true) {
                userHosts({'active': user, 'host': true});
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