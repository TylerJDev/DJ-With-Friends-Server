import { globalStore } from '../store/index.js';

export const userDisconnect = (usersRoom, currentUser, newRoom, id) => {   
    // console.log(usersRoom);
    
    const deleteRoom = (rooms, currentUser, usersRoom) => {
        // TEST: Ensure correct room is removed!
        delete usersRoom[currentUser.roomID];
        let findIndexRoom = rooms.findIndex(curr => curr.name === currentUser.roomID);
        rooms.splice(findIndexRoom, 1);
    }
 
    if (currentUser.active === undefined || usersRoom[currentUser.active.roomID] === undefined) {
        return false;
    }

    // Check how many occurances of "user"
    let userOccur = usersRoom[currentUser.active.roomID].filter(curr => curr.id === currentUser.active.id);

    // If the last occurance of user has left
    if (userOccur[0] !== undefined && userOccur[0].userCount === 1) {
        newRoom.emit('disconnected', currentUser.active.id);

        // Remove user from usersRoom array
        let userIndex = usersRoom[currentUser.active.roomID].findIndex(curr => curr.id === currentUser.active.id);

        // Remove user from globalStore.rooms array
        let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
        if (globalStore.rooms[currentRoom] !== undefined) {
            globalStore.rooms[currentRoom].users.forEach((c, i) => { 
                if (c.id === currentUser.active.id) {
                    globalStore.rooms[currentRoom].users.splice(i, 1);
                }
            });
        }

        if (userIndex > -1 ) {
            const emitData = {'messageData': {'message': 'User Left', 'type': 'info', 'name': currentUser.active.name, 'timeJoined': Date.now()}, 'users': usersRoom[id]}
            usersRoom[currentUser.active.roomID].splice(userIndex, 1);
            newRoom.emit('user', emitData);
        }

        // Check if room is empty
        if (!usersRoom[currentUser.active.roomID].length) {
            deleteRoom(globalStore.rooms, currentUser.active, usersRoom);
        }   
    } else if (userOccur[0] !== undefined) {
        usersRoom[currentUser.active.roomID].forEach((item, index) => {
            if (item.id === [currentUser.active.id]) {
                usersRoom[currentUser.active.roomID][index].userCount -= 1;
            }
        });
    }
};