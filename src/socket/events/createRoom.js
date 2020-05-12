import { globalStore } from '../store/index.js';
import {
    randomIDGen,
    randomAlphaGen
} from '../utils/generateRoomID.js';
import bcrypt from 'bcryptjs';
import { socketRoom } from '../socket_room.js';
import winston from '../../../config/winston';


export const createRoom = (data, socket, lobby, io, socketID) => {
    const randID = randomIDGen(globalStore.rooms.map((cID) => cID.name));
    const findExistingRooms = globalStore.rooms.filter((curr) => curr.id === data.id);

    if (findExistingRooms.length) {
        socket.emit('roomError', {
            typeError: 'Max rooms exceeded', errorMessage: 'You\'ve exceeded the max amount of rooms created!'
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
            typeError: 'Room Character Limit',
            errorMessage: 'Room Name must be a minimum length of 3 characters!',
            elementError: '{id: "room-name"}',
        });
        return false;
    }

    // Name equals the ID of the room
    data.name = randID;

    let serverID = randomAlphaGen();

    // Ensure no other room has the serverID
    let idMatches = globalStore.rooms.filter(current => current.server_id === serverID);

    if (idMatches.length) {
        serverID += idMatches.length;
    }

    data.server_id = randomAlphaGen();

    // Host of the current room
    const host = data.id;
    const addToRooms = (hash = null) => {
        data.users = [];
        if (data.settings.hasOwnProperty('password')) {
            data.password = {
                hash: hash
            }
            delete data.settings.password;
        }
        
        // Add current time to room data object
        data.timeCreated = new Date().getTime();

        globalStore.rooms.push(data);

        socket.emit('serverCreated', {
            roomData: globalStore.rooms,
            roomID: randID,
            host: host,
            passwordProtected: data.settings.hasOwnProperty('password')
        });
        
        winston.info(`Room Creation - ${randID}`);
        lobby.emit('servers', globalStore.rooms);
    }

    if (data.settings.hasOwnProperty('password')) {
        // Hash password
        bcrypt.hash(data.settings['password'], 10, function (err, hash) {
            addToRooms(hash);
            socketRoom(io, randID, globalStore.rooms, host, lobby, socketID);
        });
    } else {
        addToRooms();
        socketRoom(io, randID, globalStore.rooms, host, lobby, socketID);
    }
}