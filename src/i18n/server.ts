import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "ei_locale";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "en" ? "en" : "km";
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
