import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

type Status = "checking" | "online" | "offline";

export function ApiStatusBar() {
    const [status, setStatus] = useState<Status>("checking");

    const check = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/health", { signal: AbortSignal.timeout(4000) });
            setStatus(res.ok ? "online" : "offline");
        } catch {
            setStatus("offline");
        }
    };

    useEffect(() => {
        check();
        const interval = setInterval(check, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {status === "checking" && <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />}
            {status === "online" && <span className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: "#22c55e" }} />}
            {status === "offline" && <WifiOff className="h-3 w-3 shrink-0" style={{ color: "#ef4444" }} />}
            <span className="font-semibold" style={{ color: status === "online" ? "#22c55e" : status === "offline" ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                {status === "checking" ? "Connecting…" : status === "online" ? "API Online" : "API Offline"}
            </span>
            {status === "offline" && (
                <button onClick={check} className="ml-auto text-[10px] underline" style={{ color: "#ef4444" }}>retry</button>
            )}
        </div>
    );
}
