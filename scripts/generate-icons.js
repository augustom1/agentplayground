// Run once: node scripts/generate-icons.js
const path = require("path");
const fs = require("fs");

async function main() {
  // Import sharp from Next.js's copy
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    const sharpPath = path.join(__dirname, "../node_modules/sharp");
    sharp = require(sharpPath);
  }

  const svgPath = path.join(__dirname, "../public/icons/icon.svg");
  const outDir = path.join(__dirname, "../public/icons");
  const svg = fs.readFileSync(svgPath);

  const icons = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-32.png", size: 32 },
  ];

  for (const { name, size } of icons) {
    const dest = path.join(outDir, name);
    await sharp(svg).resize(size, size).png().toFile(dest);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  console.log("\nAll icons generated in public/icons/");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
