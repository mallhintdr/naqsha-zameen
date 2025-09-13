require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const MONGO_URI = process.env.MONGO_URI;

const landRecordSchema = new mongoose.Schema({
  district: String,
  tehsil: String,
  mouza: String,
  khewatId: Number,
  khewatNo: String,
  khasraIds: [Number],
  owners: [mongoose.Schema.Types.Mixed]
});
const LandRecord = mongoose.model('LandRecord', landRecordSchema);

async function fetchOwnership(khasraId) {
  const url = `https://ownership.pulse.gop.pk/api/Ownership/get-ownership-details-by-khasra-id?id=${khasraId}`;
  const { data } = await axios.get(url);
  return data.OnwerShipDetail || [];
}

async function main() {
  await mongoose.connect(MONGO_URI);

  // Example district layer id (2 = Bahawalpur in provided URLs)
  const layerId = 2;
  const queryUrl = `https://gismaps.pulse.gop.pk/arcgis/rest/services/VendorMaps/Punjab_Cdastral_Maps/MapServer/${layerId}/query?where=1%3D1&outFields=*&f=json`;

  const { data } = await axios.get(queryUrl);

  for (const feature of data.features.slice(0, 10)) { // limit for demo
    const a = feature.attributes;
    const khewatId = a.Khewat_ID;
    const khasraId = a.Khasra_ID;

    let rec = await LandRecord.findOne({ khewatId });
    if (!rec) {
      const owners = await fetchOwnership(khasraId).catch(() => []);
      rec = new LandRecord({
        district: a.District,
        tehsil: a.Tehsil,
        mouza: a.Mouza,
        khewatId,
        khewatNo: owners[0]?.khewat_no || '',
        khasraIds: [khasraId],
        owners
      });
    } else if (!rec.khasraIds.includes(khasraId)) {
      rec.khasraIds.push(khasraId);
    }
    await rec.save();
    console.log('Saved', rec.khewatId);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });