const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mustache = require('mustache');
const puppeteer = require('puppeteer');
const universalParser = require('./productParser');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.send(`
    <h2>Upload product JSON or HTML file to generate PDP image</h2>
    <form action="/generate-pdp" method="post" enctype="multipart/form-data">
      <input type="file" name="file" accept=".json,.html" required/><br/><br/>
      <button type="submit">Generate PDP Image</button>
    </form>
  `);
});

app.post('/generate-pdp', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const uploadedFilePath = path.join(__dirname, req.file.path);
  const fileContent = fs.readFileSync(uploadedFilePath, 'utf8');
  fs.unlinkSync(uploadedFilePath);

  // Get product details (universal parser)
  const productData = universalParser(fileContent);

  // Render HTML from template
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  const html = mustache.render(template, productData);

  // Generate image with puppeteer
  try {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 600, height: 650 });
    await new Promise(resolve => setTimeout(resolve, 500));
    const screenshot = await page.screenshot({ type: 'png' });
    await browser.close();

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'attachment; filename="pdp-image.png"');
    res.send(screenshot);
  } catch (e) {
    res.status(500).send('Could not generate PDP image. ' + e.toString());
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started at http://0.0.0.0:${PORT}`);
});
