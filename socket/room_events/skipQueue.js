import { playTrack, pauseTrack } from './addQueue.js';
import { globalStore } from '../store/index.js';

export const skipQueue = (rooms, currentUser, newRoom) => {
    let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
    const skipTrack = () => {
        globalStore.rooms[currentRoom].queue.splice(0, 1);

        newRoom.emit('trackSkipped', {'message': `Track has been successfully skipped!`, 'timeAgo': Date.now()});
        clearSkipQueue(globalStore, currentRoom, newRoom);
        playTrack(globalStore.rooms[currentRoom].queue[0], currentUser, globalStore.rooms[currentRoom].host, newRoom, true);
        
        pauseTrack(globalStore.rooms[currentRoom].users.filter(curr => curr.id === globalStore.rooms[currentRoom].host)[0].access_token);
    }

    // If there are no tracks in the queue
    if (!globalStore.rooms[currentRoom].queue.length) {
        newRoom.emit('trackSkipped', {'error': 'No tracks in queue currently!'});
    }

    // Check if current user is the host
    if (currentUser.currentHost === true) {
        if (globalStore.rooms[currentRoom].queue.length) {
            skipTrack();
        } else {
            console.log('Uh oh, this was hit?!');
        }
    } else {
        // Add to room "skip" vote
        globalStore.rooms[currentRoom].skipCount.add(currentUser.active.id);

        console.log(`Voted to skip! Votes must reach at least ${Math.ceil(globalStore.rooms[currentRoom].users.length * 0.66)} to be skipped!`);

        // Emit to room
        newRoom.emit('votedSkip', {'currentVotes': globalStore.rooms[currentRoom].skipCount, 'neededVotes': Math.ceil(globalStore.rooms[currentRoom].users.length * 0.66)});

        // Vote must reach at least 66% of total users in room to be skipped
        if (globalStore.rooms[currentRoom].skipCount.size >= Math.ceil(globalStore.rooms[currentRoom].users.length * 0.66)) {
            skipTrack();
        }
    }
};

export const clearSkipQueue = (globalStore, currentRoom, newRoom) => {
    if (globalStore.rooms[currentRoom] !== undefined) {
        globalStore.rooms[currentRoom].skipCount.clear();
        newRoom.emit('votedSkip', {'currentVotes': 0, 'neededVotes': ''});
    }
}