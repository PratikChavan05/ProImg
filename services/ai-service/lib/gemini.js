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

// Download image or video helper
async function downloadMedia(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download media: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
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

  const response = await client.models.generateContent({
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
  });

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

  const result = await client.models.embedContent({
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
  });

  const values = result.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Embedding generation returned no values");
  }
  return values;
};
