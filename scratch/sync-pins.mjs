import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { generateTagsAndCaption, generateImageEmbedding } from "../services/ai-service/lib/gemini.js";

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

  console.log("Syncing to Elasticsearch with AI Enrichment...");
  for (const pin of pins) {
    const pinObj = pin.toObject();
    const pinId = pinObj._id.toString();
    const mediaUrl = pinObj.media?.url || "";
    const mediaType = pinObj.media?.type || "image";

    let tags = pinObj.tags || [];
    let altText = pinObj.altText || "";
    let embeddingVector = null;

    // Call Gemini to enrich pins if tags are empty
    if (process.env.GEMINI_API_KEY && mediaUrl && (!tags || tags.length === 0)) {
      try {
        console.log(`Enriching Pin "${pinObj.title}" via Gemini Multimodal...`);
        const enrichment = await generateTagsAndCaption(mediaUrl, mediaType);
        tags = enrichment.tags || [];
        altText = enrichment.altText || "";

        // Save back to MongoDB
        await Pin.findByIdAndUpdate(pinId, { tags, altText });
        console.log(`Updated MongoDB for Pin "${pinObj.title}" with tags: [${tags.join(", ")}]`);
      } catch (aiErr) {
        console.error(`AI enrichment failed for Pin "${pinObj.title}":`, aiErr.message);
      }
    }

    // Generate embedding for ES if it's an image
    if (process.env.GEMINI_API_KEY && mediaUrl && mediaType === "image") {
      try {
        console.log(`Generating embedding for Pin "${pinObj.title}"...`);
        embeddingVector = await generateImageEmbedding(mediaUrl);
      } catch (embErr) {
        console.error(`Embedding generation failed for Pin "${pinObj.title}":`, embErr.message);
      }
    }

    const doc = {
      title: pinObj.title || "",
      pin: pinObj.pin || "",
      tags: tags,
      ownerId: (pinObj.owner || "").toString(),
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      createdAt: pinObj.createdAt || new Date().toISOString()
    };

    if (embeddingVector) {
      doc.embedding_vector = embeddingVector;
    }

    await esClient.index({
      index: "pins",
      id: pinId,
      body: doc
    });
    console.log(`Synced Pin: "${pinObj.title}" (${pinId})`);
  }

  console.log("\n🚀 Sync completed successfully! All pins are now searchable.");
} catch (err) {
  console.error("Sync error:", err.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
