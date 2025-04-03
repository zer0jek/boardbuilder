require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Konfiguracja CORS
const corsOptions = {
  origin: [
    'https://board-creator.netlify.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST']
};
app.use(cors(corsOptions));
app.use(fileUpload());
app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'BoardCreator/1.0'
});

// Middleware do logowania
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Endpoint uploadu
app.post('/upload', async (req, res) => {
  try {
    if (!req.files?.image) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const image = req.files.image;
    const fileName = `img_${Date.now()}${path.extname(image.name)}`;
    const tempPath = path.join(__dirname, 'temp', fileName);

    // Utwórz folder temp jeśli nie istnieje
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    await image.mv(tempPath);
    const content = fs.readFileSync(tempPath, { encoding: 'base64' });

    // Zapisz do GitHub w folderze images (bez public/)
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `images/${fileName}`,
      message: `Add image ${fileName}`,
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
      error: 'Upload failed',
      details: error.message
    });
  }
});

// Endpoint galerii
app.get('/gallery', async (req, res) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: 'images',
      ref: 'main'
    });

    const images = data.map(item => ({
      name: item.name,
      url: item.download_url,
      size: item.size
    }));

    res.json(images);
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gallery',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${corsOptions.origin.join(', ')}`);
});
