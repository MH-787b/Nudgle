"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function CancelButton({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setLoading(true);

    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    router.refresh();
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
    >
      {loading ? "Cancelling..." : "Cancel appointment"}
    </button>
  );
}
