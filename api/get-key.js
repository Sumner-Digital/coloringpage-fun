// Vercel serverless function for API key
module.exports = (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('Received a request for the API key at /api/get-key');
  
  if (apiKey) {
    res.json({ apiKey: apiKey });
  } else {
    console.error('Could not serve API key: GEMINI_API_KEY is not configured on the server.');
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }
};