import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { NextResponse } from "next/server";

const DEFAULT_BANNER_PATH =
  "C:\\Users\\HI\\AppData\\Roaming\\Code\\User\\globalStorage\\github.copilot-chat\\copilot-cli-images\\1777356969663-q6otok1n.png";

const BANNER_IMAGE_PATH = process.env.HOMEPAGE_BANNER_PATH ?? DEFAULT_BANNER_PATH;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET() {
  const imageBuffer = await readFile(BANNER_IMAGE_PATH);
  const extension = extname(BANNER_IMAGE_PATH).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(imageBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
