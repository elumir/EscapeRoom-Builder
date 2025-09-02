require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
// Middleware for raw binary body (for asset uploads)
app.use(express.raw({ limit: '50mb', type: ['image/*', 'audio/*'] }));
// Middleware for JSON body (for presentation data)
app.use(express.json({ limit: '50mb' }));

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

// Helper to robustly parse presentation data that might have been stored as a string.
const parseStringData = (rawData) => {
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
    // Select the raw data; mysql2 will auto-parse if it's a valid JSON type.
    const [rows] = await dbPool.query('SELECT data FROM presentations ORDER BY updated_at DESC');
    const presentations = rows.map(row => {
        // If data is a string, it's legacy data that needs parsing.
        if (typeof row.data === 'string') {
            return parseStringData(row.data);
        }
        // Otherwise, it's a JS object, parsed by the driver.
        return row.data;
    }).filter(Boolean); // Filter out any nulls from failed parsing
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
      let presentationData = rows[0].data;
      // Handle legacy string data
      if (typeof presentationData === 'string') {
          presentationData = parseStringData(presentationData);
      }
      
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
    // Pass the object directly. The mysql2 driver handles serializing it for the JSON column.
    await dbPool.query(sql, [presentationData.id, presentationData.title, presentationData]);
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
    // Pass the object directly. The mysql2 driver handles serialization.
    const [result] = await dbPool.query(sql, [presentationData.title, presentationData, req.params.id]);
    
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

// === ASSET ROUTES ===

// Upload a new asset for a presentation
app.post('/api/presentations/:presentationId/assets', async (req, res) => {
    try {
        const { presentationId } = req.params;
        const mimeType = req.headers['content-type'];
        const data = req.body;

        if (!presentationId || !mimeType || !data) {
            return res.status(400).json({ error: 'Missing presentation ID, content-type, or file data.' });
        }

        const assetId = crypto.randomUUID();
        const sql = 'INSERT INTO assets (id, presentation_id, mime_type, data) VALUES (?, ?, ?, ?)';
        await dbPool.query(sql, [assetId, presentationId, mimeType, data]);
        
        res.status(201).json({ assetId });

    } catch (error) {
        console.error('Failed to upload asset:', error);
        res.status(500).json({ error: 'Database insert failed for asset.' });
    }
});


// Get an asset by ID
app.get('/api/assets/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;
        const [rows] = await dbPool.query('SELECT data, mime_type FROM assets WHERE id = ?', [assetId]);

        if (rows.length > 0) {
            const asset = rows[0];
            res.setHeader('Content-Type', asset.mime_type);
            // Cache the asset for 1 year
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.send(asset.data);
        } else {
            res.status(404).send('Asset not found');
        }
    } catch (error) {
        console.error(`Failed to fetch asset ${req.params.assetId}:`, error);
        res.status(500).json({ error: 'Database query failed' });
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