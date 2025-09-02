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

// Simple logger for all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

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

// Function to test the database connection on startup
async function testDbConnection() {
  try {
    const connection = await dbPool.getConnection();
    console.log('Successfully connected to the database.');
    connection.release();
  } catch (error) {
    console.error('!!! FAILED TO CONNECT TO DATABASE !!!');
    console.error('Please check your .env file and database credentials.');
    console.error(error.message);
  }
}

// Helper to robustly parse presentation data, handling double-encoding
const parsePresentationData = (rawData) => {
    if (!rawData) return null;
    try {
        let data = JSON.parse(rawData);
        // Handle cases where the data was double-encoded (stringified twice)
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        return data;
    } catch (e) {
        console.error('Failed to parse corrupt presentation data:', rawData, e);
        return null;
    }
};


// === API ROUTES ===

// Get all presentations (full data)
app.get('/api/presentations', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT CAST(data AS CHAR) as data FROM presentations ORDER BY updated_at DESC');
    const presentations = rows.map(row => parsePresentationData(row.data)).filter(Boolean);
    res.json(presentations);
  } catch (error) {
    console.error('Failed to fetch presentations:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get a single presentation by ID
app.get('/api/presentations/:id', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT CAST(data AS CHAR) as data FROM presentations WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const presentationData = parsePresentationData(rows[0].data);
      if (presentationData) {
        res.json(presentationData);
      } else {
        return res.status(500).json({ error: 'Failed to parse presentation data from database.' });
      }
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


// === FRONTEND SERVING (for production) ===

const buildPath = path.join(__dirname, 'build');

// Serve static files from the 'build' directory, but only for requests to '/game'
// This aligns with the `base: '/game/'` config in Vite.
// For example, a request to /game/assets/index-123.js will correctly serve /build/assets/index-123.js
app.use('/game', express.static(buildPath));

// Redirect the root URL to the application's base path for a seamless user experience.
app.get('/', (req, res) => {
  res.redirect('/game');
});

// For any route under /game that is not a static file, serve the main index.html.
// This is the fallback for client-side routing (e.g., when a user refreshes on /game/editor/xyz).
app.get('/game/*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  testDbConnection();
});