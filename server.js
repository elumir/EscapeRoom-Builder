require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const { auth, requiresAuth } = require('express-openid-connect');

const app = express();
const port = process.env.PORT || 8080;

// Auth0 configuration
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: `${process.env.AUTH0_BASE_URL}/game`,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  routes: {
    login: '/login',
    logout: '/logout',
    callback: '/callback',
  }
};

// Middleware
app.use(cors());
app.use(express.raw({ limit: '50mb', type: ['image/*', 'audio/*', 'font/*'] }));
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

const gameRouter = express.Router();
gameRouter.use(auth(authConfig));

// Route to get user profile
gameRouter.get('/api/user', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.json(req.oidc.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Public, un-authenticated route to get a presentation for viewing/presenting
gameRouter.get('/api/public/presentation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await dbPool.query("SELECT data FROM presentations WHERE id = ? AND visibility = 'public'", [id]);
    if (rows.length > 0) {
      let presentationData = rows[0].data;
      if (typeof presentationData === 'string') {
        presentationData = parseStringData(presentationData);
      }
      if (presentationData) {
        res.json(presentationData);
      } else {
        return res.status(500).json({ error: 'Failed to parse public presentation data.' });
      }
    } else {
      res.status(404).json({ error: 'Public presentation not found.' });
    }
  } catch (error) {
    console.error(`Failed to fetch public presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get an asset by ID (Publicly available, as it's by non-guessable ID)
gameRouter.get('/api/assets/:assetId', async (req, res) => {
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


// === API ROUTER ===
const apiRouter = express.Router();
// Protect all API routes below this line
apiRouter.use(requiresAuth());

// Get all presentations for the logged-in user
apiRouter.get('/presentations', async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const [rows] = await dbPool.query('SELECT data FROM presentations WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
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

// Get a single presentation by ID (and check ownership)
apiRouter.get('/presentations/:id', async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const [rows] = await dbPool.query('SELECT data FROM presentations WHERE id = ? AND user_id = ?', [req.params.id, userId]);
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
      res.status(404).json({ error: 'Presentation not found or you do not have permission to access it.' });
    }
  } catch (error) {
    console.error(`Failed to fetch presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new presentation for the logged-in user
apiRouter.post('/presentations', async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const presentationData = req.body;
    if (!presentationData || !presentationData.id || !presentationData.title) {
        return res.status(400).json({ error: 'Invalid presentation data provided.' });
    }
    const sql = 'INSERT INTO presentations (id, user_id, title, data, visibility) VALUES (?, ?, ?, ?, ?)';
    await dbPool.query(sql, [presentationData.id, userId, presentationData.title, JSON.stringify(presentationData), presentationData.visibility || 'private']);
    res.status(201).json(presentationData);
  } catch (error) {
    console.error('Failed to create presentation:', error);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

// Update an existing presentation (and check ownership)
apiRouter.put('/presentations/:id', async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const presentationData = req.body;
     if (!presentationData || !presentationData.id || !presentationData.title) {
        return res.status(400).json({ error: 'Invalid presentation data provided.' });
    }
    const sql = 'UPDATE presentations SET title = ?, data = ?, visibility = ?, updated_at = NOW() WHERE id = ? AND user_id = ?';
    const [result] = await dbPool.query(sql, [presentationData.title, JSON.stringify(presentationData), presentationData.visibility || 'private', req.params.id, userId]);
    if (result.affectedRows > 0) {
        res.json(presentationData);
    } else {
        res.status(404).json({ error: 'Presentation not found or you do not have permission to modify it.' });
    }
  } catch (error) {
    console.error(`Failed to update presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Update a presentation's visibility (and check ownership)
apiRouter.put('/presentations/:id/visibility', async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const { id } = req.params;
    const { visibility } = req.body;

    if (!visibility || !['private', 'public'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility value provided.' });
    }

    // First, we need to get the existing data to update it
    const [rows] = await dbPool.query('SELECT data FROM presentations WHERE id = ? AND user_id = ?', [id, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found or you do not have permission to modify it.' });
    }

    let presentationData = rows[0].data;
    if (typeof presentationData === 'string') {
      presentationData = parseStringData(presentationData);
    }
    if (!presentationData) {
      return res.status(500).json({ error: 'Failed to parse existing presentation data.' });
    }

    // Update the visibility property within the JSON data
    presentationData.visibility = visibility;

    const sql = 'UPDATE presentations SET visibility = ?, data = ?, updated_at = NOW() WHERE id = ? AND user_id = ?';
    const [result] = await dbPool.query(sql, [visibility, JSON.stringify(presentationData), id, userId]);
    
    if (result.affectedRows > 0) {
      res.status(200).json({ success: true, visibility });
    } else {
      // This case should be rare given the check above, but it's good practice
      res.status(404).json({ error: 'Presentation not found or you do not have permission to modify it.' });
    }
  } catch (error) {
    console.error(`Failed to update visibility for presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Delete a presentation (and check ownership)
apiRouter.delete('/presentations/:id', async (req, res) => {
  try {
    const userId = req.oidc.user.sub;
    const [result] = await dbPool.query('DELETE FROM presentations WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (result.affectedRows > 0) {
        res.status(204).send();
    } else {
        res.status(404).json({ error: 'Presentation not found or you do not have permission to delete it.' });
    }
  } catch (error) {
    console.error(`Failed to delete presentation ${req.params.id}:`, error);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

// GET all assets for a presentation (ownership checked via presentations table)
apiRouter.get('/presentations/:presentationId/assets', async (req, res) => {
    try {
        const userId = req.oidc.user.sub;
        const { presentationId } = req.params;
        const [ownerCheck] = await dbPool.query('SELECT id FROM presentations WHERE id = ? AND user_id = ?', [presentationId, userId]);
        if (ownerCheck.length === 0) {
          return res.status(404).json({ error: 'Presentation not found or you do not have permission to access its assets.' });
        }
        const [rows] = await dbPool.query('SELECT id, mime_type, name FROM assets WHERE presentation_id = ? ORDER BY created_at DESC', [presentationId]);
        res.json(rows);
    } catch (error) {
        console.error(`Failed to fetch assets for presentation ${req.params.presentationId}:`, error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// Upload a new asset for a presentation (ownership checked)
apiRouter.post('/presentations/:presentationId/assets', async (req, res) => {
    try {
        const userId = req.oidc.user.sub;
        const { presentationId } = req.params;
        const { filename } = req.query;
        
        const [ownerCheck] = await dbPool.query('SELECT id FROM presentations WHERE id = ? AND user_id = ?', [presentationId, userId]);
        if (ownerCheck.length === 0) {
          return res.status(404).json({ error: 'Presentation not found or you do not have permission to upload assets.' });
        }

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

// Update an asset's name (ownership checked)
apiRouter.put('/presentations/:presentationId/assets/:assetId', async (req, res) => {
    try {
        const userId = req.oidc.user.sub;
        const { presentationId, assetId } = req.params;
        
        const [ownerCheck] = await dbPool.query('SELECT id FROM presentations WHERE id = ? AND user_id = ?', [presentationId, userId]);
        if (ownerCheck.length === 0) {
          return res.status(404).json({ error: 'Presentation not found or you do not have permission to modify its assets.' });
        }

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

// Delete an asset by ID (ownership checked)
apiRouter.delete('/presentations/:presentationId/assets/:assetId', async (req, res) => {
    try {
        const userId = req.oidc.user.sub;
        const { presentationId, assetId } = req.params;
        
        const [ownerCheck] = await dbPool.query('SELECT id FROM presentations WHERE id = ? AND user_id = ?', [presentationId, userId]);
        if (ownerCheck.length === 0) {
          return res.status(404).json({ error: 'Presentation not found or you do not have permission to delete its assets.' });
        }

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
gameRouter.use('/api', apiRouter);

// === FRONTEND SERVING (for production) ===
const buildPath = path.join(__dirname, 'build');
gameRouter.use(express.static(buildPath));

// For any other GET request, serve the main index.html file.
// This is the fallback for client-side routing.
gameRouter.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Mount the entire game application router under the /game prefix
app.use('/game', gameRouter);

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  testDbConnection();
});