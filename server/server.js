require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Rozszerzona konfiguracja CORS
const corsOptions = {
  origin: [
    'https://board-creator.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(fileUpload());
app.use(express.json());

const octokit = new Octokit({ 
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'Board Creator v1.0'
});

// Middleware do logowania żądań
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Endpoint uploadu
app.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided' 
      });
    }

    const image = req.files.image;
    const fileName = `img_${Date.now()}${path.extname(image.name)}`;
    const tempDir = path.join(__dirname, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const tempPath = path.join(tempDir, fileName);
    await image.mv(tempPath);

    const content = fs.readFileSync(tempPath, { encoding: 'base64' });
    
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `public/images/${fileName}`,
      message: `Added image ${fileName}`,
      content: content,
      branch: 'main'
    });

    fs.unlinkSync(tempPath);

    res.json({
      success: true,
      url: data.content.download_url,
      name: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// Endpoint galerii
app.get('/gallery', async (req, res) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: 'public/images',
      ref: 'main'
    });

    const images = data.map(item => ({
      name: item.name,
      url: item.download_url,
      size: item.size,
      type: item.type
    }));

    res.json(images);

  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gallery',
      details: error.message
    });
  }
});

// Obsługa błędów
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed for: ${corsOptions.origin.join(', ')}`);
});
