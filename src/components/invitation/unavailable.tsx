import Link from "next/link";
import { ChanFlower } from "./ornaments";

export function InviteUnavailable() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="text-gold"><ChanFlower size={56} /></div>
      <h1 className="mt-6 text-xl font-semibold" lang="km">តំណធៀបនេះមិនអាចប្រើបានទេ</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">This invitation link is not available. It may have been replaced by the host or is not published yet — please contact the person who sent it.</p>
      <Link href="/" className="mt-8 text-xs text-muted underline">ធៀបអនឡាញ</Link>
    </div>
  );
}
