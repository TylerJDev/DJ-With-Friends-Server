import { globalStore } from '../store/index.js';
import { userHosts } from './userHosts.js';
import * as admin from 'firebase-admin';
import { verifyUserImage } from '../utils/verifyUserImage.js';
import { startFromPosition } from '../../utils/startFromPosition';
import { exportCurrentTrack } from '../../utils/exportCurrentTrack';
import { checkRoomFull } from '../../utils/checkRoomFull';

export const userConnect = async (data, id, currentUser, usersRoom, lobby, newRoom, host, socketID, docID, roomRef, db, currentRoom, socket) => {
    const user = {
        userCount: 1,
        timeJoined: Date.now(),
        roomID: id, // TODO: number?
        host: data.id === host, // REFACTOR: Use data from firestore, not passed
        mainDevice: data.mainDevice, // TODO: Find a standard, either "_" or camelCase
        hostMode: data.hostMode,
        image: null,
        userID: data.userID,
    }

    if (checkRoomFull(currentRoom, data)) {
        socket.disconnect();
        return;
    }

    let accessToken = '';
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

            accessToken = docData.data().accessToken;
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
                    users: admin.firestore.FieldValue.arrayUnion(
                        db.collection('users').doc(data.uid)
                        ),
                }).then(emitUserConnect);
            } else {
                emitUserConnect();
            }
        }).then(() => {
            /* We should set the user's player to the current position of the current playing -
            track, if one is playing. */
            let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
            currentRoom = globalStore.rooms[currentRoom];
            if (currentRoom.currentTrack.currentPlaying) {
                if (currentRoom.currentTrack.hasOwnProperty('queue') && accessToken) {
                    const {queue, trackData, trackURI, startedAt} = currentRoom.currentTrack;

                    startFromPosition(accessToken, user.mainDevice, (Date.now() - startedAt), trackURI);

                    newRoom.emit('addedQueue', {queueData: [...queue], userID: user.userID});
                    newRoom.emit('currentTrack', {...exportCurrentTrack(trackData, queue), userID: user.userID});
                    newRoom.emit('timeUpdate', {seconds: Math.floor((Date.now() - startedAt) / 1000), userID: user.userID}); 
                }
            }
        })
    }

    // REFACTOR: Can we move this somewhere else?
    function handleUserData() {
        if (usersRoom[id] === undefined) {
            usersRoom[id] = [];
        }
        
        usersPreExist = usersRoom[id].find(curr => (curr.uid === data.uid || curr.id == data.userID));
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
                    globalStore.rooms[currentRoom].accessStore = {};
                    globalStore.rooms[currentRoom].skipped = false;
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
                if ((item.uid === data.uid || item.id == data.userID)) {
                    usersRoom[id][index].userCount += 1;
                }
            });
        }
    }
}

