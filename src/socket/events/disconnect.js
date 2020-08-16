import * as servStore from '../store/index.js';
import winston from '../../../config/winston';

export const disconnect = (socket) => {
    const store = servStore.globalStore;
    
    // Find passed user in usersCurrent
    let disconnectedUser = store.usersCurrent.findIndex(currentUser => currentUser.socketID.indexOf(socket.id) >= 0);

    if (disconnectedUser >= 0) {
        if (store.usersCurrent[disconnectedUser].amount > 1) {
            let socketIndex = store.usersCurrent[disconnectedUser].socketID.findIndex(currentSocketID => currentSocketID === socket.id);

            store.usersCurrent[disconnectedUser].amount -= 1;
            store.usersCurrent[disconnectedUser].socketID.splice(socketIndex, 1); 
        } else {
            winston.info(`Room Disconnection - ${store.usersCurrent[disconnectedUser]['display_name']}`);
            store.usersCurrent.splice(disconnectedUser); 
        }
    }

}