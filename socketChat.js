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


// Escuchamos el evento connection
io.on('connection', (socket) => {
  
    console.log('Usuario conectado');
    
    // // Escuchamos el evento disconnect
    socket.on('disconnect', () => {
      console.log('Usuario desconectado');
    });
  
    // // Escuchamos el evento chat message
    socket.on('message', (msg) => {
      io.emit('message', msg);
      console.log(msg);   
    });   
  
    socket.on('movil', (msg) => {
      io.broadcast.emit('movil', msg);
      console.log(msg);   
    }); 
    socket.on('notmovil', (msg) => {
      io.broadcast.emit('notmovil', msg);
      console.log(msg);   
    }); 
  });

const port = 4000;
server.listen(port, () => {
    // console.log(server);
    console.log('Servidor funcionando en el puerto 3000');
});