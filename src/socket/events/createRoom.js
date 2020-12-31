import bcrypt from 'bcryptjs';
import { globalStore, passwordStore } from '../store/index';
import { randomIDGen, randomAlphaGen } from '../utils/generateRoomID';
import { socketRoom } from '../socket_room';
import winston from '../../../config/winston';
import { genres, rmvSpecialChars } from '../../../constants';

const findIssue = (findExistingRooms, randID, roomSettings) => {
    if (findExistingRooms.length) {
        return ['Max rooms exceeded', `You've exceeded the max amount of rooms created!`];
    } else if (randID.typeError !== undefined) {
        return [randID];
    } else if (roomSettings['room-name'].replace(rmvSpecialChars, '').length < 3) {
        return ['Room Character Limit', 'Room name must be a minimum length of 3 characters!', '{id: "room-name"}'];
    } else if (!roomSettings['room-genre'].length) {
        return ['Room Must Have Genre', 'Room must specify at least 1 genre.', '{id: "room-genre"}']
    }

    return;
}

const emitError = (socket, typeError, errorMsg, elementError) => {
    socket.emit('roomError', {
        typeError: typeError,
        errorMessage: errorMsg,
        elementError: elementError ? elementError : null
    });

    return;
} 

export const createRoom = (data, socket, lobby, io, socketID, db) => {
    const randID = randomIDGen(globalStore.rooms.map((cID) => cID.name));
    const findExistingRooms = globalStore.rooms.filter((curr) => curr.id === data.id);
    const issue = findIssue(findExistingRooms, randID, data.settings);

    if (!!issue) {
        return emitError(socket, ...issue)
    }

    const acceptedGenres = String(data.settings['room-genre']).split(', ').filter((current) => genres.indexOf(current.toLowerCase(current)) >= 0);

    data.settings['room-genre'] = !acceptedGenres.length ? ['all'] : acceptedGenres;
    // Name equals the ID of the room
    data.name = randID;

    let serverID = randomAlphaGen();

    // Ensure no other room has the serverID
    let idMatches = new Set(globalStore.rooms.filter((current) => current.server_id === serverID));
    idMatches = Array.from(idMatches);

    if (idMatches.length) {
        serverID += idMatches.length;
    }

    data.server_id = randomAlphaGen();

    // Host of the current room
    const host = data.id;
    const addToRooms = (hash = null) => {
        data.users = [];

        if (Object.prototype.hasOwnProperty.call(data.settings, 'password') && data.settings.password.length) {
            data.password = { hash };

            passwordStore.roomsPasswords.push({ id: data.id, token: data.token, server_id: data.server_id, password: data.password });
            const passwordIndex = passwordStore.roomsPasswords.findIndex((current) => current.id === data.id);
            if (passwordIndex !== -1) {
                data.psw_index = passwordIndex;
            }

            delete data.settings.password;
            delete data.password;
        }

        // Add current time to room data object
        data.timeCreated = new Date().getTime();

        globalStore.rooms.push(data);

        socket.emit('serverCreated', {
            roomData: globalStore.rooms,
            roomID: randID,
            host,
            passwordProtected: hash !== null,
        });

        winston.info(`Room Creation - ${randID}`);
        lobby.emit('servers', globalStore.rooms);
    };

    (async function() {
        const roomRef = db.collection('rooms').doc(data.settings.docID);
        const roomChat = await roomRef.collection('roomChat').add({roomMessages: []});
        const roomHistory = await roomRef.collection('roomHistory').add({history: []});
        const roomUsers = await roomRef.collection('roomUsers').doc('activeUsers').set({users: []});
        const roomQueue = await roomRef.collection('roomQueue').doc('currentQueue').set({queue: []});
        const roomSelf = await roomRef.set({
            roomID: data.name,
            roomLimit: data.settings['user-limit_'],
            roomSocketID: socketID,
            currentTrack: null,
        }, {merge: true}).then(() => {
            if (Object.prototype.hasOwnProperty.call(data.settings, 'password') && data.settings.password.length) {
                if (data.settings.password.length < 4 || data.settings.password.length > 30) {
                    socket.emit('roomError', {
                        typeError: 'Password length is not proper!',
                        errorMessage: 'Password must be 4-30 characters',
                        elementError: '{id: "room-password"}',
                    });
                    return false;
                }
                // Hash password via bcrypt => set hash to db, socket
                bcrypt.hash(data.settings.password, 10).then(async (hash) => {
                    await roomRef.set({roomPassword: hash}, {merge: true});
                    addToRooms(hash);
                    socketRoom(io, randID, globalStore.rooms, host, lobby, socketID, roomRef, roomUsers, db, data.settings.docID); // REFACTOR: Could we just export some of these?
                });
            } else { 
                addToRooms();
                socketRoom(io, randID, globalStore.rooms, host, lobby, socketID, roomRef, roomUsers, db, data.settings.docID);
            }
        });
    })();
};
