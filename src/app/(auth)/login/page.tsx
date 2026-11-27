import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t, locale } = await getI18n();
  const { next, error } = await searchParams;
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          {locale === "km" ? "ចូលគ្រប់គ្រងធៀបអញ្ជើញ និងបញ្ជីភ្ញៀវរបស់អ្នក" : "Sign in to manage your invitations & guests"}
        </p>
      </div>
      <AuthForm
        mode="login"
        t={t.auth}
        locale={locale}
        next={next}
        googleEnabled={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        telegramBot={process.env.TELEGRAM_BOT_USERNAME || null}
        oauthError={error}
      />
    </>
  );
}
