export const metadata = { title: "Privacy" };
export default function Privacy() {
  const items = [
    ["Guest links", "Each guest link contains a random 144-bit secret. Only its hash is used for lookups; links can be revoked or regenerated at any time. Links are excluded from search engines and sent with a no-referrer policy."],
    ["What we store", "Event details, invitation content, guest lists, RSVP responses, wishes, seating, gift and budget records you enter. Uploaded photos are re-encoded to strip location (EXIF/GPS) metadata."],
    ["Analytics", "We count invitation opens and RSVPs per event. No third-party trackers or advertising cookies are used, and link secrets are never stored in analytics."],
    ["Export & deletion", "Account owners can export all their data as JSON and delete their account from Settings; guest personal data is removed immediately on deletion."],
    ["Payments", "Gift QR codes are displayed exactly as uploaded by the host; we do not process or verify gift payments."],
  ];
  return (
    <div className="container-x max-w-3xl py-16 sm:py-24">
      <h1 className="text-4xl font-bold leading-[1.5]">ឯកជនភាព · Privacy</h1>
      <p className="mt-2 text-sm text-muted">Plain-language summary. Have a lawyer review a full policy before launch.</p>
      <dl className="mt-10 space-y-8">{items.map(([t, d]) => <div key={t}><dt className="text-lg font-semibold">{t}</dt><dd className="mt-2 leading-8 text-ink-2">{d}</dd></div>)}</dl>
    </div>
  );
}
