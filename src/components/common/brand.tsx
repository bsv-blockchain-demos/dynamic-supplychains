import Link from "next/link";
import { Icon } from "./icon";

export function Brand({ sub = "Verifiable product lifecycles" }: { sub?: string }) {
  return (
    <Link href="/" className="brand" aria-label="Dynamic Supply Chain, home">
      <span className="brand-mark">
        <Icon name="shield-check" size={18} />
      </span>
      <span className="brand-name">
        Dynamic Supply Chain
        <small>{sub}</small>
      </span>
    </Link>
  );
}
