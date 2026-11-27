"use client";

import { Button, EmptyState } from "@/components/ui";

export default function AdminError({ reset }: { reset: () => void }) {
  return <EmptyState title="This page could not load" body="Try again to reload the administration data." action={<Button onClick={reset}>Try again</Button>} />;
}
