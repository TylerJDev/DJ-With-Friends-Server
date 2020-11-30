import { generateRandomString } from '../utils/generateRandomString.js';
import * as admin from 'firebase-admin';
import serviceAccount from '../../dj-with-friends-firebase-adminsdk.json';

export const registerNewUser = (req, res) => {
    // Required: Email, Password, displayName
    const reqData = req.body

    const userData = {
        email: reqData.email,
        password: reqData.password,
        displayName: reqData.displayName,
    }

    const alphaNum = RegExp('^[a-zA-Z0-9_]*$', 'g');

    // Ensure all values are present & valid

    let errorCaught = null;

    const userDataValues = Object.values(userData);
    for (let i = 0; i < userDataValues; i++) {
        if (!!userDataValues[i]) {
            errorCaught = Object.keys(userData)[i];
            break;
        }
    }

    if (errorCaught !== null) {
        res.send(JSON.stringify({'error': 'Couldn\'t create user', 'errorMsg': `${errorCaught} is not valid!`}));
        return;
    }

    // We don't have to check the password length, because firebase does that for us
    // We should check the displayName to make sure it's valid

    if ((!userData.displayName.length || userData.displayName.length <= 3)) {
        res.send(JSON.stringify({'error': 'Display name not valid', 'errorMsg': `Display name "${userData.displayName}" is not valid, must be more than 3 characters!`}));
        return;
    }

    if (!alphaNum.test(userData.displayName)) {
        res.send(JSON.stringify({'error': 'Display name invalid characters', 'errorMsg': `Display name "${userData.displayName}" is not valid, must only be alphanumeric characters!`}));
        return;
    }

    admin.auth().createUser({
        email: String(userData.email),
        emailVerified: false,
        password: String(userData.password),
        displayName: String(userData.displayName),
        disabled: false
      })
        .then(function(userRecord) {
          // See the UserRecord reference doc for the contents of userRecord.
          admin.auth().createCustomToken(userRecord.uid).then(function(customToken) {
            res.send(JSON.stringify({...userRecord, token: customToken}));
          }).catch(function(error) {
            // some error
            res.send(JSON.stringify({'error': error, 'errorMsg': 'Error getting token'}));
          });
          return;
        })
        .catch(function(error) {
          res.send(JSON.stringify({'error': error, 'errorMsg': 'Error creating new user'}));
        });
}