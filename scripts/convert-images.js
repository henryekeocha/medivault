const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng(inputPath, outputPath) {
  try {
    const svg = fs.readFileSync(inputPath);
    await sharp(svg)
      .resize(1200, 800)
      .png()
      .toFile(outputPath);
    console.log(`Converted ${inputPath} to ${outputPath}`);
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error);
  }
}

async function main() {
  const publicDir = path.join(__dirname, '../public');
  
  // Convert hero image
  await convertSvgToPng(
    path.join(publicDir, 'hero-image.svg'),
    path.join(publicDir, 'hero-image.png')
  );
  
  // Convert workflow image
  await convertSvgToPng(
    path.join(publicDir, 'workflow-image.svg'),
    path.join(publicDir, 'workflow-image.png')
  );
}

main().catch(console.error); 