import { globalStore } from '../store/index.js';
import {db} from '../socket_io';
import winston from 'winston/lib/winston/config';
// import {collections} from '../../../constants';  
import {deleteCollection} from '../../utils/deleteRoomFromFirestore';
import {setTimer} from '../../utils/setTimer';

var collections = ['roomChat', 'roomHistory', 'roomQueue', 'roomUsers'];
export const userDisconnect = (usersRoom, currentUser, newRoom, id, lobby, roomRef, docID) => {
    const deleteRoom = (rooms, currentUserActive, usersRoomActive) => {
        // TEST: Ensure correct room is removed!
        delete usersRoomActive[currentUserActive.roomID];
        const findIndexRoom = rooms.findIndex((curr) => curr.name === currentUserActive.roomID);
        const clonedArr = [];
        
        rooms.splice(findIndexRoom, 1);

        if (globalStore.rooms.length) {
            globalStore.rooms.forEach((curr) => {
                const cloned = {};
                Object.assign(cloned, curr);

                delete cloned.users;
                delete cloned.skipCount;
                delete cloned.timeCounts;
                delete cloned.currentTrack;
                delete cloned.queue;
                delete cloned.trackHosts;
                delete cloned.pauseList;
                delete cloned.hostSocketID;
                delete cloned.noHost;
                delete cloned.playData;

                clonedArr.push(cloned);
            });
        }

        Promise.all(collections.map(async (current) => {
            return deleteCollection(db, `rooms/${docID}/${current}`); // Refactor: Security for docID? Ensure it's correct
        })).then(() => {
            roomRef.delete();
        });

        lobby.emit('servers', clonedArr);
    };

    if (currentUser.active === undefined || usersRoom[currentUser.active.roomID] === undefined) {
        return false;
    }

    // Check how many occurrences of "user"
    const userOccur = usersRoom[currentUser.active.roomID].filter((curr) => curr.id === currentUser.active.id);

    // If the last occurrence of user has left
    if (userOccur[0] !== undefined && userOccur[0].userCount === 1) {
        newRoom.emit('disconnected', currentUser.active.id);

        // Remove user from usersRoom array
        const userIndex = usersRoom[currentUser.active.roomID].findIndex((curr) => curr.id === currentUser.active.id);

        // Remove user from globalStore.rooms array
        const currentRoom = globalStore.rooms.findIndex((curr) => curr.name === currentUser.active.roomID);
        if (globalStore.rooms[currentRoom] !== undefined) {
            // Check if user is room host
            if (currentUser.active.host === true && globalStore.rooms[currentRoom].id === currentUser.active.id && globalStore.rooms[currentRoom].users.length) {
                // If user is room host, ensure very next user becomes host
                let newHost = globalStore.rooms[currentRoom].users.findIndex((currUser) => currUser.id !== currentUser.active.id);

                newHost = newHost > -1 ? globalStore.rooms[currentRoom].users[newHost] : false;
                if (newHost !== false) {
                    globalStore.rooms[currentRoom].token = newHost.accessToken;
                    globalStore.rooms[currentRoom].id = newHost.id;
                    globalStore.rooms[currentRoom].host = newHost.id;
                    globalStore.rooms[currentRoom].display_name = newHost.name;
                    newHost.host = true;
                }
            }

            globalStore.rooms[currentRoom].users.forEach((c, i) => { 
                if (c.id === currentUser.active.id) {
                    globalStore.rooms[currentRoom].users.splice(i, 1);
                }
            });
        }

        if (userIndex > -1) {
            const emitData = { messageData: {message: 'User Left', type: 'info', name: currentUser.active.name, timeJoined: Date.now()}, users: usersRoom[id] };
            usersRoom[currentUser.active.roomID].splice(userIndex, 1);
            newRoom.emit('user', emitData);
        }

        // Check if room is empty
        if (!usersRoom[currentUser.active.roomID].length) {
            // Wait 2 minutes before delete
            setTimer(120000).then(() => {
                if (!usersRoom[currentUser.active.roomID].length) {
                    deleteRoom(globalStore.rooms, currentUser.active, usersRoom);
                }
            });
        }
    } else if (userOccur[0] !== undefined) {
        usersRoom[currentUser.active.roomID].forEach((item, index) => {
            if (item.id === [currentUser.active.id]) {
                usersRoom[currentUser.active.roomID][index].userCount -= 1;
            }
        });
    }
};
