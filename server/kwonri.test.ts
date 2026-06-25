import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("kwonri.list", () => {
  it("returns list with default active status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.kwonri.list({
      page: 1,
      pageSize: 10,
      status: "active",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("returns hold status items", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.kwonri.list({
      page: 1,
      pageSize: 10,
      status: "hold",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe("kwonri.managers", () => {
  it("returns list of managers", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.kwonri.managers();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("customer.list", () => {
  it("returns customer list", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.customer.list({
      page: 1,
      pageSize: 10,
      status: "active",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe("search.phone", () => {
  it("returns search results for phone query", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.search.phone({ query: "0000" });
    expect(result).toHaveProperty("kwonri");
    expect(result).toHaveProperty("customers");
    expect(Array.isArray(result.kwonri)).toBe(true);
    expect(Array.isArray(result.customers)).toBe(true);
  });
});

describe("customer.update (inline edit)", () => {
  it("updates customer fields and returns success", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    // 첫 번째 고객 조회
    const listResult = await caller.customer.list({ page: 1, pageSize: 1, status: "all", sortBy: "updatedAt", sortOrder: "desc" });
    if (listResult.items.length === 0) return; // DB 비어있으면 skip
    const firstId = listResult.items[0].id;
    const result = await caller.customer.update({
      id: firstId,
      memo: "인라인 편집 테스트",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("updates customer buyerDetail field", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const listResult = await caller.customer.list({ page: 1, pageSize: 1, status: "all", sortBy: "updatedAt", sortOrder: "desc" });
    if (listResult.items.length === 0) return;
    const firstId = listResult.items[0].id;
    const result = await caller.customer.update({
      id: firstId,
      buyerDetail: "구입자상세내역 테스트",
    });
    expect(result).toHaveProperty("success", true);
  });
});
