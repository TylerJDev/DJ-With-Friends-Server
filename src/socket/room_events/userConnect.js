import { globalStore } from '../store/index.js';
import { userHosts } from './userHosts.js';
import * as admin from 'firebase-admin';
import { verifyUserImage } from '../utils/verifyUserImage.js';

export const userConnect = async (data, id, currentUser, usersRoom, lobby, newRoom, host, socketID, docID, roomRef, db) => {
    const user = {
        userCount: 1,
        timeJoined: Date.now(),
        roomID: id, // TODO: number?
        host: data.id === host, // REFACTOR: Use data from firestore, not passed
        mainDevice: data.mainDevice, // TODO: Find a standard, either "_" or camelCase
        hostMode: data.hostMode,
        image: null,
    }

    let usersPreExist = true;
    
    if (typeof data.uid === 'string' && data.uid.length) { // TODO: check if there's standard length for uid
        db.collection('users').doc(data.uid).get().then(async (docData) => {
            user.accessToken = String(docData.data().accessToken);
            user.devices = JSON.parse(docData.data().devices);
            user.name = String(docData.data().displayName);
            user.premium = docData.data().premium;
            user.id = String(docData.data().spotifyUserID);
            user.uid = String(data.uid);
            // user.topTracks = data.topTracks; TODO: Add this 
            user.image = verifyUserImage(data.images);
        })
        .then(handleUserData)
        .then(async () => {
            const emitUserConnect = () => { 
                const emitData = {'messageData': {'message': 'User Joined', 'type': 'info', 'name': user.name, 'timeJoined': Date.now()}, 'users': usersRoom[id]}
                newRoom.emit('user', emitData);
                //REFACTOR: newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);
            }
        
            const userDataHolder =  roomRef.collection('roomUsers').doc('activeUsers');
            
            if (!usersPreExist) {
                await userDataHolder.update({
                    users: admin.firestore.FieldValue.arrayUnion({uid: user.uid, accessToken: user.accessToken, premium: user.premium, mainDevice: user.mainDevice}),
                }).then(emitUserConnect);
            } else {
                emitUserConnect();
            }
        })
    }

    // REFACTOR: Can we move this somewhere else?
    function handleUserData() {
        if (usersRoom[id] === undefined) {
            usersRoom[id] = [];
        }
        
        usersPreExist = usersRoom[id].find(curr => curr.id === data.id);
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
    }
}

