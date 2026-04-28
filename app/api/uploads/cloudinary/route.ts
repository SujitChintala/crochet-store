import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_FOLDER = "crochet-store/products";

class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary configuration is missing.");
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
  };
}

function createCloudinarySignature(
  params: Record<string, string>,
  apiSecret: string
) {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

async function uploadSingleImage(
  file: File,
  config: ReturnType<typeof getCloudinaryConfig>
) {
  if (!file.type.startsWith("image/")) {
    throw new UploadValidationError(`"${file.name}" is not an image file.`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadValidationError(`"${file.name}" exceeds 10MB limit.`);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = `product-${timestamp}-${randomUUID()}`;

  const signature = createCloudinarySignature(
    {
      folder: CLOUDINARY_FOLDER,
      public_id: publicId,
      timestamp,
    },
    config.apiSecret
  );

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("api_key", config.apiKey);
  uploadFormData.append("timestamp", timestamp);
  uploadFormData.append("folder", CLOUDINARY_FOLDER);
  uploadFormData.append("public_id", publicId);
  uploadFormData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: uploadFormData,
    }
  );

  const responseData = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(responseData.error?.message ?? "Cloudinary upload failed.");
  }

  if (!responseData.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return responseData.secure_url;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const entries = formData.getAll("files");
    const files = entries.filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      throw new UploadValidationError("At least one image file is required.");
    }

    const config = getCloudinaryConfig();
    const urls = await Promise.all(files.map((file) => uploadSingleImage(file, config)));

    return NextResponse.json({ urls }, { status: 200 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("POST /api/uploads/cloudinary failed", error);
    return NextResponse.json(
      { error: "Could not upload images. Please try again." },
      { status: 500 }
    );
  }
}
