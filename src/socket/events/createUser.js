import * as servStore from '../store/index.js';

export const createUser = (user, socket, io) => {
    const store = servStore.globalStore;
    if (store.usersCurrent.filter(c => c.id === user.id).length === 0) {
        user.amount = 1;

        store.usersCurrent.push(user); 
        store.usersCurrent[store.usersCurrent.findIndex(findUser => findUser.id === user.id)].socketID = []
    } else {
        // Find the amount of instances of current user
        const amountInstance = store.usersCurrent.findIndex(findUser => findUser.id === user.id)
        if (amountInstance >= 0 && store.usersCurrent[amountInstance].amount >= 1) {
            store.usersCurrent[amountInstance].amount += 1;
        }
    }

    store.usersCurrent[store.usersCurrent.findIndex(findUser => findUser.id === user.id)].socketID.push(socket.id);
}
