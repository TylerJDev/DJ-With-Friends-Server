/**
 * Checks if a room is full
 * @param {object} room - The current room the user is in
 * @param {array} user - The user
 */

export const checkRoomFull = (room, user) => {
    const userLimit = room.settings['user-limit_'];
    const users = room.users;
    const isUserInRoom = users.findIndex(curr => (curr.uid === user.uid));

    if (userLimit && (users.length >= userLimit) && isUserInRoom === -1) {
        return true;
    }

    return;
};