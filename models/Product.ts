import { model, models, Schema, type Model } from "mongoose";

export const PRODUCT_STATUSES = ["in_stock", "out_of_stock", "preorder"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type ProductInput = {
  name: string;
  price: number;
  images: string[];
  description: string;
  status?: ProductStatus;
  isAvailable?: boolean;
  deliveryDetails?: string;
};

export type ProductDocument = ProductInput & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

const ProductSchema = new Schema<ProductInput>(
  {
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
      maxlength: [120, "Name cannot exceed 120 characters."],
    },
    price: {
      type: Number,
      required: [true, "Price is required."],
      min: [0, "Price cannot be negative."],
    },
    images: {
      type: [String],
      required: [true, "At least one image is required."],
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length > 0,
        message: "At least one image is required.",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters."],
    },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: "in_stock",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    deliveryDetails: {
      type: String,
      default: "Ships within 3-5 business days.",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product: Model<ProductInput> =
  (models.Product as Model<ProductInput>) || model<ProductInput>("Product", ProductSchema);