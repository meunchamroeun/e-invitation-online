import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/layout/logo";
import { KbachCorner, ChanFlower, ChanPatternBg } from "@/components/invitation/ornaments";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-[100dvh] bg-[#F8F5F0] lg:grid-cols-2">
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #E9D5AD 0%, transparent 70%)" }}
        />
        <div className="relative z-10 w-full" style={{ maxWidth: "410px" }}>
          <div className="mb-6 flex justify-center">
            <Link href="/" className="transition-opacity hover:opacity-80"><Logo /></Link>
          </div>
          <div
            className="rounded-3xl bg-white p-7 sm:p-9"
            style={{
              border: "1px solid rgba(32, 32, 32, 0.07)",
              boxShadow: "0 20px 50px -16px rgba(60, 40, 15, 0.12), 0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#5E0F14] via-[#4A0B10] to-[#36070A] text-[#F6E7C8] lg:block">
        <div className="pointer-events-none absolute inset-0 text-[#D4A64A]"><ChanPatternBg opacity={0.07} /></div>
        <div className="absolute inset-8 border border-[#D4A64A]/45" />
        <div className="absolute inset-10 border border-[#D4A64A]/20" />
        <div className="absolute left-8 top-8 text-[#D4A64A]"><KbachCorner size={130} /></div>
        <div className="absolute bottom-8 right-8 rotate-180 text-[#D4A64A]"><KbachCorner size={130} /></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
          <div className="relative flex items-center justify-center">
            <div aria-hidden className="absolute h-36 w-36 rounded-full bg-[#D4A64A]/15 blur-2xl" />
            <div className="relative text-[#D4A64A]"><ChanFlower size={88} /></div>
          </div>
          <p className="mt-8 font-[family-name:var(--font-moul)] text-3xl leading-[1.7] text-[#F1D592]">សូមគោរពអញ្ជើញ</p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-[#F6E7C8]/80">{t.auth.side}</p>
        </div>
      </div>
    </div>
  );
}
