import { mkdir } from "fs/promises";
import path from "path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const THUMB_SIZE = 400;

// Nur diese Formate werden akzeptiert; die Dateiendung wird aus dem vom Server per sharp
// erkannten Format abgeleitet, nie aus dem vom Client gemeldeten Namen/MIME-Typ.
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
};

export function extForFormat(format: string | undefined) {
  return format ? EXT_BY_FORMAT[format] : undefined;
}

export function uploadsDir() {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR || "./uploads");
}

export function thumbsDir() {
  return path.join(uploadsDir(), "thumbs");
}

export async function ensureUploadsDirs() {
  await mkdir(thumbsDir(), { recursive: true });
  return uploadsDir();
}

export function thumbFilename(id: string) {
  return `${id}.jpg`;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function mimeForFilename(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

// USER_DISPLAY_NAMES: JSON-Objekt { "mail@example.com": "Name" } (siehe .env.example)
export function displayNameFor(email: string) {
  try {
    const map = JSON.parse(process.env.USER_DISPLAY_NAMES || "{}") as Record<string, string>;
    return map[email] || email.split("@")[0];
  } catch {
    return email.split("@")[0];
  }
}
