#!/usr/bin/env node
/**
 * Generate PWA icons from source image
 * Run with: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';

const SOURCE = './assets/logo.png';

if (!existsSync(SOURCE)) {
  console.error(`❌ Source image not found: ${SOURCE}`);
  process.exit(1);
}

async function generateIcons() {
  // Ensure directories exist
  mkdirSync('./public', { recursive: true });

  try {
    // Generate PWA icons from icon_big.png
    await sharp(SOURCE)
      .resize(192, 192)
      .png()
      .toFile('./public/icon-192.png');
    console.log('✓ Created icon-192.png');

    await sharp(SOURCE)
      .resize(512, 512)
      .png()
      .toFile('./public/icon-512.png');
    console.log('✓ Created icon-512.png');

    // Generate Apple touch icon (180x180)
    await sharp(SOURCE)
      .resize(180, 180)
      .png()
      .toFile('./public/apple-touch-icon.png');
    console.log('✓ Created apple-touch-icon.png');

    // Generate favicons
    await sharp(SOURCE)
      .resize(32, 32)
      .png()
      .toFile('./public/favicon-32.png');
    console.log('✓ Created favicon-32.png');

    await sharp(SOURCE)
      .resize(16, 16)
      .png()
      .toFile('./public/favicon-16.png');
    console.log('✓ Created favicon-16.png');

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
