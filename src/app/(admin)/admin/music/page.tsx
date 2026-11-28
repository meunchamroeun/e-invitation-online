import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { AdminHeading } from "@/components/admin/admin-table";
import { AdminMusicManager } from "@/components/admin/admin-music";

export default async function AdminMusicPage() {
  await requireAdmin();
  const tracks = await db
    .select({ id: schema.musicTracks.id, title: schema.musicTracks.title, url: schema.musicTracks.url })
    .from(schema.musicTracks)
    .orderBy(desc(schema.musicTracks.createdAt));
  return (
    <>
      <AdminHeading title="Music library" description="Upload MP3 tracks that event owners can select in the Builder." />
      <AdminMusicManager initialTracks={tracks} />
    </>
  );
}
