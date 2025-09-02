
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large presentations with images
app.use(express.static(__dirname)); // Serve static files from the project root

// Database connection pool
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// API Routes

// Get all presentations (full data)
app.get('/api/presentations', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT data FROM presentations ORDER BY updated_at DESC');
    // The 'data' column contains the JSON for each presentation.
    const presentations = rows.map(row => row.data);
    res.json(presentations);
  } catch (error) {
    console.error('Failed to fetch presentations:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get a single presentation by ID
app.get('/api/presentations/:id', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT data FROM presentations WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0].data);
    } else {
      res.status(404).json({ error: 'Presentation not found' });
    }
  } catch (error) {
    console.error(`Failed to fetch presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new presentation
app.post('/api/presentations', async (req, res) => {
  try {
    const presentationData = req.body;
    if (!presentationData || !presentationData.id || !presentationData.title) {
        return res.status(400).json({ error: 'Invalid presentation data provided.' });
    }
    const sql = 'INSERT INTO presentations (id, title, data) VALUES (?, ?, ?)';
    await dbPool.query(sql, [presentationData.id, presentationData.title, JSON.stringify(presentationData)]);
    res.status(201).json(presentationData);
  } catch (error) {
    console.error('Failed to create presentation:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update an existing presentation
app.put('/api/presentations/:id', async (req, res) => {
  try {
    const presentationData = req.body;
     if (!presentationData || !presentationData.id || !presentationData.title) {
        return res.status(400).json({ error: 'Invalid presentation data provided.' });
    }
    const sql = 'UPDATE presentations SET title = ?, data = ?, updated_at = NOW() WHERE id = ?';
    const [result] = await dbPool.query(sql, [presentationData.title, JSON.stringify(presentationData), req.params.id]);
    
    if (result.affectedRows > 0) {
        res.json(presentationData);
    } else {
        res.status(404).json({ error: 'Presentation not found for update' });
    }
  } catch (error) {
    console.error(`Failed to update presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Delete a presentation
app.delete('/api/presentations/:id', async (req, res) => {
  try {
    const [result] = await dbPool.query('DELETE FROM presentations WHERE id = ?', [req.params.id]);
    if (result.affectedRows > 0) {
        res.status(204).send(); // No content
    } else {
        res.status(404).json({ error: 'Presentation not found for deletion' });
    }
  } catch (error) {
    console.error(`Failed to delete presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
