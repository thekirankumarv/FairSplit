/**
 * Renders every launcher icon, favicon and splash screen from assets/logo.svg.
 * Run with `npm run assets` after changing the logo.
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DARK = '#0c0a09';

const render = async (svg, size, out) => {
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`  ${out.replace(root + '/', '')}  ${size}x${size}`);
};

const logo = await readFile(resolve(root, 'assets/logo.svg'), 'utf8');
const mark = await readFile(resolve(root, 'assets/mark.svg'), 'utf8');

// Adaptive icon foreground: the mark shrunk to 60% so Android's circular mask
// never clips it, on a transparent canvas.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(205 205) scale(0.6)">${mark.replace(/currentColor/g, '#042f2e')}</g>
</svg>`;

const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#0d9488"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

// Splash: the tile and wordmark centred on the app's background colour. The
// 2732x2732 source gets centre-cropped to the device screen, so everything
// stays well inside the middle to survive both orientations.
const SPLASH = 2732;
const TILE = 820;
const tileX = (SPLASH - TILE) / 2;
const tileY = SPLASH / 2 - TILE + 220;
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPLASH} ${SPLASH}" width="${SPLASH}" height="${SPLASH}">
  <rect width="${SPLASH}" height="${SPLASH}" fill="${BRAND_DARK}"/>
  <g transform="translate(${tileX} ${tileY}) scale(${TILE / 1024})">${logo}</g>
  <text x="${SPLASH / 2}" y="${SPLASH / 2 + 450}" text-anchor="middle"
        font-family="Avenir Next, Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="210" font-weight="700" letter-spacing="-6" fill="#f5f5f4">FairSplit</text>
  <text x="${SPLASH / 2}" y="${SPLASH / 2 + 570}" text-anchor="middle"
        font-family="Avenir Next, Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="86" font-weight="500" letter-spacing="10" fill="#57534e">SPLIT IT RIGHT</text>
</svg>`;

console.log('Generating assets...');

// Source images consumed by @capacitor/assets.
await render(logo, 1024, resolve(root, 'assets/icon-only.png'));
await render(foreground, 1024, resolve(root, 'assets/icon-foreground.png'));
await render(background, 1024, resolve(root, 'assets/icon-background.png'));

for (const name of ['splash.png', 'splash-dark.png']) {
  const out = resolve(root, 'assets', name);
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(splash)).resize(2732, 2732).png().toFile(out);
  console.log(`  assets/${name}  2732x2732`);
}

// Web favicons and PWA icons.
await writeFile(resolve(root, 'public/favicon.svg'), logo);
console.log('  public/favicon.svg');
await render(logo, 180, resolve(root, 'public/apple-touch-icon.png'));
await render(logo, 192, resolve(root, 'public/icon-192.png'));
await render(logo, 512, resolve(root, 'public/icon-512.png'));

// Android 12+ splash icon. The platform masks this to a circle covering the
// middle two thirds of the canvas, so the mark is sized to sit inside that.
const splashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(205 205) scale(0.6)">${mark.replace(/currentColor/g, '#34d399')}</g>
</svg>`;
await render(splashIcon, 768, resolve(root, 'android/app/src/main/res/drawable-nodpi/splash_icon.png'));

console.log('Done.');
