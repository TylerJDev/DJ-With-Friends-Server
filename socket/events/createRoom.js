import { globalStore } from '../store/index.js';
import {
    randomIDGen
} from '../utils/generateRoomID.js';
import bcrypt from 'bcryptjs';
import { socketRoom } from '../socket_room.js';


export const createRoom = (data, socket, lobby, io) => {
    const randID = randomIDGen(globalStore.rooms.map(cID => cID.name));
    const findExistingRooms = globalStore.rooms.filter(curr => curr.id === data.id);

    if (findExistingRooms.length) {
        socket.emit('roomError', {
            'typeError': 'Max rooms exceeded', 'errorMessage': 'You\'ve exceeded the max amount of rooms created!'
        });
        return false;
    }

    if (randID.typeError !== undefined) {
        socket.emit('roomError', randID);
        return false;
    }

    // 1. Check if proper room name`
    if (data.settings['room-name'].replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\\/?]/g, '').length < 3) {
        socket.emit('roomError', {
            'typeError': 'Room Character Limit', 'errorMessage': 'Room Name must be greater than 2 characters!'
        });
        return false;
    }

    // Name equals the ID of the room 
    data.name = randID;

    // Host of the current room
    const host = data.id;
    const addToRooms = (hash = null) => {
        data.users = [];
        if (data.settings.hasOwnProperty('password')) {
            data.password = {
                'hash': hash
            }
            delete data.settings.password;
        }

        globalStore.rooms.push(data);

        socket.emit('serverCreated', {
            'roomData': globalStore.rooms,
            'roomID': randID,
            'host': host,
            'passwordProtected': data.settings.hasOwnProperty('password')
        });
        lobby.emit('servers', globalStore.rooms);
    }

    if (data.settings.hasOwnProperty('password')) {
        // Hash password
        bcrypt.hash(data.settings['password'], 10, function (err, hash) {
            addToRooms(hash);
            socketRoom(io, randID, globalStore.rooms, host, lobby);
        });
    } else {
        addToRooms();
        socketRoom(io, randID, globalStore.rooms, host, lobby);
    }
}