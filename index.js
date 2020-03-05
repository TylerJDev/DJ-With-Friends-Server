require('dotenv').config('./env');
const buildType = process.env.NODE_ENV === 'development' ? 'src' : 'build';

var express = require('express');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require(`./${buildType}/routes`);

var app = express();
var PORT = process.env.PORT || 3000;
var server = app.listen(PORT);
var io = require('socket.io')(server);
var socketFunc = require(`./${buildType}/socket/socket_io.js`);

var currentUserID = '';

app.use(express.static(__dirname))
   .use(cors())
   .use(cookieParser())
   .use(bodyParser.json())
   .use('/', routes);

socketFunc.runSocket(server, io, currentUserID);