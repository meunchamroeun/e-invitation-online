import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const uid = Date.now().toString(36);

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
}

test("Moonlit Jasmine is available from the catalogue and works in a new wedding", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "ei_locale", value: "en", url: baseURL! }]);
  await register(page, "Moonlit Test", `moonlit-${uid}@example.com`);
  await page.goto("/templates/moonlit-jasmine");
  const demoArt = await page.request.get("/templates/moonlit-jasmine/couple.webp");
  expect(demoArt.headers()["content-type"]).toBe("image/webp");
  await page.getByRole("link", { name: "Use this design" }).click();
  await expect(page.locator("#event-template")).toHaveValue("moonlit-jasmine");
  await page.fill("#title", "Moonlit Wedding Test");
  await page.fill("#partner-one", "Sovan");
  await page.fill("#partner-two", "Dalin");
  await page.fill("#date", "2027-08-21");
  await page.fill("#st", "18:00");
  await page.getByRole("button", { name: "Create & open builder" }).click();
  await page.waitForURL("**/builder");
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)![1];
  const builderPreview = page.frameLocator("iframe").first();
  await expect(builderPreview.getByRole("heading", { name: /Sovan.*Dalin/ })).toBeVisible();
  await expect(builderPreview.locator('img[src$="/moonlit-jasmine/couple.webp"]')).toHaveCount(0);
  const toolbar = page.locator("header");
  await toolbar.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(toolbar.getByRole("button", { name: "Update", exact: true })).toBeVisible();
  const response = await page.request.get(`/api/events/${eventId}/template`);
  expect(await response.json()).toMatchObject({ template: { slug: "moonlit-jasmine", tier: "free" } });
});

