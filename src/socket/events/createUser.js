import * as servStore from '../store/index.js';

export const createUser = (user, socket, io) => {
    const store = servStore.globalStore;
    if (store.usersCurrent.filter(c => c.id === user.id).length === 0) {
        user.amount = 1;

        store.usersCurrent.push(user); 
        store.usersCurrent[store.usersCurrent.findIndex(findUser => findUser.id === user.id)].socketID = []
        console.log(`User: ${user.display_name} has joined!`); // eslint-disable-line
    } else {
        // Find the amount of instances of current user
        const amountInstance = store.usersCurrent.findIndex(findUser => findUser.id === user.id)
        if (amountInstance >= 0 && store.usersCurrent[amountInstance].amount >= 1) {
            store.usersCurrent[amountInstance].amount += 1;
        }

        console.log(`User count ${store.usersCurrent[amountInstance].amount}, @${store.usersCurrent[amountInstance].display_name}`); // eslint-disable-line
    }

    store.usersCurrent[store.usersCurrent.findIndex(findUser => findUser.id === user.id)].socketID.push(socket.id);
    io.sockets.in(socket.id).emit('testing', {'testing': 'testing'});
    // try {
    //  store.lobby.emit('servers', store.rooms);
    // } catch (e) {
    //     console.log(e);
    // }
}
