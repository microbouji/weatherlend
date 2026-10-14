import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BookingError } from "./loans";

// Optional item photos. Files land in UPLOADS_DIR (default ./data/uploads,
// git-ignored); the DB only stores the public path "/uploads/<file>", served
// by app/uploads/[...path]/route.ts so local and demo hosting behave the same.
// Items without a photo render a styled placeholder instead.
// TODO(follow-up): swap this module for object storage (e.g. Supabase
// Storage); the DB column and all call sites stay the same.

const MAX_BYTES = 5 * 1024 * 1024;

/** Where uploaded photos live. Overridable for hosts without a writable disk. */
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), "data", "uploads");
}
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Validates and stores an uploaded photo. Returns its public path. */
export async function savePhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new BookingError("Photo must be a JPG, PNG, WebP or GIF file.");
  }
  if (file.size > MAX_BYTES) {
    throw new BookingError("Photo must be smaller than 5 MB.");
  }
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${EXTENSIONS[file.type]}`;
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

/** Empty uploads return null — the caller renders the placeholder. */
export async function saveOptionalPhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  return savePhoto(file);
}
