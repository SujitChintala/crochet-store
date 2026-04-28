import mongoose from "mongoose";

import { normalizeProductImageUrl } from "@/lib/image-url";
import { connectToDatabase } from "@/lib/mongodb";
import {
  Product,
  PRODUCT_STATUSES,
  type ProductDetails,
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
  deliveryTime: string;
  deliveryDetails: string;
  details: ProductDetails;
  createdAt: string;
  updatedAt: string;
};

export type ProductUpdateInput = Partial<{
  name: string;
  price: number;
  images: string[];
  description: string;
  status: ProductStatus;
  isAvailable: boolean;
  deliveryTime: string;
  details: ProductDetails;
}>;

type ProductRecord = {
  _id: { toString(): string };
  name: string;
  price: number;
  images: string[];
  description: string;
  status: ProductStatus;
  isAvailable: boolean;
  deliveryTime?: string;
  deliveryDetails?: string;
  details?: ProductDetails | Map<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toIsoString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeProductDetails(details: ProductRecord["details"]): ProductDetails {
  if (!details) {
    return {};
  }

  if (details instanceof Map) {
    return Object.fromEntries(details.entries());
  }

  if (typeof details === "object") {
    return details;
  }

  return {};
}

function resolveDeliveryTime(product: ProductRecord) {
  const value = product.deliveryTime?.trim() || product.deliveryDetails?.trim();
  return value || "Ships within 3-5 business days.";
}

function mapProduct(product: ProductRecord): ProductView {
  const deliveryTime = resolveDeliveryTime(product);

  return {
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    images: product.images.map((image) => normalizeProductImageUrl(image)),
    description: product.description,
    status: product.status,
    isAvailable: product.isAvailable,
    deliveryTime,
    deliveryDetails: deliveryTime,
    details: normalizeProductDetails(product.details),
    createdAt: toIsoString(product.createdAt),
    updatedAt: toIsoString(product.updatedAt),
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

  const products = await Product.find(filter).sort({ createdAt: -1 }).lean<ProductRecord[]>();
  return products.map((item) => mapProduct(item));
}

export async function getProductById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  await connectToDatabase();
  const product = await Product.findById(id).lean<ProductRecord>();

  if (!product) {
    return null;
  }

  return mapProduct(product);
}

export async function createProduct(input: ProductInput) {
  await connectToDatabase();
  const { deliveryDetails, ...rest } = input;

  const created = await Product.create({
    ...rest,
    deliveryTime: rest.deliveryTime ?? deliveryDetails,
  });

  const createdProduct = await Product.findById(created._id).lean<ProductRecord>();

  if (!createdProduct) {
    throw new Error("Created product could not be loaded.");
  }

  return mapProduct(createdProduct);
}

export async function updateProductById(id: string, input: ProductUpdateInput) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  await connectToDatabase();
  const updated = await Product.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  }).lean<ProductRecord>();

  if (!updated) {
    return null;
  }

  return mapProduct(updated);
}

export async function deleteProductById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }

  await connectToDatabase();
  const deleted = await Product.findByIdAndDelete(id).select("_id").lean<{ _id: mongoose.Types.ObjectId }>();
  return Boolean(deleted);
}
