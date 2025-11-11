const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const svgFile = path.join(publicDir, 'ifsul-logo.svg');
const out192 = path.join(publicDir, 'logo192.png');
const out512 = path.join(publicDir, 'logo512.png');

async function generate() {
  if (!fs.existsSync(svgFile)) {
    console.error('SVG file not found:', svgFile);
    process.exit(2);
  }

  try {
    await sharp(svgFile)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(out192);

    console.log('Generated', out192);

    await sharp(svgFile)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(out512);

    console.log('Generated', out512);
    console.log('All icons generated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generate();
  