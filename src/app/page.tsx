import Link from "next/link";
import { Icon, type IconName } from "../components/common/icon";
import { InfoTip } from "../components/common/info-tip";
import { Brand } from "../components/common/brand";

const REPO_URL = "https://github.com/bsv-blockchain-demos/dynamic-supplychains";

/* A small chain preview that sits in the hero. */
function HeroChainCard() {
  const row = (
    n: number,
    label: string,
    icon: IconName | null,
    state: "done" | "current" | "ghost",
    last = false,
  ) => (
    <div className="tl-row" key={n}>
      <div className="tl-rail">
        <div
          className="tl-line top"
          style={{ background: n === 1 ? "transparent" : undefined }}
        />
        <div
          className={
            "tl-dot " +
            (state === "done" ? "filled" : state === "ghost" ? "ghost" : "")
          }
        >
          {icon ? <Icon name={icon} size={13} /> : n}
        </div>
        {!last && <div className="tl-line" />}
      </div>
      <div className="tl-body" style={{ paddingBottom: last ? 0 : 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</div>
        <div className="faint mono" style={{ fontSize: 10.5, marginTop: 2 }}>
          txid 3a54…f9d7f
        </div>
      </div>
    </div>
  );
  return (
    <div
      className="card card-pad w-full max-w-[320px]"
      style={{ boxShadow: "var(--shadow-3)" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span className="badge badge-ok">
          <Icon name="check-circle" size={12} />
          Finalized
        </span>
        <Icon name="fingerprint" size={18} style={{ color: "var(--accent)" }} />
      </div>
      <div className="disp" style={{ fontSize: 18, marginBottom: 16 }}>
        Coastal Coffee · Lot 24
      </div>
      <div className="timeline">
        {row(1, "Origin", "package", "done")}
        {row(2, "Processing", null, "done")}
        {row(3, "Export & customs", "send", "current")}
        {row(4, "Retail handoff", null, "ghost", true)}
      </div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <div
      className="card card-pad"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="empty-ico"
          style={{
            width: 42,
            height: 42,
            marginBottom: 0,
            borderRadius: "var(--r-sm)",
          }}
        >
          <Icon name={icon} size={20} />
        </div>
        <span className="mono faint" style={{ fontSize: 12 }}>
          0{n}
        </span>
      </div>
      <div className="disp" style={{ fontSize: 17 }}>
        {title}
      </div>
      <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );
}

function TrustCol({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Icon name={icon} size={20} style={{ color: "var(--accent)" }} />
        <div className="disp" style={{ fontSize: 16 }}>
          {title}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
        {children}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section
        style={{
          background: "var(--hero-grad)",
          color: "var(--hero-ink)",
          borderBottom: "1px solid var(--line)",
        }}
        className="px-6 py-14 sm:px-10 sm:py-16"
      >
        <div className="mx-auto grid max-w-[1000px] items-center gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-12">
          <div>
            <span className="eyebrow" style={{ color: "var(--hero-accent)" }}>
              <Icon name="shield-check" size={14} />
              On-chain provenance · any industry
            </span>
            <h1
              className="disp mt-[18px] text-[38px] sm:text-[52px]"
              style={{ color: "var(--hero-ink)" }}
            >
              Build any supply chain
              <br />lifecycle, on-chain.
            </h1>
            <p
              style={{
                fontSize: 17.5,
                lineHeight: 1.55,
                color: "var(--hero-ink-2)",
                margin: "20px 0 0",
                maxWidth: 460,
              }}
            >
              Compose a chain of stages, each one an immutable, encrypted
              record of where a product has been and who held it. One
              adaptable engine instead of a bespoke tool per vertical.
            </p>
            <div className="mt-[30px] flex flex-wrap gap-3">
              <Link href="/create" className="btn btn-primary btn-lg">
                Start building
                <Icon name="arrow-right" size={17} />
              </Link>
              <Link
                href="/directory"
                className="btn btn-lg"
                style={{
                  background: "var(--hero-card)",
                  color: "var(--hero-ink)",
                  border: "1px solid var(--hero-line)",
                }}
              >
                Browse supply chains
              </Link>
            </div>
            <p className="mt-3.5" style={{ fontSize: 12.5, color: "var(--hero-ink-2)" }}>
              Need a wallet? Download{" "}
              <a
                href="https://desktop.bsvb.tech/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--hero-accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                BSV Desktop
              </a>{" "}
              or{" "}
              <a
                href="https://mobile.bsvb.tech/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--hero-accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                BSV Browser
              </a>{" "}
              for mobile.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {(
                [
                  ["lock", "Encrypted handoffs"],
                  ["fingerprint", "Verifiable provenance"],
                  ["git-branch", "UTXO-chained on BSV"],
                ] as [IconName, string][]
              ).map(([ic, t]) => (
                <span
                  key={t}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12.5,
                    color: "var(--hero-ink-2)",
                  }}
                >
                  <Icon
                    name={ic}
                    size={14}
                    style={{ color: "var(--hero-accent)" }}
                  />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <HeroChainCard />
          </div>
        </div>
      </section>

      {/* WHAT IT IS */}
      <section className="wrap" style={{ padding: "64px 40px 8px" }}>
        <span className="eyebrow">What it is</span>
        <p
          className="disp"
          style={{
            fontSize: 30,
            lineHeight: 1.32,
            margin: "16px 0 0",
            maxWidth: 760,
            letterSpacing: "-.02em",
          }}
        >
          A <span className="accent-tx">dynamic supply chain</span>: a
          flexible engine for spinning up a credible, end-to-end record of a
          product&apos;s life, custody and provenance. Built to fit agriculture,
          manufacturing, aviation, pharma, logistics, anything you can break
          into stages.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="wrap scroll-mt-20"
        style={{ padding: "56px 40px" }}
      >
        <div className="mb-[22px] flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="disp" style={{ fontSize: 26 }}>
            How it works
          </h2>
          <span className="muted" style={{ fontSize: 13.5 }}>
            Four steps from idea to verifiable supply chain.
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            icon="plus"
            title="Create a chain"
            body="Name your supply chain and pick a starting point: a blank chain or a ready-made template."
          />
          <Step
            n={2}
            icon="layers"
            title="Add stages"
            body="Each stage carries its own custom metadata: location, batch, certificates, whatever your product needs."
          />
          <Step
            n={3}
            icon="send"
            title="Hand off"
            body="Lock a stage to the next party's wallet. Only they can continue the chain. Custody, proven."
          />
          <Step
            n={4}
            icon="check-circle"
            title="Finalize"
            body="Seal the chain, making it a verifiable record anyone can inspect."
          />
        </div>
      </section>

      {/* FLEXIBILITY */}
      <section
        style={{
          background: "var(--surface-2)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="wrap grid items-center gap-10 lg:grid-cols-2"
          style={{ padding: "52px 40px" }}
        >
          <div>
            <span className="eyebrow">
              <Icon name="boxes" size={14} />
              One engine, every vertical
            </span>
            <h2 className="disp" style={{ fontSize: 26, margin: "14px 0 12px" }}>
              Not a single-vertical app.
            </h2>
            <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
              Stages are free-form and metadata is arbitrary, so the same engine
              models a farm-to-table journey, an aircraft part&apos;s service
              life, or a shipping container&apos;s voyage. You define the shape.
              It adapts.
            </p>
          </div>
          <div className="chips" style={{ gap: 10 }}>
            {[
              "Agriculture",
              "Manufacturing",
              "Aviation",
              "Pharma",
              "Logistics",
              "Electronics",
              "Energy",
              "Luxury goods",
              "+ anything",
            ].map((t) => (
              <span key={t} className="chip" style={{ cursor: "default" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="wrap" style={{ padding: "60px 40px" }}>
        <span className="eyebrow">Trust by design</span>
        <h2 className="disp" style={{ fontSize: 26, margin: "14px 0 26px" }}>
          Why a supply chain here is credible
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          <TrustCol icon="fingerprint" title="Immutable record">
            Every stage is a real transaction recorded on the{" "}
            <InfoTip
              title="BSV"
              body="The blockchain this demo writes to. Once a stage is recorded it cannot be quietly altered or deleted."
            >
              blockchain
            </InfoTip>
            . History can be inspected, not rewritten.
          </TrustCol>
          <TrustCol icon="lock" title="Encrypted handoffs">
            Hand a stage to another party by locking it to their{" "}
            <InfoTip
              title="Public key"
              body="A wallet's public ID. Lock a stage to someone's public key and only their wallet can unlock and continue the chain."
            >
              wallet ID
            </InfoTip>
            . Only they can continue it.
          </TrustCol>
          <TrustCol icon="git-branch" title="Verifiable provenance">
            Each stage spends the previous one&apos;s{" "}
            <InfoTip
              title="UTXO / PushDrop"
              body="Each stage is chained to the one before it on-chain, so the whole custody trail links together and can be independently verified."
            >
              token
            </InfoTip>
            , so the whole custody trail links together end-to-end.
          </TrustCol>
        </div>
      </section>

      {/* CTA */}
      <section className="wrap" style={{ padding: "0 40px 64px" }}>
        <div
          className="card card-pad flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"
          style={{
            padding: "32px 36px",
            background: "var(--hero-grad)",
            border: "1px solid var(--hero-line)",
          }}
        >
          <div>
            <div
              className="disp"
              style={{ fontSize: 23, color: "var(--hero-ink)" }}
            >
              Build your first supply chain
            </div>
            <div
              style={{
                color: "var(--hero-ink-2)",
                fontSize: 14,
                marginTop: 4,
              }}
            >
              No setup, just start with a template and add your own stages.
            </div>
          </div>
          <Link href="/create" className="btn btn-primary btn-lg">
            Open the builder
            <Icon name="arrow-right" size={17} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <div
          className="wrap flex flex-wrap items-center justify-between gap-5"
          style={{ padding: "28px 40px" }}
        >
          <Brand />
          <p
            className="faint"
            style={{ fontSize: 12, maxWidth: 460, lineHeight: 1.5 }}
          >
            Demo only: the encryption shown here is illustrative and not
            production-secure. Built on Bitcoin SV with PushDrop &amp; overlay
            services.
          </p>
          <a
            className="btn btn-outline btn-sm"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={15} />
            README &amp; repo
          </a>
        </div>
      </footer>
    </main>
  );
}
