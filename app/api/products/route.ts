import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth";
import { normalizeProductImageUrl } from "@/lib/image-url";
import {
  createProduct,
  getProducts,
  isValidProductStatus,
  type ProductView,
} from "@/lib/product-service";
import { type ProductDetails, type ProductInput } from "@/models/Product";

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

function normalizeCreateProductPayload(payload: unknown): ProductInput {
  if (!isPlainObject(payload)) {
    throw new RequestValidationError("Payload must be a JSON object.");
  }

  const source = payload as Partial<ProductInput> & { deliveryDetails?: string };
  const details = source.details;

  if (details !== undefined && !isPlainObject(details)) {
    throw new RequestValidationError("details must be an object.");
  }

  return {
    name: String(source.name ?? "").trim(),
    price: Number(source.price),
    images: Array.isArray(source.images)
      ? source.images
          .map((image) => normalizeProductImageUrl(String(image).trim()))
          .filter(Boolean)
      : [],
    description: String(source.description ?? "").trim(),
    status: source.status,
    isAvailable: source.isAvailable,
    deliveryTime: String(source.deliveryTime ?? source.deliveryDetails ?? "").trim() || undefined,
    details: details as ProductDetails | undefined,
  };
}

function toApiResponse(product: ProductView) {
  return {
    ...product,
    displayPrice: INRCurrencyFormatter.format(product.price),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const availableParam = searchParams.get("available");

    if (statusParam && !isValidProductStatus(statusParam)) {
      return NextResponse.json(
        {
          error: `Invalid status value. Use one of: in_stock, out_of_stock, preorder.`,
        },
        { status: 400 }
      );
    }

    const status = statusParam && isValidProductStatus(statusParam) ? statusParam : undefined;
    const onlyAvailable =
      availableParam === "true" ? true : availableParam === "false" ? false : undefined;

    const products = await getProducts({
      status,
      onlyAvailable,
    });

    return NextResponse.json({ products: products.map(toApiResponse) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/products failed", error);
    return NextResponse.json(
      { error: "Could not fetch products. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = await request.json();
    const input = normalizeCreateProductPayload(payload);
    const product = await createProduct(input);

    return NextResponse.json({ product: toApiResponse(product) }, { status: 201 });
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

    console.error("POST /api/products failed", error);
    return NextResponse.json(
      { error: "Could not create product. Please try again." },
      { status: 500 }
    );
  }
}
