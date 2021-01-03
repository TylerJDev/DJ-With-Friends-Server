import bcrypt from 'bcryptjs';
import { globalStore, passwordStore } from '../store/index';
import winston from '../../../config/winston';
import { checkRoomFull } from '../../utils/checkRoomFull';

export const checkLock = (data, socket) => {
    const currentRoom = globalStore.rooms.findIndex((curr) => String(curr.name) === data.roomID);

    if (data.checkRoom !== undefined && data.checkRoom === true) {
        let roomPrivate = globalStore.rooms.findIndex((current) => current.name == data.roomID);

        try {
            if (globalStore.rooms[currentRoom].psw_index !== undefined) {
                roomPrivate = passwordStore.roomsPasswords[globalStore.rooms[currentRoom].psw_index].password !== undefined;
                socket.emit('lockedStatus', { locked: roomPrivate, paramsTo: data.roomID });
            }
        } catch (e) {
            winston.error(`An error has occurred while checking roomPrivate; ${String(e)}`);
            socket.emit('lockedStatus', { locked: roomPrivate, paramsTo: '/' });
        }
    }

    if (globalStore.rooms[currentRoom] === undefined) {
        winston.info(`Navigation - room ${data.roomID} does not exist`);
        return;
    }

    // Check the current room user limit
    if (checkRoomFull(globalStore.rooms[currentRoom], {uid: data.uid})) {
        socket.emit('lockedStatus', {
            locked: true,
            paramsTo: '/'
        });

        return;
    }

    if (data.password === undefined) {
        if ((passwordStore.roomsPasswords[globalStore.rooms[currentRoom].psw_index] !== undefined && globalStore.rooms[currentRoom].settings['room-private_'] !== false) &&currentRoom > -1 && passwordStore.roomsPasswords[globalStore.rooms[currentRoom].psw_index].password) {
            socket.emit('lockedRoom', {
                passwordProtected: true,
                roomName: globalStore.rooms[currentRoom].settings.room_name,
                token: globalStore.rooms[currentRoom].token,
            });
        } else {
            socket.emit('lockedStatus', {
                locked: false,
                paramsTo: data.roomID,
            });

            return;
        }
    } else {
        bcrypt.compare(data.password, passwordStore.roomsPasswords[globalStore.rooms[currentRoom].psw_index].password.hash, (_err, res) => {
            socket.emit('passwordCheck', JSON.stringify({ result: res, queryHash: passwordStore.roomsPasswords[globalStore.rooms[currentRoom].psw_index].password.hash }));
        });
    }
}