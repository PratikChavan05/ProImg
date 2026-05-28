import { GoogleGenAI } from "@google/genai";

let aiClient = null;

const getAiClient = () => {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
};

// Download image or video helper with 12s timeout and 25MB safety caps
async function downloadMedia(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout limit

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to download media: ${res.statusText}`);
    }

    // 1. Content-Length Header check (pre-download check)
    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      if (sizeBytes > 25 * 1024 * 1024) {
        throw new Error(`Media size exceeds the 25MB limit (${(sizeBytes / 1024 / 1024).toFixed(1)}MB)`);
      }
    }

    const arrayBuffer = await res.arrayBuffer();

    // 2. Buffer Byte-Length check (post-download verification)
    if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
      throw new Error(`Media size exceeds the 25MB limit (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
    }

    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Media download timed out after 12 seconds");
    }
    throw err;
  }
}

// Exponential back-off retry helper for Gemini API 429 quota limits
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const errStr = (err.message || "").toLowerCase();
      const is429 = err.status === 429 || 
                    errStr.includes("429") || 
                    errStr.includes("quota") || 
                    errStr.includes("rate limit") || 
                    errStr.includes("too many requests");
      
      if (is429 && i < retries - 1) {
        const backoff = delay * Math.pow(2, i);
        console.warn(`[AI-Service] Gemini API 429 Rate Limit hit. Retrying in ${backoff}ms (Attempt ${i + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw err;
    }
  }
}

// Map common extensions or extract content type
function getMimeType(url, defaultMime = "image/jpeg") {
  const ext = url.split(".").pop().split("?")[0].toLowerCase();
  const mimeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo"
  };
  return mimeMap[ext] || defaultMime;
}

export const generateTagsAndCaption = async (mediaUrl, mediaType) => {
  const client = getAiClient();
  const buffer = await downloadMedia(mediaUrl);
  const base64Data = buffer.toString("base64");
  const mimeType = getMimeType(mediaUrl, mediaType === "video" ? "video/mp4" : "image/jpeg");

  const responseSchema = {
    type: "OBJECT",
    properties: {
      tags: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "A list of 5-10 descriptive search tags/keywords relevant to the visual content of the media, in lowercase with no spaces (e.g. ['nature', 'beach', 'sunset', 'water'])."
      },
      altText: {
        type: "STRING",
        description: "A concise, highly descriptive accessibility alternative text or caption for the media."
      }
    },
    required: ["tags", "altText"]
  };

  const response = await withRetry(() => 
    client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        {
          text: "Analyze this media and generate descriptive tags and a concise altText caption for accessibility."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    })
  );

  try {
    const data = JSON.parse(response.text);
    return {
      tags: Array.isArray(data.tags) ? data.tags.map(t => t.toLowerCase()) : [],
      altText: data.altText || ""
    };
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON output: ${response.text}`);
  }
};

export const generateImageEmbedding = async (mediaUrl) => {
  const client = getAiClient();
  const buffer = await downloadMedia(mediaUrl);
  const base64Data = buffer.toString("base64");
  const mimeType = getMimeType(mediaUrl, "image/jpeg");

  const result = await withRetry(() => 
    client.models.embedContent({
      model: "gemini-embedding-2",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ],
      config: {
        outputDimensionality: 768
      }
    })
  );

  const values = result.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Embedding generation returned no values");
  }
  return values;
};
