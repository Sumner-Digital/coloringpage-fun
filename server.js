require('dotenv').config({ path: '.env.local' });
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// --- Configuration ---

// This is the critical fix: The server now looks for GEMINI_API_KEY, which
// is the variable name used by the AI Studio deployment environment.
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  console.log('Successfully loaded GEMINI_API_KEY from environment variables.');
} else {
  console.error('FATAL ERROR: GEMINI_API_KEY environment variable is not set. The application will not work.');
  // We don't exit here, to allow the frontend to load and show an error.
}

// Path to the built frontend assets.
const buildPath = path.join(__dirname, 'dist');


// --- API Routes ---

// This route MUST be defined before the static file and fallback routes.
app.get('/api/get-key', (req, res) => {
  // Log every time this endpoint is requested for debugging.
  console.log('Received a request for the API key at /api/get-key.');
  if (apiKey) {
    res.json({ apiKey: apiKey });
  } else {
    // This error will now be visible in the Cloud Run logs.
    console.error('Could not serve API key: GEMINI_API_KEY is not configured on the server.');
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }
});


// --- Static File Serving ---

// Serve the static files (like JS, CSS, images) from the 'dist' directory.
app.use(express.static(buildPath));


// --- Fallback Route ---

// For any request that doesn't match an API route or a static file,
// send the main index.html file. This is crucial for single-page applications.
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // This message helps if the build process failed.
    res.status(404).send('Application build not found. Please ensure `npm run build` was successful.');
  }
});


// --- Start Server ---

app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
