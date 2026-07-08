import { Icon } from "./icon";

/**
 * Dotted-underline jargon tooltip (the §8 guidance affordance). Hover- and
 * keyboard-accessible (tabIndex + :focus-within in globals.css). Presentational
 * only. Wraps any inline term and explains it in plain language.
 */
export function InfoTip({
  children,
  title,
  body,
  align = "center",
}: {
  children?: React.ReactNode;
  title?: string;
  body: React.ReactNode;
  /** "left" anchors the popup to the term's left edge, for terms near a clipping container's left edge. */
  align?: "center" | "left";
}) {
  return (
    <span className="tip" tabIndex={0}>
      {children ? (
        <span className="tip-term">
          {children}
          <span className="ii">
            <Icon name="info" size={12} />
          </span>
        </span>
      ) : (
        // Icon-only trigger (no dotted term) for placing a ⓘ next to a label.
        <span
          className="tip-term"
          style={{ border: "none", cursor: "help", color: "var(--ink-3)", display: "inline-flex", verticalAlign: "-2px" }}
        >
          <Icon name="info" size={13} />
        </span>
      )}
      <span className={`tip-pop${align === "left" ? " align-left" : ""}`} role="tooltip">
        {title && (
          <>
            <b>{title}</b>
            <br />
          </>
        )}
        {body}
      </span>
    </span>
  );
}
