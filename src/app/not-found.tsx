import Link from "next/link";
import { ChanFlower } from "@/components/invitation/ornaments";
export default function NotFound() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <div className="text-gold"><ChanFlower size={56} /></div>
      <h1 className="mt-6 text-2xl font-semibold" lang="km">រកមិនឃើញទំព័រ</h1>
      <p className="mt-1 text-muted">Page not found</p>
      <Link href="/" className="mt-6 text-sm text-gold-2 underline">ទំព័រដើម · Home</Link>
    </div>
  );
}
