import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const uid = Date.now().toString(36);

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
}

test("owner creates, publishes and manages an event; guest RSVPs; staff checks in", async ({ page, browser, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await register(page, "Sokha Owner", `owner-${uid}@example.com`);

  // Event wizard
  await page.goto("/dashboard/events/new?template=ivory-champagne");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /ពិធីមង្គលការ/ }).first().click();
  await page.fill("#title", "E2E Wedding");
  await page.fill("#hk", "វិចិត្រ & សុភ័ក្ត្រ");
  await page.fill("#he", "Vichet & Sopheak");
  await page.fill("#date", "2027-03-20");
  await page.fill("#st", "17:00");
  await page.fill("#vn", "Diamond Island Hall");
  await page.getByRole("button", { name: "បន្ទាប់" }).click();
  await page.getByRole("button", { name: "បន្ទាប់" }).click();
  await page.getByRole("button", { name: /បង្កើត/ }).click();
  await page.waitForURL("**/builder");
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)![1];

  // Builder: edit + autosave + live preview + undo
  await page.getByRole("button", { name: "សេចក្ដីអញ្ជើញ", exact: true }).click();
  await page.locator("textarea[id$='.body-km']").fill("សូមគោរពអញ្ជើញចូលរួម (E2E)");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await expect(page.getByText("បានរក្សាទុក")).toBeVisible({ timeout: 10_000 });
  await expect(page.frameLocator("iframe").first().getByText("(E2E)")).toBeVisible();

  // Publish
  await page.locator("header").getByRole("button", { name: /ផ្សព្វផ្សាយ/ }).first().click();
  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByText("កំពុងផ្សព្វផ្សាយ")).toBeVisible();

  // Guest import with duplicate detection
  await page.goto(`/dashboard/events/${eventId}/guests`);
  await page.getByRole("button", { name: "នាំចូល" }).first().click();
  const csv = path.join(os.tmpdir(), `guests-${uid}.csv`);
  fs.writeFileSync(csv, "Name,Khmer name,Title,Phone,Group,Allowed\nSok Dara,សុខ ដារ៉ា,លោក,012111222,Friends,2\nChan Lina,ចាន់ លីណា,កញ្ញា,,Friends,1\nSok Dara,សុខ ដារ៉ា,លោក,012111222,Friends,2\n");
  await page.setInputFiles("input[type=file]", csv);
  await page.getByRole("button", { name: "ពិនិត្យមុន" }).click();
  await expect(page.getByText("ស្ទួន").first()).toBeVisible();
  await page.getByRole("button", { name: /នាំចូល 2 នាក់/ }).click();
  await page.reload();
  await expect(page.getByText("ចាន់ លីណា")).toBeVisible();

  // Personal link
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByTitle("ចម្លងតំណ").first().click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/i/");

  // Guest (no account)
  const gctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await gctx.newPage();
  const res = await guest.goto(link);
  expect(res!.headers()["x-robots-tag"]).toContain("noindex");
  await guest.getByRole("button", { name: "បើកធៀប" }).click();
  await expect(guest.getByText("សុខ ដារ៉ា").first()).toBeVisible();
  await guest.getByRole("button", { name: "ចូលរួម", exact: true }).click();
  await guest.getByRole("button", { name: "+" }).click();
  await expect(guest.getByRole("button", { name: "+" })).toBeDisabled(); // capped at allowance (2)
  await guest.getByRole("button", { name: "ផ្ញើការឆ្លើយតប" }).click();
  await expect(guest.getByText("អរគុណ! យើងរង់ចាំជួបលោកអ្នក។")).toBeVisible();
  await guest.goto(link.slice(0, -2) + "xx");
  await expect(guest.getByText("តំណធៀបនេះមិនអាចប្រើបានទេ")).toBeVisible();

  // Dashboard reflects the response
  await page.goto(`/dashboard/events/${eventId}/rsvp`);
  await expect(page.getByText("សុខ ដារ៉ា").first()).toBeVisible();

  // Check-in
  await page.goto(`/dashboard/events/${eventId}/checkin`);
  await page.fill("input[placeholder*='ស្វែងរក']", "ដារ៉ា");
  await page.getByRole("button", { name: /សុខ ដារ៉ា/ }).first().click();
  await page.getByRole("button", { name: "បញ្ជាក់ Check-in" }).click();
  await expect(page.getByText("✓ បាន Check-in 2 នាក់")).toBeVisible();

  // Seating persists
  await page.goto(`/dashboard/events/${eventId}/seating`);
  await page.getByRole("button", { name: "បន្ថែមតុ" }).click();
  await page.getByRole("button", { name: "បញ្ជី" }).click();
  await page.locator("select[aria-label^='Table for Sok Dara']").selectOption({ index: 1 });
  await page.waitForTimeout(1000);
  await page.reload();
  await page.getByRole("button", { name: "បញ្ជី" }).click();
  await expect(page.locator("select[aria-label^='Table for Sok Dara']")).not.toHaveValue("");

  // Money is exact
  await page.goto(`/dashboard/events/${eventId}/gifts`);
  for (const amt of ["0.10", "0.20"]) {
    await page.getByRole("button", { name: "កត់ត្រាចំណងដៃ" }).click();
    await page.fill("#gf-a", amt);
    await page.getByRole("button", { name: "រក្សាទុក" }).click();
    await page.waitForTimeout(800);
  }
  await expect(page.getByText("$0.30").first()).toBeVisible();

  // Tenant isolation
  const octx = await browser.newContext();
  const other = await octx.newPage();
  await register(other, "Other", `other-${uid}@example.com`);
  expect((await other.goto(`/dashboard/events/${eventId}/guests`))!.status()).toBe(404);
  expect((await other.request.get(`/api/events/${eventId}/export?kind=guests`)).status()).toBe(404);
  await other.goto("/admin");
  expect(other.url()).not.toContain("/admin");

  expect(errors).toEqual([]);
});
