import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SERVICES_DIR = path.resolve(__dirname, "..");

const trim = (v) => (typeof v === "string" ? v.trim() : v);

/** Load root `.env` then optional `services/<name>/.env` overrides. */
export function loadEnv(serviceDir = null) {
  const rootEnv = path.join(REPO_ROOT, ".env");
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }

  // Root `PORT` is the gateway port — do not apply it to other services
  if (serviceDir && serviceDir !== "gateway") {
    delete process.env.PORT;
  }

  if (serviceDir) {
    const serviceEnv = path.join(SERVICES_DIR, serviceDir, ".env");
    if (fs.existsSync(serviceEnv)) {
      dotenv.config({ path: serviceEnv, override: true });
    }
  }

  normalizeEnv();
}

function normalizeEnv() {
  const keys = [
    "MONGO_URL",
    "MONGO_URI",
    "JWT_SEC",
    "REFRESH_TOKEN_SEC",
    "SESSION_SECRET",
    "RABBITMQ_URL",
    "CLIENT_URL",
    "FRONTEND_URL",
    "MY_GMAIL",
    "MY_PASS",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "Cloud_Name",
    "Cloud_Api",
    "Cloud_Secret",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET"
  ];

  for (const key of keys) {
    if (process.env[key] != null) {
      process.env[key] = trim(process.env[key]);
    }
  }

  if (!process.env.MONGO_URI && process.env.MONGO_URL) {
    process.env.MONGO_URI = process.env.MONGO_URL;
  }

  if (!process.env.REFRESH_TOKEN_SEC && process.env.JWT_SEC) {
    process.env.REFRESH_TOKEN_SEC = `${process.env.JWT_SEC}-refresh`;
  }

  if (!process.env.SESSION_SECRET && process.env.JWT_SEC) {
    process.env.SESSION_SECRET = `${process.env.JWT_SEC}-session`;
  }

  if (!process.env.FRONTEND_URL && process.env.CLIENT_URL) {
    process.env.FRONTEND_URL = process.env.CLIENT_URL;
  }
}

function hasDatabaseInUri(uri) {
  const base = uri.split("?")[0];
  const afterHost = base.replace(/^mongodb(\+srv)?:\/\//i, "");
  return afterHost.includes("/") && afterHost.split("/").slice(1).join("/").length > 0;
}

/**
 * Build Mongo connection string for a service database.
 * Uses `MONGO_URI` / `MONGO_URL` from root `.env`; appends db name when missing.
 */
export function buildMongoUri(databaseName) {
  const explicit = process.env.MONGO_URI || process.env.MONGO_URL;
  if (!explicit) {
    return `mongodb://localhost:27017/${databaseName}`;
  }

  if (hasDatabaseInUri(explicit)) {
    return explicit;
  }

  const qIndex = explicit.indexOf("?");
  if (qIndex === -1) {
    return `${explicit.replace(/\/$/, "")}/${databaseName}`;
  }

  const base = explicit.slice(0, qIndex).replace(/\/$/, "");
  const query = explicit.slice(qIndex);
  return `${base}/${databaseName}${query}`;
}

export function servicePort(serviceDir, fallback) {
  const map = {
    gateway: "GATEWAY_PORT",
    "auth-service": "AUTH_PORT",
    "pin-service": "PIN_PORT",
    "chat-service": "CHAT_PORT",
    "notification-service": "NOTIFICATION_PORT",
    "search-service": "SEARCH_PORT"
  };
  const key = map[serviceDir];
  if (key && process.env[key]) {
    return Number(process.env[key]);
  }
  if (process.env.PORT) {
    return Number(process.env.PORT);
  }
  return fallback;
}
