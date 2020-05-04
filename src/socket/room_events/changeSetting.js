import winston from 'winston/lib/winston/config';
import { globalStore } from '../store/index';

const changeSetting = (currentUser, data) => {
    const currentRoom = globalStore.rooms.findIndex((curr) => curr.name === currentUser.active.roomID);
    switch (data.type) {
        case 'devices':
            currentUser.active.mainDevice = data.mainDevice;
            break;
        default:
            winston.info(`changeSetting - Not a valid type ${data.type}`);
    }

    globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
        if (current.user.accessToken === currentUser.active.accessToken) {
            current.deviceID = data.mainDevice;
        }
    });
};

export default changeSetting;
