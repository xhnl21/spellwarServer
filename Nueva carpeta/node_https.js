var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');
var WebSocketServer = require('socket.io');
var db = require('./db');
const app = express();

// con servicio ssl
var privateKey = fs.readFileSync('/etc/letsencrypt/live/drapshop.com/privkey.pem');
var certificate = fs.readFileSync('/etc/letsencrypt/live/drapshop.com/cert.pem');
var credentials = { key: privateKey, cert: certificate };
var server = https.createServer(credentials, app);
const httpsServer = server.listen(666, {
    pingInterval: 10000,
    pingTimeout: 50000,
});
const io = WebSocketServer(httpsServer);

global.dir = [];
global.onlineUsers = {};
global.debbuger = 'rider_location_changed';
global.debugger_status = 'order_status_change_server';


io.on("connection", (socket) => {
    var userSocket = {};
    socket.on('createConnection', function (req) {
        console.log('============== connection start ==================');
        let userId = parseInt(req.user_id);
        if (userId !== '' && userId > 0) {
            if (typeof onlineUsers[userId] !== 'undefined') {
                let objIndex = onlineUsers[userId].findIndex((obj => obj.deviceId == req.device_id));
                if (objIndex != -1) {
                    onlineUsers[userId][objIndex].socketId = req.socketId;
                    onlineUsers[userId][objIndex].userId = req.user_id;
                    onlineUsers[userId][objIndex].deviceId = req.device_id;
                } else {
                    onlineUsers[userId].push({ "userId": req.user_id, "deviceId": req.device_id, "socketId": req.socketId });
                }
            } else {
                let arr1 = [];
                arr1.push({ "userId": req.user_id, "deviceId": req.device_id, "socketId": req.socketId });
                onlineUsers[userId] = arr1;
            }
            userSocket.userId = req.user_id;
            userSocket.socketId = req.socketId;
            userSocket.device_id = req.device_id;
            console.log("socket.handshake.url:", socket.handshake.url);
            console.log("nuevo socket connectado:", socket.id);
            console.log(onlineUsers);
            let o = { msg: true, message: onlineUsers }
            io.emit('createConnection', o);
        } else {
            let o = { msg: false, message: 'el userId no puede ser null' }
            console.error("error:", o);
            io.emit('createConnection', o);
        }
        console.log('============== connection end ==================');
    });




    socket.on("rider_location_update", (req) => {
        let rider_id = parseInt(req.rider_id);
        let o = ''
        if (rider_id !== '' ) {
            var riderQuery = "SELECT * FROM users WHERE id = " + rider_id + " and role_id = 4 LIMIT 1 ";
            db.query(riderQuery, function (err, result, data) {
                console.log("================rider_location_update start =============");
                if (err !== null) {
                    o = { msg: false, message: err.message }
                    console.error("error:", o);
                    io.emit('rider_location_update', o);
                } else {
                    if (result.length > 0) {
                        let lat = req.lat
                        let lang = req.lang
                        let bearing = req.bearing
                        if (lat !== '' && lang !== '' && bearing !== '') {
                            var updateQuery = "UPDATE locations SET latitude = " + req.lat + ", longitude = " + req.lang + ", bearing = " + req.bearing + " WHERE user_id = " + rider_id;
                            db.query(updateQuery, function (err1, result1, data1) {
                                if (err1) {
                                    o = { msg: false, message: err1.message }
                                    console.error("error:", o);
                                    io.emit('rider_location_update', o);
                                } else {
                                    var orderquery = "SELECT * from orders where rider_id = " + rider_id + " and status IN (4,6,8) LIMIT 1";
                                    db.query(orderquery, function (err2, order, data) {
                                        if (err2) {
                                            o = { msg: false, message: err2.message }
                                            console.error("error:", o);
                                            io.emit('rider_location_update', o);
                                        } else {
                                            if (order.length > 0) {
                                                var uid = order[0].user_id;
                                                if (typeof onlineUsers[uid] !== 'undefined') {
                                                    onlineUsers[uid].forEach(element => {
                                                        o = { msg: true, datas: req }
                                                        io.emit('rider_location_update', o);
                                                        console.log('element.socketId' + element.socketId);
                                                    });
                                                } else {
                                                    o = { msg: false, message: 'no emit to rider', datas: req  }
                                                    console.error("error:", o);
                                                    io.emit('rider_location_update', o);
                                                }
                                            } else {
                                                o = { msg: false, message: "Can't find rider", datas: req}
                                                console.error("error:", o);
                                                io.emit('rider_location_update', o);
                                            }
                                        }
                                    });
                                }
                            });
                        } else {
                            o = { msg: false, message: "[lat, lang, bearing] Can't be null", lat: lat, lang: lang, bearing: bearing }
                            console.error("error:", o);
                            io.emit('rider_location_update', o);
                        }
                    } else {
                        o = { msg: false, message: "Can't find driver" }
                        console.error("error:", o);
                        io.emit('rider_location_update', o);
                    }
                }
                console.log("================rider_location_update end =============");
            });
        } else {
            o = { msg: false, message: "rider_id Can't be null" }
            console.error("error:", o);
            io.emit('rider_location_update', o);
        }
    });


    socket.on('order_status_change_server', function (req) {
        console.log('================= order_status_change start ==============');
        var aReq = JSON.parse(req);
        var emitTo = aReq.emitTo;
        var datas = {};
        datas.eventName = aReq.eventName;
        datas.aOrder = aReq.aOrder;
        datas.message = aReq.msg;
        datas.datas = req;
        if (emitTo !== '' && emitTo > 0) {
            if (typeof onlineUsers[emitTo] !== 'undefined') {
                onlineUsers[emitTo].forEach(element => {
                    io.to(element.socketId).emit('order_status_change', datas);
                });
            }
        } else {
            let o = { msg: false, message: "[emitTo] Can't be null", emitTo: emitTo }
            console.error("error:", o);
            io.emit(debbuger, o);
        }
        console.log('================= order_status_change end ==============');
    });

    socket.on("disconnect", (reason) => {
        console.log(socket.id, "disconnected");
        try {
            console.log('==================disconnect start=' + reason);
            if (typeof onlineUsers[userSocket.userId] !== 'undefined') {
                var objIndex = onlineUsers[userSocket.userId].findIndex((obj => obj.deviceId == userSocket.device_id));
                if (objIndex != -1) {
                    onlineUsers[userSocket.userId].splice(objIndex, 1);
                    // console.log('length='+onlineUsers[userSocket.userId].length);
                    if (onlineUsers[userSocket.userId].length <= 0) {
                        delete onlineUsers[userSocket.userId];
                    }
                }
            }
            // console.log(onlineUsers);
        } catch (err) {
            console.log(err);
            console.log('Error From disconnect: error on disconnect event (user.username undefined)');
        }
        console.log('============== disconnect end==================');
    });



    socket.on('test_server_socket', function () {
        console.log('test: estan conectados');
        socket.emit('test_server_socket', 'test: emitter estas conectado');
    });


    //NOTA recordar implementar factory para los eventos


});


