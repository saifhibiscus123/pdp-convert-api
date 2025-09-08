const express = require('express');
const multer = require('multer');
const mustache = require('mustache');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const upload = multer();
app.use(cors()); // Allow all cross-origin requests (adjust for security)

// Shared Puppeteer browser instance
let browser = null;
const maxConcurrent = 2;
let activeCount = 0;
const queue = [];

async function launchBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      protocolTimeout: 120000
    });
    console.log('Puppeteer launched!');
  }
}

function processQueue() {
  if (activeCount < maxConcurrent && queue.length) {
    activeCount++;
    const next = queue.shift();
    next();
  }
}

app.post('/generate-pdp', upload.single('file'), (req, res) => {
  queue.push(async () => {
    try {
      await launchBrowser();

      if (!req.file) {
        res.status(400).send('No JSON file uploaded');
        activeCount--;
        processQueue();
        return;
      }

      let jsonData;
      try {
        jsonData = JSON.parse(req.file.buffer.toString());
      } catch (parseError) {
        res.status(400).send('Invalid JSON file');
        activeCount--;
        processQueue();
        return;
      }

      // Example mustache template, customize as needed
      const htmlContent = mustache.render('<h1>Hello, {{name}}</h1>', jsonData);

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pngBuffer = await page.screenshot({ type: 'png' });
      await page.close();

      res.set('Content-Type', 'image/png');
      res.send(pngBuffer);

    } catch (err) {
      console.error('Error generating PDP:', err);
      res.status(500).send('Could not generate PDP image.');
    }
    activeCount--;
    processQueue();
  });
  processQueue();
});

app.get('/', (req, res) => res.send('PDP Convert API Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await launchBrowser();
  console.log(`Server started at http://0.0.0.0:${PORT}`);
});
