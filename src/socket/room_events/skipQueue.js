import { playTrack, pauseTrack, setTrackTime } from './addQueue.js';
import { globalStore } from '../store/index.js';

const skipTrack = ({currentUser, newRoom, currentRoom} = {}) => {
    newRoom.emit('trackSkipped', {'message': `Track has been successfully skipped!`, 'timeAgo': Date.now()});
    clearSkipQueue(globalStore, currentRoom, newRoom);
    globalStore.rooms[currentRoom].skipped = true;
}

export const skipQueue = (rooms, currentUser, newRoom) => {
    const currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
    const config = {
        currentUser: currentUser,
        newRoom: newRoom,
        currentRoom: currentRoom,
    }

    // If there are no tracks in the queue
    if (!globalStore.rooms[currentRoom].currentTrack.currentPlaying) {
        newRoom.emit('trackSkipped', {'error': 'No tracks in queue currently!'});
    }

    // Check if current user is the host
    if (currentUser.currentHost === true) {
        if (globalStore.rooms[currentRoom].queue.length) {
            skipTrack(config);
        } else {
            console.error('[skipQueue.js] An error has occurred! Couldn\'t skip track!');
        }
    } else {
        // Add to room "skip" vote
        globalStore.rooms[currentRoom].skipCount.add(currentUser.active.id);

        console.log(`Voted to skip! Votes must reach at least ${Math.ceil(globalStore.rooms[currentRoom].users.length * 0.66)} to be skipped!`);
        console.log(globalStore.rooms[currentRoom].skipCount);

        // Emit to room
        newRoom.emit('votedSkip', {'currentVotes': globalStore.rooms[currentRoom].skipCount.size, 'neededVotes': Math.ceil(globalStore.rooms[currentRoom].users.length * 0.66)});

        // Vote must reach at least 66% of total users in room to be skipped
        if (globalStore.rooms[currentRoom].skipCount.size >= Math.ceil(globalStore.rooms[currentRoom].users.length * 0.66)) {
            skipTrack(config);
        }
    }
};

export const clearSkipQueue = (globalStore, currentRoom, newRoom) => {
    if (globalStore.rooms[currentRoom] !== undefined) {
        globalStore.rooms[currentRoom].skipCount.clear();
        newRoom.emit('votedSkip', {'currentVotes': 0, 'neededVotes': ''});
    }
}