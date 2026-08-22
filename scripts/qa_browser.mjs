import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const debuggingPort = Number(process.argv[2] ?? 9223);
const targetUrl = process.argv[3] ?? "http://127.0.0.1:5193/";
const outputDirectory = process.argv[4] ?? "docs/qa/current";

await mkdir(outputDirectory, { recursive: true });

const created = await fetch(
  `http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(targetUrl)}`,
  { method: "PUT" },
).then((response) => response.json());
const socket = new WebSocket(created.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", (message) => {
  const payload = JSON.parse(String(message.data));
  if (!payload.id) return;
  const waiter = pending.get(payload.id);
  if (!waiter) return;
  pending.delete(payload.id);
  if (payload.error) waiter.reject(new Error(payload.error.message));
  else waiter.resolve(payload.result);
});

function command(method, params = {}) {
  commandId += 1;
  const id = commandId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
};
const viewport = async (width, height, deviceScaleFactor = 1) => {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile: width < 700,
    screenWidth: width,
    screenHeight: height,
  });
  await wait(250);
};
const screenshot = async (name) => {
  const result = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(outputDirectory, name), Buffer.from(result.data, "base64"));
};
const waitFor = async (expression, timeoutMs = 6_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
};

try {
await command("Page.enable");
await command("Runtime.enable");
await viewport(1280, 720);
await wait(1_400);
await evaluate(`localStorage.removeItem("kessel-krawall-3d-run-v1"); localStorage.setItem("kessel-krawall-3d-onboarding-v1", "complete"); location.reload()`);
await wait(1_500);
await screenshot("workshop-desktop.png");

await evaluate(`document.querySelector(".offer")?.click()`);
await wait(90);
const purchaseAtNinetyMs = await evaluate(`({
  board: [...document.querySelectorAll(".board-controls button")].map((node) => node.getAttribute("aria-label")),
  feedback: document.querySelector(".purchase-feedback")?.textContent ?? null
})`);
await screenshot("purchase-flight.png");
await waitFor(`Boolean(document.querySelector('.board-controls button[aria-label*="Glut-Chili"]')) && !document.querySelector(".purchase-feedback")`, 4_000);
await wait(250);

await evaluate(`document.querySelector(".mobile-reroll")?.click()`);
await wait(160);
await evaluate(`[...document.querySelectorAll(".offer")].find((node) => node.textContent?.includes("Glut-Chili"))?.click()`);
await wait(1_020);
const mergeMidpoint = await evaluate(`({
  board: [...document.querySelectorAll(".board-controls button")].map((node) => node.getAttribute("aria-label")),
  feedback: document.querySelector(".purchase-feedback")?.textContent ?? null
})`);
await screenshot("merge-midpoint.png");
await waitFor(`!document.querySelector(".purchase-feedback") && !document.querySelector(".battle-button")?.disabled`, 5_000);
const mergeComplete = await evaluate(`[...document.querySelectorAll(".board-controls button")].map((node) => node.getAttribute("aria-label"))`);

await evaluate(`document.querySelector(".battle-button")?.click()`);
await waitFor(`Boolean(document.querySelector(".battle-hud"))`, 3_000);
await waitFor(`Boolean(document.querySelector(".combat-floating-number"))`, 8_000);
const combatFeedback = await evaluate(`({
  headline: document.querySelector(".battle-event")?.textContent ?? null,
  numbers: [...document.querySelectorAll(".combat-floating-number")].map((node) => node.textContent),
  statuses: [...document.querySelectorAll(".combat-status-badge")].map((node) => node.textContent)
})`);
await screenshot("battle-desktop.png");

await viewport(390, 844, 1);
await wait(500);
await screenshot("battle-mobile-portrait.png");
const portraitLayout = await evaluate(`(() => {
  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const value = node.getBoundingClientRect();
    return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    hud: rect(".battle-hud"),
    stats: rect(".run-stats"),
    utility: rect(".utility-controls"),
    result: rect(".result-panel")
  };
})()`);

await viewport(844, 390, 1);
await wait(500);
await screenshot("battle-mobile-landscape.png");
const landscapeLayout = await evaluate(`(() => {
  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const value = node.getBoundingClientRect();
    return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    hud: rect(".battle-hud"),
    stats: rect(".run-stats"),
    utility: rect(".utility-controls"),
    result: rect(".result-panel")
  };
})()`);

await viewport(1280, 720);
await evaluate(`(() => {
  const key = "kessel-krawall-3d-run-v1";
  const saved = JSON.parse(localStorage.getItem(key));
  saved.phase = "shop";
  saved.pendingBattle = null;
  saved.selectedSlot = null;
  saved.reserve = null;
  saved.board = [
    { uid: "qa-ember-core", itemId: "ember-core", level: 2 },
    { uid: "qa-chili", itemId: "chili", level: 1 },
    null, null, null
  ];
  localStorage.setItem(key, JSON.stringify(saved));
  location.reload();
})()`);
await waitFor(`Boolean(document.querySelector('.board-controls button[aria-label*="Glutkern"]'))`, 4_000);
await evaluate(`document.querySelector('.board-controls button[aria-label*="Glutkern"]')?.click()`);
await waitFor(`Boolean(document.querySelector(".selection-popover"))`, 2_000);
await wait(500);
const buffFeedback = await evaluate(`({
  selection: document.querySelector(".selection-popover")?.textContent ?? null,
  board: [...document.querySelectorAll(".board-controls button")].map((node) => node.getAttribute("aria-label"))
})`);
await screenshot("workshop-buff-links.png");

await evaluate(`(() => {
  const key = "kessel-krawall-3d-run-v1";
  const saved = JSON.parse(localStorage.getItem(key));
  saved.phase = "shop";
  saved.pendingBattle = null;
  saved.selectedSlot = null;
  saved.board = [{ uid: "qa-shroom", itemId: "slime-shroom", level: 2 }, null, null, null, null];
  localStorage.setItem(key, JSON.stringify(saved));
  location.reload();
})()`);
await waitFor(`Boolean(document.querySelector(".battle-button"))`, 4_000);
await evaluate(`document.querySelector(".battle-button")?.click()`);
await waitFor(`Boolean(document.querySelector(".combat-status-badge.status-poison"))`, 5_000);
const statusFeedback = await evaluate(`({
  badge: document.querySelector(".combat-status-badge.status-poison")?.textContent ?? null,
  title: document.querySelector(".combat-status-badge.status-poison")?.getAttribute("title") ?? null,
  headline: document.querySelector(".game-title p")?.textContent ?? null,
  numbers: [...document.querySelectorAll(".combat-floating-number")].map((node) => node.textContent),
  phase: document.querySelector("main")?.className ?? null,
  board: JSON.parse(localStorage.getItem("kessel-krawall-3d-run-v1"))?.board ?? null
})`);
await screenshot("battle-poison-status.png");

console.log(JSON.stringify({
  purchaseAtNinetyMs,
  mergeMidpoint,
  mergeComplete,
  combatFeedback,
  portraitLayout,
  landscapeLayout,
  buffFeedback,
  statusFeedback
}, null, 2));
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:${debuggingPort}/json/close/${created.id}`).catch(() => undefined);
}
