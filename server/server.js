require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['https://board-creator.netlify.app', 'http://localhost:3000'],
  methods: ['GET', 'POST']
}));

app.use(express.json());
app.use(fileUpload());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'BoardCreator/1.0'
});

app.post('/upload', async (req, res) => {
  try {
    if (!req.files?.image) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const image = req.files.image;
    const fileName = `img_${Date.now()}${image.name.substring(image.name.lastIndexOf('.'))}`;
    const content = image.data.toString('base64');

    // Important: Ensure we return proper JSON
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `images/${fileName}`,
      message: `Add ${fileName}`,
      content: content,
      branch: 'main'
    });

    res.status(200).json({
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
