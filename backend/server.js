require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Ensure the 'uploads' directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir)); // Serve static files from 'uploads' directory

// Set up file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
});

// Define schemas and models
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const messageSchema = new mongoose.Schema({
  user: String,
  message: String,
  file: String,      // Path to the uploaded file
  fileType: String,  // Type of the uploaded file (e.g., image, video)
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// API routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.send({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ username }, process.env.SECRET_KEY);
    res.send({ token });
  } else {
    res.status(401).send({ message: 'Invalid credentials' });
  }
});

// Handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }
  res.send({ filePath: req.file.path, fileType: req.file.mimetype });
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
  console.log('a user connected');

  // Send all previous messages to the newly connected user
  Message.find().then((messages) => {
    socket.emit('init', messages);
  });

  // Handle receiving a message (text or file)
  socket.on('message', async (msg) => {
    const message = new Message({
      user: msg.user,
      message: msg.message,
      file: msg.file,         // Path to the uploaded file
      fileType: msg.fileType  // Type of the uploaded file
    });
    await message.save();  // Save the message to the database
    io.emit('message', message);  // Broadcast the message to all users
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
