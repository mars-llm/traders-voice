#!/usr/bin/env node
/**
 * Simple icon generator using resvg-js
 * Run with: node create-icons.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';

try {
  // Read SVG
  const svg = readFileSync('./src/icon.svg', 'utf-8');

  // Create public directory if it doesn't exist
  try {
    mkdirSync('./public', { recursive: true });
  } catch (e) {
    // Directory exists
  }

  // Generate 192x192
  const opts192 = {
    fitTo: {
      mode: 'width',
      value: 192,
    },
  };
  const resvg192 = new Resvg(svg, opts192);
  const png192 = resvg192.render().asPng();
  writeFileSync('./public/icon-192.png', png192);
  writeFileSync('./src/icon-192.png', png192);
  console.log('✓ Created icon-192.png');

  // Generate 512x512
  const opts512 = {
    fitTo: {
      mode: 'width',
      value: 512,
    },
  };
  const resvg512 = new Resvg(svg, opts512);
  const png512 = resvg512.render().asPng();
  writeFileSync('./public/icon-512.png', png512);
  writeFileSync('./src/icon-512.png', png512);
  console.log('✓ Created icon-512.png');

  console.log('\n✅ PWA icons generated successfully!');
} catch (error) {
  console.error('❌ Error generating icons:', error.message);
  process.exit(1);
}
