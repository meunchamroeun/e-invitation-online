import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getI18n();
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader t={t.nav} locale={locale} signedIn={!!user} />
      <main>{children}</main>
      <SiteFooter t={t.footer} nav={t.nav} brand={t.brand} />
    </>
  );
}
