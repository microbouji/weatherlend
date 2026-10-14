import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { uploadsDir } from "@/lib/photos";

// Serves uploaded item photos from UPLOADS_DIR (same path the DB stores).
// Filenames are UUIDs minted by lib/photos.ts; anything else 404s.

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

interface Params {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { path } = await params;
  if (path.length !== 1 || !/^[\w-]+\.(jpg|png|webp|gif)$/.test(path[0])) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(join(uploadsDir(), path[0]));
    const ext = path[0].split(".").pop() ?? "";
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
