"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/features/account/actions";
import { Button } from "@/components/ui";
export function MarkRead({ label }: { label: string }) {
  const router = useRouter();
  const [p, start] = useTransition();
  return <Button variant="outline" size="sm" disabled={p} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}>{label}</Button>;
}
