import { NextResponse } from "next/server";

import { getProductById } from "@/lib/product-service";

export const dynamic = "force-dynamic";

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

    return NextResponse.json(
      {
        product: {
          ...product,
          displayPrice: `$${product.price.toFixed(2)}`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/products/[id] failed", error);
    return NextResponse.json(
      { error: "Could not fetch product details. Please try again." },
      { status: 500 }
    );
  }
}