import { Icon, type IconName } from "./icon";

/** Info / ok / warn coaching callout (the §8 guidance affordance). */
export function CoachCard({
  icon = "info",
  title,
  tone,
  children,
}: {
  icon?: IconName;
  title?: string;
  tone?: "ok" | "warn";
  children: React.ReactNode;
}) {
  // Info tone is deliberately neutral (surface, not a colour wash) so
  // informational callouts don't read as errors or warnings.
  const bg =
    tone === "warn"
      ? "var(--warn-soft)"
      : tone === "ok"
        ? "var(--ok-soft)"
        : "var(--surface)";
  const fg =
    tone === "warn" ? "var(--warn)" : tone === "ok" ? "var(--ok)" : "var(--accent)";
  const line =
    tone === "warn"
      ? "color-mix(in srgb, var(--warn) 30%, transparent)"
      : tone === "ok"
        ? "color-mix(in srgb, var(--ok) 30%, transparent)"
        : "var(--line-2)";
  return (
    <div
      style={{
        background: bg,
        border: "1px solid " + line,
        borderRadius: "var(--r)",
        padding: "14px 16px",
        display: "flex",
        gap: 11,
      }}
    >
      <Icon name={icon} size={17} style={{ color: fg, marginTop: 1 }} />
      <div>
        {title && (
          <div style={{ fontWeight: 600, fontSize: 13.5, color: fg, marginBottom: 3 }}>
            {title}
          </div>
        )}
        <div className="muted" style={{ fontSize: 12.8, lineHeight: 1.5 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
