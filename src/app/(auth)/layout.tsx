import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/layout/logo";
import { KbachCorner, ChanFlower } from "@/components/invitation/ornaments";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link href="/" className="w-fit"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-[#5E0F14] text-[#F6E7C8] lg:block">
        <div className="absolute inset-8 border border-[#D4A64A]/50" />
        <div className="absolute left-8 top-8 text-[#D4A64A]"><KbachCorner size={130} /></div>
        <div className="absolute bottom-8 right-8 rotate-180 text-[#D4A64A]"><KbachCorner size={130} /></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
          <div className="text-[#D4A64A]"><ChanFlower size={88} /></div>
          <p className="mt-8 font-[family-name:var(--font-moul)] text-3xl leading-[1.7] text-[#F1D592]">សូមគោរពអញ្ជើញ</p>
          <p className="mt-4 max-w-sm text-base text-[#F6E7C8]/80">{t.auth.side}</p>
        </div>
      </div>
    </div>
  );
}
