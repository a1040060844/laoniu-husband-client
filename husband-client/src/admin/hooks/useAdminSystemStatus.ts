import { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi";
import type { AdminSystemStatus } from "../types/admin";

export function useAdminSystemStatus() {
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const nextStatus = await adminApi.getSystemStatus();
      if (!cancelled) {
        setStatus(nextStatus);
        setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { loading, status };
}
