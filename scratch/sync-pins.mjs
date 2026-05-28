import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoUrl = process.env.MONGO_URL;
const esUrl = process.env.ELASTICSEARCH_URL;
const esApiKey = process.env.ELASTICSEARCH_API_KEY;

if (!mongoUrl || !esUrl) {
  console.error("Missing MONGO_URL or ELASTICSEARCH_URL in .env");
  process.exit(1);
}

try {
  const databaseName = "proimg-pins";
  const qIndex = mongoUrl.indexOf("?");
  let finalUri = mongoUrl;
  if (qIndex === -1) {
    finalUri = `${mongoUrl.replace(/\/$/, "")}/${databaseName}`;
  } else {
    const base = mongoUrl.slice(0, qIndex).replace(/\/$/, "");
    const query = mongoUrl.slice(qIndex);
    finalUri = `${base}/${databaseName}${query}`;
  }

  console.log(`Connecting to MongoDB (${databaseName})...`);
  await mongoose.connect(finalUri);
  console.log("Connected to MongoDB successfully.");

  const pinSchema = new mongoose.Schema({}, { strict: false, collection: "pins" });
  const Pin = mongoose.model("Pin", pinSchema);

  const esOpts = { node: esUrl };
  if (esApiKey) {
    esOpts.auth = { apiKey: esApiKey };
  }
  const esClient = new Client(esOpts);

  console.log("Fetching pins from MongoDB...");
  const pins = await Pin.find({});
  console.log(`Found ${pins.length} pins.`);

  console.log("Syncing to Elasticsearch...");
  for (const pin of pins) {
    const pinObj = pin.toObject();
    await esClient.index({
      index: "pins",
      id: pinObj._id.toString(),
      body: {
        title: pinObj.title || "",
        pin: pinObj.pin || "",
        ownerId: (pinObj.owner || "").toString(),
        mediaUrl: pinObj.media?.url || "",
        mediaType: pinObj.media?.type || "image",
        createdAt: pinObj.createdAt || new Date().toISOString()
      }
    });
    console.log(`Synced Pin: "${pinObj.title}" (${pinObj._id})`);
  }

  console.log("\n🚀 Sync completed successfully! All pins are now searchable.");
} catch (err) {
  console.error("Sync error:", err.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
