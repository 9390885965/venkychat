import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  IconButton,
  Input,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import UploadIcon from '@mui/icons-material/Upload';

const apiUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const socket = io(apiUrl);

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false); // For handling loading states

  useEffect(() => {
    socket.on('init', (messages) => {
      setMessages(messages);
    });

    socket.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off('init');
      socket.off('message');
    };
  }, []);

  const sendMessage = async () => {
    let filePath = null;
    let fileType = null;

    if (file) {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(`${apiUrl}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        filePath = response.data.filePath;
        fileType = response.data.fileType;
      } catch (err) {
        setError('File upload failed');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    const msg = {
      user: username,
      message,
      file: filePath,
      fileType,
    };

    socket.emit('message', msg);
    setMessage('');
    setFile(null);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${apiUrl}/login`, { username, password });
      if (response.data.token) {
        setIsLoggedIn(true);
        setError('');
      }
    } catch (error) {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${apiUrl}/register`, { username, password });
      if (response.data.message === 'User registered successfully') {
        setIsRegistering(false);
        setError('');
      }
      alert('User registered successfully. Please Login.....');
    } catch (error) {
      setError('Registration failed');
    }
    setLoading(false);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 3 }}>
        {isLoggedIn ? (
          <Box>
            <Box
              sx={{
                maxHeight: '400px',
                overflowY: 'scroll',
                mb: 2,
                border: '1px solid #ccc',
                p: 2,
                borderRadius: 1,
              }}
            >
              {messages.map((msg, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.primary">
                    <strong>{msg.user}:</strong> {msg.message}
                  </Typography>
                  {msg.file && msg.fileType?.startsWith('image/') && (
                    <img
                      src={`${apiUrl}/${msg.file}`}
                      alt="uploaded content"
                      style={{ maxWidth: '100%', marginTop: 8 }}
                    />
                  )}
                  {msg.file && msg.fileType?.startsWith('video/') && (
                    <video controls style={{ width: '100%', marginTop: 8 }}>
                      <source src={`${apiUrl}/${msg.file}`} type={msg.fileType} />
                    </video>
                  )}
                </Box>
              ))}
            </Box>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <TextField
                variant="outlined"
                fullWidth
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mr: 1 }}
              />
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                sx={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input">
                <IconButton color="primary" component="span">
                  <UploadIcon />
                </IconButton>
              </label>
              <Button
                variant="contained"
                color="primary"
                endIcon={<SendIcon />}
                onClick={sendMessage}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Send'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            {isRegistering ? (
              <Box>
                <Typography variant="h5" component="h2">
                  Register
                </Typography>
                <TextField
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>
                <Button
                  variant="text"
                  onClick={() => setIsRegistering(false)}
                  sx={{ mt: 2 }}
                >
                  Back to Login
                </Button>
                {error && <Typography color="error">{error}</Typography>}
              </Box>
            ) : (
              <Box>
                <Typography variant="h5" component="h2">
                  Login
                </Typography>
                <TextField
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
                <Button
                  variant="text"
                  onClick={() => setIsRegistering(true)}
                  sx={{ mt: 2 }}
                >
                  Register
                </Button>
                {error && <Typography color="error">{error}</Typography>}
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );  
}

export default App;