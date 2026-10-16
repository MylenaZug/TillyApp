import { mkdir } from "fs/promises";
import path from "path";

export function uploadsDir() {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR || "./uploads");
}

export async function ensureUploadsDir() {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extForMime(mime: string) {
  return EXT_BY_MIME[mime] || "jpg";
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
