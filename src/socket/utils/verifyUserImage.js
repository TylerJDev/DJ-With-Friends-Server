/**
 * Verifies that the image comes from spotify
 * Tries to ensure that no "bad" image data is sent back to front end
 * @param {object} images - Object that contains user images that will be displayed 
 */

export const verifyUserImage = (images) => {
    let userImage = '';

    // REFACTOR: Do we need the try ... catch here?
    try {
        const TEMP_IMAGES = JSON.parse(images);
        if (TEMP_IMAGES.length && TEMP_IMAGES[0].hasOwnProperty('url')) {
            // Confirm URL is valid
            if (TEMP_IMAGES[0].url.indexOf('https://profile-images.scdn.co/images/userprofile/default/') === 0) {
                let TEMP_ID = TEMP_IMAGES[0].url.replace('https://profile-images.scdn.co/images/userprofile/default/', '');

                // Replace all non-alphanumeric characters
                TEMP_ID = TEMP_ID.replace(/[\W_]/g, '');

                if (TEMP_ID.length === 40) {
                    userImage = {'imageURL': `https://profile-images.scdn.co/images/userprofile/default/${TEMP_ID}`, 'imageID': TEMP_ID};
                }
            }
        }
    } catch (e) {
        userImage = '';
    }


    return userImage; 
}