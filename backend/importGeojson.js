// importGeojson.js
require('dotenv').config();
const fs       = require('fs/promises');
const path     = require('path');
const mongoose = require('mongoose');

// 1) MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_database_name';

// 2) Path to your GeoJSON files (script lives in root/backend)
const GEO_ROOT = path.join(__dirname, 'JSON Murabba');
console.log('📂 Scanning for GeoJSON in:', GEO_ROOT);

// 3) Define the GeoJSON schema/model (must match server.js)
const geoJsonSchema = new mongoose.Schema({
  tehsil: { type: String, required: true, index: true },
  mauza:  { type: String, required: true, index: true },
  data:   { type: mongoose.Schema.Types.Mixed, required: true }
});
const GeoJson = mongoose.model('GeoJson', geoJsonSchema);

// 4) Recursively walk directories and upsert each file
async function walkAndSeed(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkAndSeed(fullPath);

    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.geojson')) {
      const mauza  = path.basename(entry.name, '.geojson');
      const tehsil = path.basename(path.dirname(fullPath));
      const raw    = await fs.readFile(fullPath, 'utf8');
      const json   = JSON.parse(raw);

      await GeoJson.updateOne(
        { tehsil, mauza },
        { tehsil, mauza, data: json },
        { upsert: true }
      );
      console.log(`✓ Upserted ${tehsil}/${mauza}`);
    }
  }
}

// 5) Connect, run, then disconnect
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('🔌 Connected to MongoDB');
  await walkAndSeed(GEO_ROOT);
  console.log('✅ All GeoJSON imported');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
