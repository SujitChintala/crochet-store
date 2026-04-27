import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import {
  Product,
  PRODUCT_STATUSES,
  type ProductInput,
  type ProductStatus,
} from "@/models/Product";

export type ProductView = {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  status: ProductStatus;
  isAvailable: boolean;
  deliveryDetails: string;
  createdAt: string;
  updatedAt: string;
};

function mapProduct(product: {
  _id: { toString(): string };
  name: string;
  price: number;
  images: string[];
  description: string;
  status: ProductStatus;
  isAvailable: boolean;
  deliveryDetails: string;
  createdAt: Date;
  updatedAt: Date;
}): ProductView {
  return {
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    images: product.images,
    description: product.description,
    status: product.status,
    isAvailable: product.isAvailable,
    deliveryDetails: product.deliveryDetails,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function isValidProductStatus(value: string): value is ProductStatus {
  return PRODUCT_STATUSES.includes(value as ProductStatus);
}

export async function getProducts(options?: {
  status?: ProductStatus;
  onlyAvailable?: boolean;
}) {
  await connectToDatabase();

  const filter: { status?: ProductStatus; isAvailable?: boolean } = {};

  if (options?.status) {
    filter.status = options.status;
  }

  if (typeof options?.onlyAvailable === "boolean") {
    filter.isAvailable = options.onlyAvailable;
  }

  const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
  return products.map((item) => mapProduct(item as never));
}

export async function getProductById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  await connectToDatabase();
  const product = await Product.findById(id).lean();

  if (!product) {
    return null;
  }

  return mapProduct(product as never);
}

export async function createProduct(input: ProductInput) {
  await connectToDatabase();
  const created = await Product.create(input);
  return mapProduct(created.toObject() as never);
}