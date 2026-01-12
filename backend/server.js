
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

// ============ ROUTES ============

// 1. GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM tasks ORDER BY created_at DESC');
    connection.release();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM tasks WHERE id = ?', [id]);
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
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)',
      [title, description || '', status || 'pending']
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
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const connection = await pool.getConnection();

    // Check if task exists
    const [check] = await connection.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (check.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Update task
    await connection.query(
      'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?',
      [title || check[0].title, description !== undefined ? description : check[0].description, status || check[0].status, id]
    );
    connection.release();

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    const [check] = await connection.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (check.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await connection.query('DELETE FROM tasks WHERE id = ?', [id]);
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
