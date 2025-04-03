require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
const path = require('path');

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'https://board-creator.netlify.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'BoardCreator/1.0'
});

// File upload endpoint
app.post('/upload', async (req, res) => {
  try {
    if (!req.files?.image) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const image = req.files.image;
    const content = image.data.toString('base64');

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `images/${image.name}`,
      message: `Add ${image.name}`,
      content: content,
      branch: 'main'
    });

    res.json({
      success: true,
      url: data.content.download_url
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message
    });
  }
});

// Gallery endpoint
app.get('/gallery', async (req, res) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: 'images',
      ref: 'main'
    });

    res.json(data.map(item => ({
      name: item.name,
      url: item.download_url
    })));

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to load gallery',
      details: error.message
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Server running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
