const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require(process.argv[2] || 'sharp');
const root = path.resolve(__dirname, '..', 'assets', 'tiles');

async function render() {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  await Promise.all([...manifest.map(tile => tile.file), 'back.svg'].map(async file => {
    await sharp(path.join(root, file)).resize(320, 432).png().toFile(path.join(root, file.replace('.svg', '.png')));
  }));
  const result = await sharp(path.join(root, 'tile-catalog.svg')).png().toFile(path.join(root, 'tile-catalog.png'));
  await sharp(path.join(root, 'tile-revisions.svg')).png().toFile(path.join(root, 'tile-revisions.png'));
  await sharp(path.join(root, 'tile-corrections-v3.svg')).png().toFile(path.join(root, 'tile-corrections-v3.png'));
  process.stdout.write(JSON.stringify({ tiles: manifest.length, catalog: result, output: root }));
}
render().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
