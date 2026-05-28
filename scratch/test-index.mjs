import mongoose from "mongoose";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { generateImageEmbedding } from "../services/ai-service/lib/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoUrl = process.env.MONGO_URL;
const esUrl = process.env.ELASTICSEARCH_URL;
const esApiKey = process.env.ELASTICSEARCH_API_KEY;

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

await mongoose.connect(finalUri);

const pinSchema = new mongoose.Schema({}, { strict: false, collection: "pins" });
const Pin = mongoose.model("Pin", pinSchema);

const esOpts = { node: esUrl };
if (esApiKey) {
  esOpts.auth = { apiKey: esApiKey };
}
const esClient = new Client(esOpts);

// Find Train To Peace
const pin = await Pin.findOne({ title: "Train To Peace" });
const pinId = pin._id.toString();
const mediaUrl = pin.media?.url;

console.log("Generating embedding...");
const embeddingVector = await generateImageEmbedding(mediaUrl);
console.log("Embedding generated, length:", embeddingVector?.length);

const doc = {
  title: pin.title,
  pin: pin.pin,
  tags: pin.tags,
  ownerId: pin.owner.toString(),
  mediaUrl: mediaUrl,
  mediaType: pin.media?.type || "image",
  createdAt: pin.createdAt,
  embedding_vector: embeddingVector
};

console.log("Keys in doc being indexed:", Object.keys(doc));
console.log("embedding_vector length in doc:", doc.embedding_vector?.length);

console.log("Indexing...");
await esClient.index({
  index: "pins",
  id: pinId,
  body: doc
});
console.log("Indexed successfully!");

console.log("Retrieving document from ES...");
const esDoc = await esClient.get({
  index: "pins",
  id: pinId
});

console.log("Retrieved source keys:", Object.keys(esDoc._source));
console.log("embedding_vector in retrieved source:", !!esDoc._source.embedding_vector);

await mongoose.disconnect();
process.exit(0);
