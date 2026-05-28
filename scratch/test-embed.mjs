import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { generateImageEmbedding } from "../services/ai-service/lib/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY?.length);

const mediaUrl = "https://res.cloudinary.com/dpjcnhspa/image/upload/v1779910465/proimg/pins/hrhxaht9xcuzuompezbc.jpg";

try {
  console.log("Generating embedding...");
  const vector = await generateImageEmbedding(mediaUrl);
  console.log("Vector generated successfully!");
  console.log("Vector length:", vector.length);
  console.log("Is array:", Array.isArray(vector));
  console.log("First 5 values:", vector.slice(0, 5));
} catch (err) {
  console.error("Failed:", err);
}
