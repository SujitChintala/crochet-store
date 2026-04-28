import { authenticateUser, type AuthenticatedUser } from "@/lib/user-service";

type AuthCheckSuccess = {
  ok: true;
  user: AuthenticatedUser;
};

type AuthCheckFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type AuthCheckResult = AuthCheckSuccess | AuthCheckFailure;

type BasicCredentials = {
  email: string;
  password: string;
};

function getDevelopmentAdminFromRequest(request: Request): AuthenticatedUser | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const role = request.headers.get("x-dev-admin-role");
  const email = request.headers.get("x-dev-admin-email")?.trim().toLowerCase();
  const password = request.headers.get("x-dev-admin-password")?.trim();

  if (role !== "admin" || !email || !password) {
    return null;
  }

  return {
    id: "dev-admin",
    email,
    role: "admin",
  };
}

function parseBasicCredentials(request: Request): BasicCredentials | null {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader || !authorizationHeader.startsWith("Basic ")) {
    return null;
  }

  const encoded = authorizationHeader.slice(6).trim();

  if (!encoded) {
    return null;
  }

  let decoded = "";

  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex <= 0) {
    return null;
  }

  const email = decoded.slice(0, separatorIndex).trim();
  const password = decoded.slice(separatorIndex + 1);

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export async function getAuthenticatedUserFromRequest(request: Request) {
  const developmentAdmin = getDevelopmentAdminFromRequest(request);

  if (developmentAdmin) {
    return developmentAdmin;
  }

  const credentials = parseBasicCredentials(request);

  if (!credentials) {
    return null;
  }

  return authenticateUser(credentials.email, credentials.password);
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthCheckResult> {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required. Use Basic auth with email and password.",
    };
  }

  return { ok: true, user };
}

export async function requireAdminUser(request: Request): Promise<AuthCheckResult> {
  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    return auth;
  }

  if (auth.user.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Admin access required.",
    };
  }

  return auth;
}
