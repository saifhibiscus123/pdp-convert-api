const express = require('express');
const multer = require('multer');
const mustache = require('mustache');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json()); // optional, for JSON bodies besides file uploads

let browser = null;
const maxConcurrent = 2;
let activeCount = 0;
const queue = [];

async function launchBrowser() {
  if (!browser) {
    try {
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        protocolTimeout: 120000
      });
      console.log('Puppeteer launched!');
    } catch (err) {
      console.error('Failed to launch Puppeteer:', err);
      throw err;
    }
  }
}

function processQueue() {
  if (activeCount < maxConcurrent && queue.length) {
    activeCount++;
    const next = queue.shift();
    next().finally(() => {
      activeCount--;
      processQueue();
    });
  }
}

app.post('/generate-pdp', upload.single('file'), (req, res) => {
  queue.push(async () => {
    try {
      await launchBrowser();

      if (!req.file) {
        console.error('No file uploaded');
        res.status(400).send('No JSON file uploaded');
        return;
      }

      let jsonString = req.file.buffer.toString();
      console.log('Uploaded JSON:', jsonString);

      let jsonData;
      try {
        jsonData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        res.status(400).send('Invalid JSON file');
        return;
      }

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
  });

  processQueue();
});

app.get('/', (req, res) => res.send('PDP Convert API Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await launchBrowser();
    console.log(`Server started at http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
    console.log('Browser closed gracefully');
  }
  process.exit(0);
});
