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
app.use(express.raw({ limit: '50mb', type: ['image/*', 'audio/*'] }));
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

const parseStringData = (rawData) => {
    if (!rawData) return null;
    try {
        let data = JSON.parse(rawData);
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        return data;
    } catch (e) {
        console.error('Failed to parse corrupt presentation data:', rawData, e);
        return null;
    }
};

const prettifyAssetName = (filename) => {
    if (!filename) return '';
    let name = filename.includes('.') ? filename.split('.').slice(0, -1).join('.') : filename;
    name = name.replace(/[_-]/g, ' ');
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
    name = name.trim().replace(/\s+/g, ' ');
    return name.replace(/\b\w/g, char => char.toUpperCase());
};

// === API ROUTER ===
const apiRouter = express.Router();

// Get all presentations
apiRouter.get('/presentations', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT data FROM presentations ORDER BY updated_at DESC');
    const presentations = rows.map(row => {
        if (typeof row.data === 'string') {
            return parseStringData(row.data);
        }
        return row.data;
    }).filter(Boolean);
    res.json(presentations);
  } catch (error) {
    console.error('Failed to fetch presentations:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get a single presentation by ID
apiRouter.get('/presentations/:id', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT data FROM presentations WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      let presentationData = rows[0].data;
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
apiRouter.post('/presentations', async (req, res) => {
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
apiRouter.put('/presentations/:id', async (req, res) => {
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
apiRouter.delete('/presentations/:id', async (req, res) => {
  try {
    const [result] = await dbPool.query('DELETE FROM presentations WHERE id = ?', [req.params.id]);
    if (result.affectedRows > 0) {
        res.status(204).send();
    } else {
        res.status(404).json({ error: 'Presentation not found for deletion' });
    }
  } catch (error) {
    console.error(`Failed to delete presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

// GET all assets for a presentation
apiRouter.get('/presentations/:presentationId/assets', async (req, res) => {
    try {
        const { presentationId } = req.params;
        const [rows] = await dbPool.query('SELECT id, mime_type, name FROM assets WHERE presentation_id = ? ORDER BY created_at DESC', [presentationId]);
        res.json(rows);
    } catch (error) {
        console.error(`Failed to fetch assets for presentation ${req.params.presentationId}:`, error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// Upload a new asset for a presentation
apiRouter.post('/presentations/:presentationId/assets', async (req, res) => {
    try {
        const { presentationId } = req.params;
        const { filename } = req.query;
        const mimeType = req.headers['content-type'];
        const data = req.body;

        if (!presentationId || !mimeType || !data || !filename) {
            return res.status(400).json({ error: 'Missing presentation ID, content-type, filename, or file data.' });
        }

        const assetId = crypto.randomUUID();
        const prettyName = prettifyAssetName(filename);
        const sql = 'INSERT INTO assets (id, presentation_id, mime_type, name, data) VALUES (?, ?, ?, ?, ?)';
        await dbPool.query(sql, [assetId, presentationId, mimeType, prettyName, data]);
        
        res.status(201).json({ assetId });
    } catch (error) {
        console.error('Failed to upload asset:', error);
        res.status(500).json({ error: 'Database insert failed for asset.' });
    }
});

// Get an asset by ID
apiRouter.get('/assets/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;
        const [rows] = await dbPool.query('SELECT data, mime_type FROM assets WHERE id = ?', [assetId]);
        if (rows.length > 0) {
            const asset = rows[0];
            res.setHeader('Content-Type', asset.mime_type);
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

// Update an asset's name
apiRouter.put('/presentations/:presentationId/assets/:assetId', async (req, res) => {
    try {
        const { presentationId, assetId } = req.params;
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Asset name must be a non-empty string.' });
        }
        const [result] = await dbPool.query(
            'UPDATE assets SET name = ? WHERE id = ? AND presentation_id = ?',
            [name.trim(), assetId, presentationId]
        );
        if (result.affectedRows > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Asset not found or does not belong to this presentation.' });
        }
    } catch (error) {
        console.error(`Failed to update asset ${req.params.assetId}:`, error);
        res.status(500).json({ error: 'Database update failed for asset.' });
    }
});

// Delete an asset by ID
apiRouter.delete('/presentations/:presentationId/assets/:assetId', async (req, res) => {
    try {
        const { presentationId, assetId } = req.params;
        const [result] = await dbPool.query(
            'DELETE FROM assets WHERE id = ? AND presentation_id = ?', 
            [assetId, presentationId]
        );
        if (result.affectedRows > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Asset not found or does not belong to this presentation.' });
        }
    } catch (error) {
        console.error(`Failed to delete asset ${req.params.assetId}:`, error);
        res.status(500).json({ error: 'Database delete failed for asset.' });
    }
});

// Mount the API router
app.use('/api', apiRouter);

// === FRONTEND SERVING (for production) ===
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// For any other GET request, serve the main index.html file.
// This is the fallback for client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  testDbConnection();
});