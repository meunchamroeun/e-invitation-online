import { Badge } from "@/components/ui";

export function EventStatus({ status, labels }: { status: string; labels: { live: string; draft: string; archived: string } }) {
  if (status === "archived") return <Badge tone="warning">{labels.archived}</Badge>;
  if (status === "published") return <Badge tone="success">{labels.live}</Badge>;
  return <Badge>{labels.draft}</Badge>;
}
