import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    return NextResponse.json({ user: auth.user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users/me failed", error);
    return NextResponse.json(
      { error: "Could not fetch current user. Please try again." },
      { status: 500 }
    );
  }
}
