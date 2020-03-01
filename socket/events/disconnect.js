import * as servStore from '../store/index.js';

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
            console.log(`${store.usersCurrent[disconnectedUser]['display_name']} has left!`); // eslint-disable-line
            store.usersCurrent.splice(disconnectedUser); 
        }
    }

}