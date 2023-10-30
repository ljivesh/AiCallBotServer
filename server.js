import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import http from 'http';
import {Server} from 'socket.io';

const app = express();
// const server = http.createServer(app); // Create an HTTP server
const socketServer = new Server( {
  cors: true
}); // Create a WebSocket server
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (Make sure you have MongoDB running)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

// Signaling endpoint for WebRTC
app.post('/signal', (req, res) => {
  const { signalData } = req.body;
  const { targetSocketId } = req.body;

  // Send the signaling data to the target user via WebSocket
  socketServer.to(targetSocketId).emit('signal', signalData);

  res.status(200).json({ message: 'Signal sent successfully' });
});



const emailToSocketIdMapping = new Map();
const socketToEmailMapping = new Map();

// WebSocket connection handling
socketServer.on('connection', (socket) => {

  console.log(`New Connection ${socket.id}`);

  socket.on('join-room', data => {

    const {emailId, roomId} = data;
    console.log(`User ${emailId} joined`);
    emailToSocketIdMapping.set(emailId, socket.id);
    socketToEmailMapping.set(socket.id, emailId);
    socket.join(roomId);
    socket.emit('joined-room', {roomId});
    socket.broadcast.to(roomId).emit('user-joined', {emailId});
  });

  socket.on('call-user', data=> {
    const {emailId, offer} = data;
    console.log(`Calling ${emailId}`);

    const fromEmail = socketToEmailMapping.get(socket.id);
    const toSocketId = emailToSocketIdMapping.get(emailId);

    socket.to(toSocketId).emit('incoming-call', {fromEmail, offer});


  });

  socket.on('call-accept', data=> {
    const {fromEmail, answer} = data;

    const socketId = emailToSocketIdMapping.get(fromEmail);
    console.log(`Call accepted`);


    socket.to(socketId).emit('call-accepted', {answer});

  });

});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
socketServer.listen(8001);

