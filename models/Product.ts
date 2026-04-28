import { model, models, Schema, type Model } from "mongoose";

export const PRODUCT_STATUSES = ["in_stock", "out_of_stock", "preorder"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductDetails = Record<string, unknown>;

export type ProductInput = {
  name: string;
  price: number;
  images: string[];
  description: string;
  status?: ProductStatus;
  isAvailable?: boolean;
  deliveryTime?: string;
  deliveryDetails?: string;
  details?: ProductDetails;
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
    deliveryTime: {
      type: String,
      default: "Ships within 3-5 business days.",
      trim: true,
      maxlength: [160, "Delivery time cannot exceed 160 characters."],
    },
    deliveryDetails: {
      type: String,
      trim: true,
      maxlength: [160, "Delivery details cannot exceed 160 characters."],
    },
    details: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ status: 1, isAvailable: 1, createdAt: -1 });

export const Product: Model<ProductInput> =
  (models.Product as Model<ProductInput>) || model<ProductInput>("Product", ProductSchema);
