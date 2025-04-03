require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { Octokit } = require('@octokit/rest');
const cors = require('cors');
const path = require('path');

const app = express();

// Rozszerzona konfiguracja CORS
const corsOptions = {
  origin: [
    'https://board-creator.netlify.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  abortOnLimit: true
}));

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
      return res.status(400).json({ 
        success: false,
        error: 'Nie przesłano pliku obrazu' 
      });
    }

    const image = req.files.image;
    const fileExt = path.extname(image.name).toLowerCase();
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        error: 'Nieprawidłowy format pliku. Dopuszczalne rozszerzenia: .png, .jpg, .jpeg, .gif, .webp'
      });
    }

    const fileName = `img_${Date.now()}${fileExt}`;
    const content = image.data.toString('base64');

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `images/${fileName}`,
      message: `Dodano obraz ${fileName}`,
      content: content,
      branch: 'main'
    });

    res.status(200).json({
      success: true,
      url: data.content.download_url,
      name: fileName
    });

  } catch (error) {
    console.error('Błąd uploadu:', error);
    res.status(500).json({
      success: false,
      error: 'Wystąpił błąd podczas przesyłania obrazu',
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
      size: item.size,
      type: item.type
    }));

    res.status(200).json(images);

  } catch (error) {
    console.error('Błąd galerii:', error);
    
    // Specjalna obsługa gdy folder images nie istnieje
    if (error.status === 404) {
      return res.status(200).json([]);
    }

    res.status(500).json({
      success: false,
      error: 'Wystąpił błąd podczas ładowania galerii',
      details: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
  console.log(`Dozwolone źródła CORS: ${corsOptions.origin.join(', ')}`);
});
