"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ConfirmButton({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleConfirm() {
    setLoading(true);

    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointmentId);

    router.refresh();
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="text-sm text-green-500 hover:text-green-400 font-medium disabled:opacity-50"
    >
      {loading ? "Confirming..." : "Mark as confirmed"}
    </button>
  );
}
