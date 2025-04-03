// server/server.js
require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(fileUpload());
app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Upload obrazu
app.post('/upload', async (req, res) => {
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

  try {
    const content = fs.readFileSync(tempPath, { encoding: 'base64' });

    await octokit.repos.createOrUpdateFileContents({
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
      url: `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/main/images/${fileName}`
    });
  } catch (error) {
    console.error('GitHub Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload to GitHub',
      details: error.message
    });
  }
});

// Pobierz listę obrazów
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
    console.error('GitHub Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
