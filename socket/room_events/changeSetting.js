export const changeSetting = (currentUser, data) => {
    switch(data.type) {
        case 'devices':
            currentUser.active.mainDevice = data.mainDevice;
            break;
    }
}