test("hosts can browse matching designs, preview them, and create a graduation invitation", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "ei_locale", value: "en", url: baseURL! }]);
  await register(page, "Rathana", `graduation-${uid}@example.com`);
  await page.goto("/dashboard/events/new");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Phnom_Penh", dateStyle: "short" }).format(new Date());
  await expect(page.locator("#date")).toHaveValue(today);
  await expect(page.locator("#st")).toHaveValue("");
  const browse = page.getByRole("button", { name: "Browse designs" });
  const gallery = page.getByRole("dialog", { name: "Choose an invitation design" });
  await browse.click();
  await expect(gallery.getByRole("button", { name: "Use design: Ivory & Champagne" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gallery).toBeHidden();
  await expect(browse).toBeFocused();

  await page.locator("#event-type").selectOption("custom");
  await expect(page.locator("#event-template")).toHaveValue("garden-gathering");
  await page.locator("#event-type").selectOption("graduation");
  await browse.click();
  await expect(gallery.getByRole("button", { name: /Use design:/ })).toHaveCount(1);
  const [preview] = await Promise.all([
    page.waitForEvent("popup"),
    gallery.getByRole("link", { name: "Preview: Graduation Honours" }).click(),
  ]);
  await preview.waitForURL("**/t/graduation-honours?lang=en");
  await preview.emulateMedia({ reducedMotion: "reduce" });
  await expect(preview.getByRole("button", { name: "Open invitation" })).toBeVisible();
  await preview.getByRole("button", { name: "Open invitation" }).click();
  await expect(preview.getByRole("dialog", { name: "Open invitation" })).toBeHidden();
  await preview.close();
  await gallery.getByRole("button", { name: "Use design: Graduation Honours" }).click();
  await expect(page.locator("#event-template")).toHaveValue("graduation-honours");
  await expect(gallery).toBeHidden();
  await page.fill("#title", "Graduation Celebration");
  await page.fill("#he", "Rathana");
  await page.fill("#date", "2027-07-20");
  await page.fill("#st", "17:00");
  await page.getByRole("button", { name: "Create & open builder" }).click();
  await page.waitForURL("**/builder");
  await expect(page.frameLocator("iframe").first().getByText("Rathana", { exact: true }).first()).toBeVisible();
  const desktopPreview = page.getByRole("button", { name: "Desktop preview", exact: true });
  await page.getByRole("button", { name: "Tablet preview", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(desktopPreview).toBeFocused();
  await expect(page.getByText("Desktop preview", { exact: true })).toBeVisible();
  await desktopPreview.click();
  await expect(desktopPreview).toHaveAttribute("aria-pressed", "true");
});

test("owner creates, publishes and manages an event; guest RSVPs; staff checks in", async ({ page, browser, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await register(page, "Sokha Owner", `owner-${uid}@example.com`);

  // Event creation with template preselection and a persisted form draft.
  await page.goto("/dashboard/events/new?template=ivory-champagne");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("#event-template")).toHaveValue("ivory-champagne");
  await page.fill("#title", "E2E Wedding");
  await page.fill("#partner-one", "វិចិត្រ");
  await page.fill("#partner-two", "សុភ័ក្ត្រ");
  await page.fill("#date", "2027-03-20");
  await page.fill("#st", "17:00");
  await page.fill("#vn", "Diamond Island Hall");
  await page.fill("#event-message", "Welcome to our celebration");
  await page.fill("#organizer-notes", "Private: confirm the table layout");
  await page.getByRole("button", { name: "បន្ថែមសកម្មភាព", exact: true }).click();
  await page.fill("#agenda-time-1", "18:00");
  await page.fill("#agenda-title-1", "Dinner reception");
  await page.fill("#agenda-notes-1", "Meet us in the main hall");
  await page.reload();
  await expect(page.locator("#partner-one")).toHaveValue("វិចិត្រ");
  await expect(page.locator("#agenda-title-1")).toHaveValue("Dinner reception");
  await expect(page.locator("#organizer-notes")).toHaveValue("Private: confirm the table layout");
  await page.locator("#event-cover").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: await sharp({ create: { width: 160, height: 90, channels: 3, background: "#b68a45" } }).png().toBuffer(),
  });
  await page.locator("#event-create-form button[type=submit]").click();
  await page.waitForURL("**/builder");
  const eventId = page.url().match(/events\/([0-9a-f-]{36})/)![1];

  // Builder: edit + autosave + live preview + undo
  await page.getByRole("button", { name: "សេចក្ដីអញ្ជើញ", exact: true }).click();
  await expect(page.locator("textarea[id$='.body-km']")).toHaveValue("Welcome to our celebration");
  await page.locator("textarea[id$='.body-km']").fill("សូមគោរពអញ្ជើញចូលរួម (E2E)");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("textarea[id$='.body-km']")).toHaveValue("Welcome to our celebration");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByText("បានរក្សាទុក")).toBeVisible({ timeout: 10_000 });
  await expect(page.frameLocator("iframe").first().getByText("(E2E)")).toBeVisible();

  // Publish
  await page.getByRole("button", { name: "កំណែ", exact: true }).click();
  await expect(page.getByText("មិនទាន់មានកំណែ")).toBeVisible();
  await page.locator("header").getByRole("button", { name: /ផ្សព្វផ្សាយ/ }).first().click();
  await expect(page.getByRole("button", { name: "ស្ដារ", exact: true })).toBeVisible();
  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByText("កំពុងផ្សព្វផ្សាយ")).toBeVisible();
  await page.goto(`/dashboard/events/${eventId}/settings`);
  await expect(page.locator("#organizer-notes")).toHaveValue("Private: confirm the table layout");
  await page.fill("#organizer-notes", "Private: layout confirmed");
  await page.fill("#s-m", "http://example.com/map");
  await page.getByRole("button", { name: "រក្សាទុក", exact: true }).click();
  await expect(page.locator("#s-m")).toHaveAttribute("aria-invalid", "true");
  await page.fill("#s-m", "");
  await page.getByRole("checkbox", { name: /បើកតំណសាធារណៈ/ }).check();
  await page.getByRole("button", { name: "រក្សាទុក", exact: true }).click();
  const publicLink = page.getByText(/https?:\/\/[^\s]+\/e\/[A-Za-z0-9_-]+/);
  await expect(publicLink).toBeVisible();
  const publicPath = new URL((await publicLink.textContent())!).pathname;
  await page.reload();
  await expect(page.locator("#organizer-notes")).toHaveValue("Private: layout confirmed");

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
  expect(await res!.text()).not.toContain("Private: layout confirmed");
  const shareImage = guest.locator('meta[property="og:image"]');
  await expect(shareImage).toHaveAttribute("content", /\/api\/media\/[0-9a-f-]{36}$/);
  const coverUrl = (await shareImage.getAttribute("content"))!;
  const imageResponse = await guest.request.get(new URL(coverUrl).pathname);
  expect(imageResponse.headers()["content-type"]).toBe("image/jpeg");
  const publicPage = await gctx.newPage();
  const publicResponse = await publicPage.goto(publicPath);
  expect(await publicResponse!.text()).not.toContain("Private: layout confirmed");
  await expect(publicPage.locator('meta[property="og:image"]')).toHaveAttribute("content", coverUrl);
  await publicPage.close();
  await guest.getByRole("button", { name: "បើកធៀប" }).click();
  await expect(guest.getByText("Dinner reception")).toBeVisible();
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

  // The design tab exports style settings and keeps the live invitation pinned until republish.
  await page.goto(`/dashboard/events/${eventId}/templates`);
  await expect(page.getByRole("navigation", { name: "Event" }).getByRole("link", { name: "គំរូធៀប", exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "ភ្លុកដំរី និងស្រាសំប៉ាញ", exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "ទាញយកគំរូ (JSON)", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("theab-ivory-champagne.json");
  const designText = fs.readFileSync(await download.path(), "utf8");
  const design = JSON.parse(designText);
  expect(design).toMatchObject({
    format: "theab-invitation-design",
    template: { slug: "ivory-champagne" },
    appearance: { palette: { bg: "#F7F1E6" } },
  });
  expect(designText).not.toMatch(/E2E Wedding|Private:|Dinner reception|api\/media/);
  await page.locator("#event-template").selectOption("marble-rose");
  await page.getByRole("button", { name: "រក្សាទុកគំរូ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ថ្មម៉ាប និងផ្កាកុលាបក្រហមទុំ", exact: true })).toBeVisible();
  const draftLink = page.getByRole("link", { name: "មើលព្រាងក្នុងផ្ទាំងថ្មី", exact: true });
  await expect(draftLink).toHaveAttribute("target", "_blank");
  const draftPreview = await context.newPage();
  await draftPreview.goto((await draftLink.getAttribute("href"))!);
  await expect(draftPreview.locator(".inv-root")).toHaveAttribute("style", /--inv-bg:\s*#F6F3F0/i);
  await draftPreview.close();
  await guest.goto(link);
  await expect(guest.locator(".inv-root")).toHaveAttribute("style", /--inv-bg:\s*#F7F1E6/i);
  const republish = page.getByRole("button", { name: "ធ្វើបច្ចុប្បន្នភាពធៀប", exact: true });
  await expect(republish).toBeVisible();
  await republish.click();
  await expect(republish).toHaveCount(0);
  await guest.reload();
  await expect(guest.locator(".inv-root")).toHaveAttribute("style", /--inv-bg:\s*#F6F3F0/i);

  // Tenant isolation
  const octx = await browser.newContext();
  const other = await octx.newPage();
  await register(other, "Other", `other-${uid}@example.com`);
  expect((await other.goto(`/dashboard/events/${eventId}/guests`))!.status()).toBe(404);
  expect((await other.request.get(`/api/events/${eventId}/export?kind=guests`)).status()).toBe(404);
  expect((await other.request.get(`/api/events/${eventId}/template`)).status()).toBe(404);
  await other.goto("/admin");
  expect(other.url()).not.toContain("/admin");

  expect(errors).toEqual([]);
});
