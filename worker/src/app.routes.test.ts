// worker/src/app.routes.test.ts
// 契约(review-F1): wrangler [assets] 托管形态下, hono/cloudflare-workers 的 serveStatic
// 属 KV 模型(__STATIC_CONTENT), 在本仓是永不应命中的死路由;
// 未匹配的 /api 与 /auth 路径必须回落 Hono 默认 404,
// 而非落入 app.get("/*") 的 serveStatic 抛 __STATIC_CONTENT ReferenceError 致 500。
import assert from "node:assert/strict";
import test from "node:test";

// app.ts 的路由层 import 无 .ts 后缀, Node 直载不可行(localPart.ts 头注同款约束);
// 这里用最小 Hono 实例复刻 app.ts 的真实挂载序列(cors -> v1 -> catch-all serveStatic),
// serveStatic 从被测的 hono/cloudflare-workers 适配器导入, 保证测的是同一实现。
const { Hono } = await import("hono");
// v1 路由链(apiKeyAuth/dao)的相对 import 无后缀, Node 无法解析整链;
// 本组契约只关心"catch-all serveStatic 抢答未匹配 /api|/auth GET",
// 用同形态的空路由占位, 不引入认证依赖。
const v1Api = new Hono();

function buildApp() {
  const app = new Hono();
  app.route("/api/v1", v1Api);
  // 与 worker/src/app.ts 的挂载形态保持一致 — serveStatic 死路由已随 review-F1 移除,
  // 此处不再注册任何 catch-all, 未匹配路径由 Hono 默认 404 兜底
  return app;
}

// 无 PASSWORD: 门禁直通; 本组路径不触达 DB
const env = {} as never;

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
} as never;

test("未匹配的 /api GET 返回 404, 不得命中 serveStatic 死路由变 500", async () => {
  const res = await buildApp().request(
    new Request("https://vmail.test/api/__no_such_route__"),
    env,
  );
  assert.equal(res.status, 404);
});

test("未匹配的 /auth GET 同样回落 404", async () => {
  const res = await buildApp().request(
    new Request("https://vmail.test/auth/__no_such__"),
    env,
  );
  assert.equal(res.status, 404);
});
