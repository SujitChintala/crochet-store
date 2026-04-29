import { model, models, Schema, type Model } from "mongoose";

export const USER_ROLES = ["admin", "customer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserInput = {
  email: string;
  passwordHash: string;
  role?: UserRole;
};

const UserSchema = new Schema<UserInput>(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [320, "Email cannot exceed 320 characters."],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<UserInput> = (models.User as Model<UserInput>) || model<UserInput>("User", UserSchema);
