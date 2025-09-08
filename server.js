const express = require('express');
const multer = require('multer');
const mustache = require('mustache');
const puppeteer = require('puppeteer');

// Create Express app
const app = express();
const upload = multer(); // For parsing multipart/form-data

// Shared browser instance for all requests:
let browser = null;
const maxConcurrent = 2; // Limit to 2 jobs at a time
let activeCount = 0;
const queue = [];

async function launchBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      protocolTimeout: 120000 // 2 min, adjust as needed
    });
    console.log('Puppeteer launched!');
  }
}

// Process the request queue (keeps 2 in progress, rest are queued)
function processQueue() {
  if (activeCount < maxConcurrent && queue.length) {
    activeCount++;
    const next = queue.shift();
    next();
  }
}

// Endpoint to upload JSON and generate PNG
app.post('/generate-pdp', upload.single('file'), (req, res) => {
  queue.push(async () => {
    try {
      await launchBrowser();

      // Your JSON process logic (adjust as needed):
      const jsonData = req.file ? JSON.parse(req.file.buffer.toString()) : {};
      // Let's say you use a mustache template to render HTML:
      const htmlContent = mustache.render('<h1>Hello, {{name}}</h1>', jsonData);

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      // Wait for rendering, then take screenshot as PNG:
      const pngBuffer = await page.screenshot({ type: 'png' });
      await page.close();

      res.set('Content-Type', 'image/png');
      res.send(pngBuffer);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Could not generate PDP image.');
    }
    activeCount--;
    processQueue();
  });
  processQueue();
});

// Root endpoint
app.get('/', (req, res) => res.send('PDP Convert API Running!'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await launchBrowser();
  console.log(`Server started at http://0.0.0.0:${PORT}`);
});
