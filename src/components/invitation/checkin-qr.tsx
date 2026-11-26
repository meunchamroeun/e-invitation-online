"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Guest's personal check-in QR. Encodes only the token; staff scanners validate it server-side. */
export function CheckinQr({ token, label, table }: { token: string; label: string; table?: string | null }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(`EI1:${token}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg).catch(() => {});
  }, [token]);
  return (
    <div className="mx-auto mt-6 max-w-[220px] text-center">
      <p className="mb-2 text-xs" style={{ color: "var(--inv-muted)" }}>{label}</p>
      <div className="rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
      {table ? <p className="mt-2 text-sm" style={{ color: "var(--inv-primary)" }}>{table}</p> : null}
    </div>
  );
}
