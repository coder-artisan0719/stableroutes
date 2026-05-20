// One-off: render the StableRoute brand mark to a 512x512 PNG for use as a
// Telegram avatar (full-bleed gold — Telegram crops avatars to a circle).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// $ and R are well separated; the two euro bars sit cleanly in the gap
// between them rather than crossing the letterforms.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fbbf24"/>
      <stop offset="0.55" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(106 112) scale(12.5)" fill="#ffffff">
    <text x="5.6" y="12" text-anchor="middle" dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="16">$</text>
    <text x="18.4" y="12" text-anchor="middle" dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="16">R</text>
    <rect x="9.9" y="8.7" width="4.2" height="1.95" rx="0.97"/>
    <rect x="9.9" y="13.35" width="4.2" height="1.95" rx="0.97"/>
  </g>
</svg>`;

const pub = path.join(__dirname, "..", "public");
fs.writeFileSync(path.join(pub, "telegram-logo.svg"), svg);

sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile(path.join(pub, "telegram-logo.png"))
  .then((info) =>
    console.log(`telegram-logo.png written: ${info.width}x${info.height}, ${info.size} bytes`),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
