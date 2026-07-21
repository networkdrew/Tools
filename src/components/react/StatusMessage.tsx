interface StatusMessageProps {
  tone: "error" | "success" | "neutral";
  children: React.ReactNode;
}

const toneClasses: Record<StatusMessageProps["tone"], string> = {
  error: "border-danger/40 bg-danger/10 text-danger",
  success: "border-success/40 bg-success/10 text-success",
  neutral: "border-border bg-bg-sunken text-text-muted",
};

export function StatusMessage({ tone, children }: StatusMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
}
