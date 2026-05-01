import { useEffect, useState } from "react";
import { WifiOff, Loader2 } from "lucide-react";

type Status = "checking" | "online" | "offline";

export function ApiStatusBar() {
    const [status, setStatus] = useState<Status>("checking");

    const check = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/health", {
                signal: AbortSignal.timeout(4000),
            });
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
        <div
            style={{ backgroundColor: "#060b14", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            className="flex items-center gap-2 px-6 py-1 text-xs"
        >
            {status === "checking" && (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>Connecting...</span>
                </>
            )}
            {status === "online" && (
                <>
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#10b981" }} />
                    <span style={{ color: "#10b981" }}>Online</span>
                </>
            )}
            {status === "offline" && (
                <>
                    <WifiOff className="h-3 w-3" style={{ color: "#ef4444" }} />
                    <span style={{ color: "#ef4444" }}>Offline</span>
                    <button
                        onClick={check}
                        className="ml-1 underline underline-offset-2 hover:no-underline opacity-70 hover:opacity-100"
                        style={{ color: "#ef4444" }}
                    >
                        retry
                    </button>
                </>
            )}
        </div>
    );
}
