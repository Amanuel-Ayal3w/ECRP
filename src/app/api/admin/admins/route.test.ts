import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockHashPassword = vi.fn();
const mockGenerateId = vi.fn();
const mockDbSelect = vi.fn();
const mockDbTransaction = vi.fn();

vi.mock("@/lib/auth-admin", () => ({
  authAdmin: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    transaction: (...args: unknown[]) => mockDbTransaction(...args),
  },
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}));

vi.mock("@better-auth/core/utils/id", () => ({
  generateId: (...args: unknown[]) => mockGenerateId(...args),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

const { POST } = await import("./route");

function createSelectChain(rows: Array<{ id: string }>) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe("POST /api/admin/admins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHashPassword.mockResolvedValue("hashed-password");
    mockGenerateId.mockReset();
    mockGenerateId.mockReturnValue("generated-id");
    mockDbSelect.mockImplementation(() => createSelectChain([]));
    mockDbTransaction.mockImplementation(async (cb: (tx: { insert: (table: unknown) => { values: (payload: unknown) => Promise<void> } }) => Promise<void>) => {
      const tx = {
        insert: vi.fn(() => ({
          values: vi.fn(async () => undefined),
        })),
      };
      await cb(tx);
    });
  });

  it("returns 401 when session is missing", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "admin@example.com", password: "password123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for non-super-admin", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", role: "admin" } });

    const request = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "admin@example.com", password: "password123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/super administrator/i);
  });

  it("returns 400 for invalid json", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", role: "super_admin" } });

    const request = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 for invalid payload", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", role: "super_admin" } });

    const request = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: " ", email: "not-an-email", password: "short" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/valid name and email/i);
  });

  it("returns 409 when email already exists", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", role: "super_admin" } });
    mockDbSelect.mockImplementation(() => createSelectChain([{ id: "existing-id" }]));

    const request = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New Admin", email: "admin@example.com", password: "password123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already exists/i);
  });

  it("creates admin account for valid request", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", role: "super_admin" } });
    mockGenerateId.mockReturnValueOnce("user-id-1").mockReturnValueOnce("account-id-1");

    const request = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New Admin", email: "ADMIN@EXAMPLE.COM", password: "password123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      user: {
        id: "user-id-1",
        name: "New Admin",
        email: "admin@example.com",
        role: "admin",
      },
    });
    expect(mockHashPassword).toHaveBeenCalledWith("password123");
    expect(mockDbTransaction).toHaveBeenCalledTimes(1);
  });
});
