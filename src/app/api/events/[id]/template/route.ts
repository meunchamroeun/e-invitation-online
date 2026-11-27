import { NextResponse } from "next/server";
import { InvitationDocSchema } from "@/features/invitations/doc";
import { getTemplate } from "@/features/templates/registry";
import { requireEvent } from "@/lib/auth/event-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "event.edit");
  const template = getTemplate(event.templateSlug);
  const draft = InvitationDocSchema.safeParse(event.draft);
  if (!template) return new NextResponse(null, { status: 404 });

  const theme = draft.success ? draft.data.theme : undefined;
  return NextResponse.json({
    format: "theab-invitation-design",
    version: 1,
    template,
    appearance: {
      palette: { ...template.palette, ...theme?.palette },
      envelope: theme?.envelope,
      khmerNumerals: theme?.khmerNumerals,
      motion: theme?.motion,
    },
  }, {
    headers: {
      "Content-Disposition": `attachment; filename="theab-${template.slug}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
