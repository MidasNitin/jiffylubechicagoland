#!/usr/bin/env node
// One shared QR code for the fleet lead form (used in every store and lounge).
//   node scripts/make-qr.mjs            -> assets/fleet/fleet-qr.png + .svg (also copied into docs/ by the build)
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
const URL_ = process.argv[2] || 'https://www.jiffylubechicagoland.com/fleet/';
const dir = path.resolve('assets/fleet'); fs.mkdirSync(dir, { recursive: true });
await QRCode.toFile(path.join(dir, 'fleet-qr.png'), URL_, { errorCorrectionLevel: 'H', margin: 2, width: 1200, color: { dark: '#000000', light: '#ffffff' } });
fs.writeFileSync(path.join(dir, 'fleet-qr.svg'), await QRCode.toString(URL_, { type: 'svg', errorCorrectionLevel: 'H', margin: 2 }));
console.log('QR for', URL_, '->', dir);
