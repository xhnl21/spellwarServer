let app = require('express')();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
      // origin: ['http://localhost:8100', 'http://localhost:5173', 'http://192.168.31.79:5173'], // Lista de orígenes permitidos
      // origin: 'http://192.168.31.79:5173',
      origin: (origin, callback) => {
          // Permitir cualquier IP que comience con 192 y cualquier puerto
          const regex = /^http:\/\/192\.(\d{1,3})\.(\d{1,3})\.(\d{1,3}):\d+$/;
          if (regex.test(origin) || origin === undefined) {
              callback(null, true); // Permitir el origen
          } else {
              callback(new Error('No permitido por CORS')); // Denegar el origen
          }
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: true
    }
});
let disconnectAll = false;
const players = {};
// Escuchamos el evento connection
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);
    // Desconectar a todos los sockets si disconnectAll es verdadero
    if (disconnectAll) {
        console.log('Desconectando a todos los jugadores...');
        io.sockets.sockets.forEach((s) => {
            s.disconnect(true); // Desconectar cada socket
        });
    }

    socket.on('createConnection', function (req) {
      msj(true, 3, '============== connection start ==================');
      // console.log(req.act.userId);
      let userId = parseInt(req.act.userId);
      let o = {};
      if (userId !== '' && userId > 0) {
        players[socket.id] = { id: socket.id };
        o = { status: true, message: 'Conexión exitosa', socketId: socket.id, userId:userId }
        msj(true, 1, o);
      } else {
        o = { status: false, message: 'el userId no puede ser "null" o "0"', socketId: socket.id, userId:userId }
        msj(true, 2, o);
      }
      socket.emit('createConnectionClient', o);
      if (!o.status) {
        socket.disconnect();
        msj(true, 2, o);
      }
      msj(true, 3, '============== connection end ==================');
    });
      
    // // Escuchamos el evento chat message
    socket.on('message', (msg) => {
      io.emit('message', msg);
      console.log(msg);   
    });   
  
    socket.on('disparar', (msg) => {
      msj(true, 3, '============== disparar start ==================');
      io.emit('disparar', msg);
      msj(true, 4, msg);
      // socket.broadcast.emit('disparar', msg);
      // console.log(msg);   
      msj(true, 3, '============== disparar start ==================');
    }); 
    socket.on('move', (msg) => {
      // io.emit('move', msg);
      socket.broadcast.emit('move', msg);
      // console.log(msg);   
    }); 

      // Escuchamos el evento chat message
    socket.on('player', (msg) => {
      msj(true, 3, '============== player start ==================');
      // io.emit('player', msg);
      socket.broadcast.emit('player', msg);
      // msj(true, 4, msg);
      msj(true, 3, '============== player end ==================');
    }); 

    // // Escuchamos el evento disconnect
    socket.on('disconnect', () => {
      console.log('Usuario desconectado');
      delete players[socket.id];
      socket.disconnect();
    });
  });

const port = 3000;
server.listen(port, () => {
    // console.log(server);
    console.log('Servidor funcionando en el puerto 3000');
});

function msj (bool, type, data) {
  let stype = 'void:'
  if (type === 1) {
    stype = 'succes:';
  } if (type === 2) {
    stype = 'error:';
  } if (type === 3) {
    stype = 'msj:';
  }
  if (bool) {
    console.log(stype, data);
  } else {
    console.error(stype, data);
  }
}