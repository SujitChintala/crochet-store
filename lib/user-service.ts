import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/password";
import { USER_ROLES, User, type UserRole } from "@/models/User";

export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserValidationError";
  }
}

export class UserConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserConflictError";
  }
}

export type UserView = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

type UserRecord = {
  _id: { toString(): string };
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

type CreateUserInput = {
  email: string;
  password: string;
  role?: UserRole;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapUser(user: UserRecord): UserView {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapAuthenticatedUser(user: UserRecord): AuthenticatedUser {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };
}

export function isValidUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export async function createUser(input: CreateUserInput) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const role = input.role ?? "customer";

  if (!isValidEmail(email)) {
    throw new UserValidationError("A valid email is required.");
  }

  if (password.length < 8) {
    throw new UserValidationError("Password must be at least 8 characters.");
  }

  if (!isValidUserRole(role)) {
    throw new UserValidationError("Invalid role. Use admin or customer.");
  }

  await connectToDatabase();

  const existing = await User.findOne({ email }).select("_id").lean<{ _id: { toString(): string } }>();

  if (existing) {
    throw new UserConflictError("A user with this email already exists.");
  }

  const created = await User.create({
    email,
    passwordHash: hashPassword(password),
    role,
  });

  const createdUser = await User.findById(created._id).lean<UserRecord>();

  if (!createdUser) {
    throw new Error("Created user could not be loaded.");
  }

  return mapUser(createdUser);
}

export async function getUsers() {
  await connectToDatabase();
  const users = await User.find().sort({ createdAt: -1 }).lean<UserRecord[]>();
  return users.map(mapUser);
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  await connectToDatabase();

  const user = await User.findOne({ email: normalizedEmail }).lean<UserRecord>();

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return mapAuthenticatedUser(user);
}

export async function hasAdminUsers() {
  await connectToDatabase();
  const admin = await User.exists({ role: "admin" });
  return Boolean(admin);
}
