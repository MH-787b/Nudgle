"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrIcon } from "lucide-react";

/** Renders a QR code for the given URL with a download button. */
export function QrCode({ url, businessName }: { url: string; businessName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180,
      margin: 2,
      color: { dark: "#111111", light: "#ffffff" },
    }).then(() => setReady(true));
  }, [url]);

  function download() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${businessName || "booking"}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white rounded-xl p-3">
        <canvas ref={canvasRef} className={ready ? "" : "opacity-0"} />
      </div>
      {ready && (
        <button
          onClick={download}
          className="flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2} />
          Download QR code
        </button>
      )}
    </div>
  );
}
