import { useEffect, useState } from "react";
import { getNetworkStatus } from "./offline.js";

export default function useNetworkStatus() {
  const [status, setStatus] = useState(() => getNetworkStatus());

  useEffect(() => {
    const handleStatusUpdate = (event) => {
      if (event?.detail) {
        setStatus(event.detail);
      } else {
        setStatus(getNetworkStatus());
      }
    };

    window.addEventListener("offline-sync-state", handleStatusUpdate);
    window.addEventListener("online", handleStatusUpdate);
    window.addEventListener("offline", handleStatusUpdate);

    return () => {
      window.removeEventListener("offline-sync-state", handleStatusUpdate);
      window.removeEventListener("online", handleStatusUpdate);
      window.removeEventListener("offline", handleStatusUpdate);
    };
  }, []);

  return status;
}
