import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth";
import { normalizeProductImageUrl } from "@/lib/image-url";
import {
  deleteProductById,
  getProductById,
  isValidProductStatus,
  updateProductById,
  type ProductUpdateInput,
  type ProductView,
} from "@/lib/product-service";
import { type ProductDetails } from "@/models/Product";

export const dynamic = "force-dynamic";
const INRCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUpdateProductPayload(payload: unknown): ProductUpdateInput {
  if (!isPlainObject(payload)) {
    throw new RequestValidationError("Payload must be a JSON object.");
  }

  const source = payload as Record<string, unknown>;
  const update: ProductUpdateInput = {};

  if ("name" in source) {
    update.name = String(source.name ?? "").trim();
  }

  if ("price" in source) {
    const parsedPrice = Number(source.price);

    if (!Number.isFinite(parsedPrice)) {
      throw new RequestValidationError("price must be a valid number.");
    }

    update.price = parsedPrice;
  }

  if ("images" in source) {
    if (!Array.isArray(source.images)) {
      throw new RequestValidationError("images must be an array of URLs.");
    }

    const images = source.images
      .map((image) => normalizeProductImageUrl(String(image).trim()))
      .filter(Boolean);

    if (images.length === 0) {
      throw new RequestValidationError("images must contain at least one item.");
    }

    update.images = images;
  }

  if ("description" in source) {
    update.description = String(source.description ?? "").trim();
  }

  if ("status" in source) {
    const status = String(source.status ?? "");

    if (!isValidProductStatus(status)) {
      throw new RequestValidationError("Invalid status value. Use in_stock, out_of_stock, or preorder.");
    }

    update.status = status;
  }

  if ("isAvailable" in source) {
    if (typeof source.isAvailable !== "boolean") {
      throw new RequestValidationError("isAvailable must be a boolean.");
    }

    update.isAvailable = source.isAvailable;
  }

  if ("deliveryTime" in source || "deliveryDetails" in source) {
    const deliveryTime = String(source.deliveryTime ?? source.deliveryDetails ?? "").trim();

    if (!deliveryTime) {
      throw new RequestValidationError("deliveryTime cannot be empty.");
    }

    update.deliveryTime = deliveryTime;
  }

  if ("details" in source) {
    if (!isPlainObject(source.details)) {
      throw new RequestValidationError("details must be an object.");
    }

    update.details = source.details as ProductDetails;
  }

  if (Object.keys(update).length === 0) {
    throw new RequestValidationError("No updatable fields provided.");
  }

  return update;
}

function toApiResponse(product: ProductView) {
  return {
    ...product,
    displayPrice: INRCurrencyFormatter.format(product.price),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product: toApiResponse(product) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/products/[id] failed", error);
    return NextResponse.json(
      { error: "Could not fetch product details. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const payload = await request.json();
    const updates = normalizeUpdateProductPayload(payload);
    const product = await updateProductById(id, updates);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product: toApiResponse(product) }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const details = Object.values(error.errors).map((issue) => issue.message);
      return NextResponse.json(
        {
          error: "Product validation failed.",
          details,
        },
        { status: 400 }
      );
    }

    console.error("PUT /api/products/[id] failed", error);
    return NextResponse.json(
      { error: "Could not update product. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const deleted = await deleteProductById(id);

    if (!deleted) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/products/[id] failed", error);
    return NextResponse.json(
      { error: "Could not delete product. Please try again." },
      { status: 500 }
    );
  }
}
