import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t, locale } = await getI18n();
  const { next } = await searchParams;
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{t.auth.registerTitle}</h1>
      </div>
      <AuthForm
        mode="register"
        t={t.auth}
        locale={locale}
        next={next}
        googleEnabled={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        telegramBot={process.env.TELEGRAM_BOT_USERNAME || null}
      />
    </>
  );
}
