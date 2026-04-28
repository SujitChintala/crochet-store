import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth";
import {
  UserConflictError,
  UserValidationError,
  createUser,
  getUsers,
  hasAdminUsers,
  isValidUserRole,
} from "@/lib/user-service";
import { type UserRole } from "@/models/User";

export const dynamic = "force-dynamic";

class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

type CreateUserPayload = {
  email: string;
  password: string;
  role?: UserRole;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCreateUserPayload(payload: unknown): CreateUserPayload {
  if (!isPlainObject(payload)) {
    throw new RequestValidationError("Payload must be a JSON object.");
  }

  const source = payload as Record<string, unknown>;
  const roleValue = source.role === undefined ? undefined : String(source.role);
  let role: UserRole | undefined;

  if (roleValue !== undefined) {
    if (!isValidUserRole(roleValue)) {
      throw new RequestValidationError("Invalid role. Use admin or customer.");
    }

    role = roleValue;
  }

  return {
    email: String(source.email ?? "").trim(),
    password: String(source.password ?? ""),
    role,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminUser(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const users = await getUsers();
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users failed", error);
    return NextResponse.json(
      { error: "Could not fetch users. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = normalizeCreateUserPayload(payload);

    if (input.role === "admin") {
      const adminExists = await hasAdminUsers();

      if (adminExists) {
        const auth = await requireAdminUser(request);

        if (!auth.ok) {
          return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
      }
    }

    const user = await createUser(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (error instanceof UserValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof UserConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const details = Object.values(error.errors).map((issue) => issue.message);
      return NextResponse.json(
        {
          error: "User validation failed.",
          details,
        },
        { status: 400 }
      );
    }

    console.error("POST /api/users failed", error);
    return NextResponse.json(
      { error: "Could not create user. Please try again." },
      { status: 500 }
    );
  }
}
