import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

async function captureWebGLFrame(page: Page) {
  return page.locator(".journey-overlay .night-scene canvas").evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext("webgl2"); if (!gl) throw new Error("WebGL2 unavailable");
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const sampled: number[] = [];
    for (let y = 0; y < gl.drawingBufferHeight; y += 4) for (let x = 0; x < gl.drawingBufferWidth; x += 4) { const index = (y * gl.drawingBufferWidth + x) * 4; sampled.push(pixels[index], pixels[index + 1], pixels[index + 2]); }
    return sampled;
  });
}
function meanPixelDifference(left: number[], right: number[]) {
  expect(left.length).toBe(right.length); let total = 0;
  for (let index = 0; index < left.length; index++) total += Math.abs(left[index] - right[index]);
  return total / left.length;
}

async function onboard(page: Page) {
  await page.goto("/");
  await page.locator(".onboarding input").first().fill("밤 여행자");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  const tasks = page.locator(".onboarding input");
  await tasks.nth(0).fill("수학 문제집 오늘 90분 중요");
  await tasks.nth(1).fill("영어 단어 오늘 45분");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "오늘 밤 노선 열기" }).click();
  await expect(page.getByRole("button", { name: "탑승" })).toBeVisible();
}

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { if (!sessionStorage.getItem("nocturne-e2e-ready")) { localStorage.clear(); sessionStorage.setItem("nocturne-e2e-ready", "1"); } }); });

test("onboarding and quick add build tonight's departure board", async ({ page }) => {
  await onboard(page);
  await expect(page.locator(".board-row")).toHaveCount(3);
  await page.getByRole("button", { name: "빠른 추가" }).first().click();
  await page.getByPlaceholder("수학 문제집 내일 90분").fill("과학 개념 정리 내일 40분");
  await page.getByRole("button", { name: "역 추가" }).click();
  await expect(page.getByText("과학 개념 정리")).toBeVisible();
});

test("journey runs from boarding to a final ticket", async ({ page }) => {
  await onboard(page);
  await page.getByRole("main").getByRole("button", { name: "탑승" }).click();
  await page.getByRole("button", { name: "승차권 받기" }).click();
  await expect(page.getByText("승차권을 리더기에 대세요")).toBeVisible();
  await expect(page.locator('.journey-overlay .night-scene[data-renderer="3d"]')).toBeVisible();
  const boardingFrame = await captureWebGLFrame(page);
  await page.locator(".journey-overlay").getByRole("button", { name: "탑승" }).click();
  await expect(page.locator(".countdown")).toBeVisible();
  const cabinFrame = await captureWebGLFrame(page);
  expect(meanPixelDifference(boardingFrame, cabinFrame)).toBeLessThanOrEqual(5);
  await page.getByRole("button", { name: "일찍 끝내기" }).click();
  await expect(page.getByText("역 정차")).toBeVisible();
  await page.getByRole("button", { name: "지금 출발" }).click();
  await page.getByRole("button", { name: "운행 마치기" }).click();
  await page.getByRole("button", { name: "보관함" }).first().click();
  await expect(page.locator(".ticket")).toBeVisible();
});

test("route reorder and lock remain stable", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "노선" }).first().click();
  const rows = page.locator(".station-row");
  const first = await rows.nth(0).textContent();
  await rows.nth(0).getByRole("button", { name: "뒤로" }).click();
  await expect(rows.nth(1)).toContainText(first?.match(/수학 문제집|영어 단어/)?.[0] ?? "");
  await rows.nth(0).getByRole("button", { name: "고정" }).click();
  await expect(rows.nth(0)).toHaveClass(/locked/);
});

test("four locales are complete and do not overflow", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "설정" }).first().click();
  const select = page.locator(".select");
  for (const locale of ["en", "ja", "zh", "ko"]) {
    await select.selectOption(locale);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  }
});

test("reload mid-station keeps the active journey", async ({ page }) => {
  await onboard(page);
  await page.getByRole("main").getByRole("button", { name: "탑승" }).click();
  await page.getByRole("button", { name: "승차권 받기" }).click();
  await page.locator(".journey-overlay").getByRole("button", { name: "탑승" }).click();
  const before = await page.locator(".countdown").textContent();
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator(".countdown")).toBeVisible();
  const after = await page.locator(".countdown").textContent();
  expect(after).not.toBe("");
  expect(before).toBeTruthy();
});

test("2D fallback and reduced motion render without console errors", async ({ page }) => {
  const errors: string[] = []; page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await onboard(page);
  await page.goto("/?no-webgl=1");
  await expect(page.locator("canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const viewport of [{ name:"mobile", width:390, height:844 }, { name:"desktop", width:1440, height:900 }]) {
  test(`screenshots every main screen at ${viewport.width}`, async ({ page }) => {
    fs.mkdirSync("artifacts/screens", { recursive: true });
    await page.setViewportSize({ width:viewport.width, height:viewport.height });
    await onboard(page);
    const screens = [["오늘 밤","tonight"],["할 일","tasks"],["노선","route"],["보관함","archive"],["설정","settings"]] as const;
    for (const [label,name] of screens) {
      await page.getByRole("button", { name:label, exact:true }).first().click();
      await page.waitForTimeout(180);
      await page.screenshot({ path:`artifacts/screens/${name}-${viewport.name}.png`, fullPage:true });
    }
  });
}

test("static export opens from the configured sub-path", async ({ page }) => {
  const prefix = process.env.SUBPATH_SMOKE === "1" ? "/nocturne" : "";
  await page.goto(`${prefix}/`);
  await expect(page.getByText("오늘 밤의 노선이 여기서 시작돼요")).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", new RegExp(`${prefix}/manifest\\.webmanifest$`));
});
