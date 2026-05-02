import { useEffect, useState } from "react";
import { WifiOff, Loader2 } from "lucide-react";

type Status = "checking" | "online" | "offline";

const BACKEND_URL = (
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE?.replace(/\/api\/v1\/?$/, "")
) || "https://ai-data-intelligence-1.onrender.com";

export function ApiStatusBar() {
    const [status, setStatus] = useState<Status>("checking");

    const check = async () => {
        try {
            // no-cors: avoids CORS blocking — if server is reachable fetch won't throw
            await fetch(`${BACKEND_URL}/health`, {
                method: "GET",
                mode: "no-cors",
                signal: AbortSignal.timeout(10000),
            });
            setStatus("online");
        } catch {
            setStatus("offline");
        }
    };

    useEffect(() => {
        check();
        const interval = setInterval(check, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {status === "checking" && (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            )}
            {status === "online" && (
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#22c55e" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                </span>
            )}
            {status === "offline" && (
                <WifiOff className="h-3 w-3 shrink-0" style={{ color: "#ef4444" }} />
            )}
            <span className="font-semibold"
                style={{ color: status === "online" ? "#22c55e" : status === "offline" ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                {status === "checking" ? "Connecting…" : status === "online" ? "API Online" : "API Offline"}
            </span>
            {status === "offline" && (
                <button onClick={check} className="ml-auto text-[10px] underline" style={{ color: "#ef4444" }}>
                    retry
                </button>
            )}
        </div>
    );
}
