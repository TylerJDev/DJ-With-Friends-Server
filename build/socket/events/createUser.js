'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createUser = undefined;

var _index = require('../store/index.js');

var servStore = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var createUser = exports.createUser = function createUser(user, socket, io) {
    var store = servStore.globalStore;
    if (store.usersCurrent.filter(function (c) {
        return c.id === user.id;
    }).length === 0) {
        user.amount = 1;

        store.usersCurrent.push(user);
        store.usersCurrent[store.usersCurrent.findIndex(function (findUser) {
            return findUser.id === user.id;
        })].socketID = [];
        console.log('User: ' + user.display_name + ' has joined!'); // eslint-disable-line
    } else {
        // Find the amount of instances of current user
        var amountInstance = store.usersCurrent.findIndex(function (findUser) {
            return findUser.id === user.id;
        });
        if (amountInstance >= 0 && store.usersCurrent[amountInstance].amount >= 1) {
            store.usersCurrent[amountInstance].amount += 1;
        }

        console.log('User count ' + store.usersCurrent[amountInstance].amount + ', @' + store.usersCurrent[amountInstance].display_name); // eslint-disable-line
    }

    store.usersCurrent[store.usersCurrent.findIndex(function (findUser) {
        return findUser.id === user.id;
    })].socketID.push(socket.id);
};