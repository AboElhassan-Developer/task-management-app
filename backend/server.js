require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_secret_key_change_this_in_production';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: false
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB Connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
}

testConnection();

// ============ MIDDLEWARE ============

// Verify JWT Token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ============ AUTHENTICATION ROUTES ============

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [existingUser] = await connection.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await connection.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    connection.release();

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please login.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const connection = await pool.getConnection();

    // Find user
    const [users] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ TASK ROUTES ============

// 1. GET all tasks
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    connection.release();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET single task
app.get('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. CREATE new task
app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?)',
      [req.userId, title, description || '', status || 'pending']
    );
    connection.release();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { id: result.insertId, title, description, status: status || 'pending' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. UPDATE task
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const connection = await pool.getConnection();

    // Check if task exists and belongs to user
    const [check] = await connection.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (check.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Update task
    await connection.query(
      'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ? AND user_id = ?',
      [title || check[0].title, description !== undefined ? description : check[0].description, status || check[0].status, id, req.userId]
    );
    connection.release();

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. DELETE task
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    const [check] = await connection.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (check.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await connection.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    connection.release();

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
