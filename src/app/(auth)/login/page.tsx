import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t } = await getI18n();
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-8 text-[1.75rem] font-semibold">{t.auth.loginTitle}</h1>
      <AuthForm mode="login" t={t.auth} next={next} />
    </>
  );
}
