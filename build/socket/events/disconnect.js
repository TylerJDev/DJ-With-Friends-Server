'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.disconnect = undefined;

var _index = require('../store/index.js');

var servStore = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var disconnect = exports.disconnect = function disconnect(socket) {
    var store = servStore.globalStore;

    // Find passed user in usersCurrent
    var disconnectedUser = store.usersCurrent.findIndex(function (currentUser) {
        return currentUser.socketID.indexOf(socket.id) >= 0;
    });

    if (disconnectedUser >= 0) {
        if (store.usersCurrent[disconnectedUser].amount > 1) {
            var socketIndex = store.usersCurrent[disconnectedUser].socketID.findIndex(function (currentSocketID) {
                return currentSocketID === socket.id;
            });

            store.usersCurrent[disconnectedUser].amount -= 1;
            store.usersCurrent[disconnectedUser].socketID.splice(socketIndex, 1);
        } else {
            console.log(store.usersCurrent[disconnectedUser]['display_name'] + ' has left!'); // eslint-disable-line
            store.usersCurrent.splice(disconnectedUser);
        }
    }
};