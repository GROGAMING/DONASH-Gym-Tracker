import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface ToastBannerProps {
  message: string;
  type?: "success" | "error";
  onDismiss: () => void;
  duration?: number;
}

const ToastBanner: React.FC<ToastBannerProps> = ({
  message,
  type = "success",
  onDismiss,
  duration = 3500,
}) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 220);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-card-hover border
        ${type === "success"
          ? "bg-success-muted border-success/30"
          : "bg-destructive/10 border-destructive/30"
        }
        ${leaving ? "animate-toast-out" : "animate-toast-in"}
      `}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
      )}
      <span className={`flex-1 text-sm font-medium ${type === "success" ? "text-success" : "text-destructive"}`}>
        {message}
      </span>
      <button onClick={() => { setLeaving(true); setTimeout(onDismiss, 220); }}>
        <X className={`w-4 h-4 ${type === "success" ? "text-success/60" : "text-destructive/60"}`} />
      </button>
    </div>
  );
};

export default ToastBanner;
