# Dynamic Supply Chains

> **Build any custom supply chain lifecycle.**

*(formerly "Supply Chain Action Builder")*

A flexible, fully-customisable **Dynamic Supply Chain** engine built on Bitcoin SV (BSV). Compose a verifiable lifecycle for *any* product — agriculture, manufacturing, aviation, pharmaceuticals, logistics — from free-form **stages**, each carrying arbitrary key/value metadata and recorded as an immutable, encrypted on-chain transaction. Nothing about the journey is hard-coded; you design the chain to fit the product.

It was built to **supersede bespoke, industry-specific supply-chain implementations**: rather than maintaining one codebase per vertical, the same engine adapts to any product journey. Each completed chain is a verifiable, end-to-end record of a product's life, custody, and provenance, anchored to the blockchain.

The flexibility comes from three things:
- **Free-form stages** — name each step whatever your use case needs (1–8 stages per chain).
- **Custom metadata** — attach any key/value fields to a stage (location, supplier, test results, certifications, …).
- **Optional templates** — start from a pre-built journey (e.g. "Soil to Table") or build from scratch.

## What this demonstrates

The "dynamic" in Dynamic Supply Chain means the chain is assembled at runtime rather than pre-defined:

- **Variable stage count and structure** — no fixed schema; the journey is whatever the participants build.
- **Arbitrary metadata** per stage, decided as you go.
- **Multi-party handoff and branching** — a chain can be passed between any number of independent participants, each adding their own stage before forwarding it on.
- **Immutable, encrypted on-chain record** — every stage is a BSV transaction whose data is encrypted to the next party's key, so the chain is privacy-preserving yet verifiable.

**Example flow:** Alice creates a chain and adds stage 1 (raw materials) → Alice forwards it to Bob → Bob adds stage 2 (manufacturing) and forwards to Carol → Carol adds stage 3 (distribution) and finalizes. The finalized chain is a complete product record that anyone can browse in the Directory, with each stage backed by its own on-chain transaction.

## Core Concepts

### 1. Action Chains

An **action chain** is a product's supply chain, made of multiple stages. Each stage is recorded as a BSV transaction using the PushDrop protocol.

- **Stages**: Individual steps in the journey (e.g. "Raw Material Extraction", "Manufacturing", "Distribution"). 1–8 stages per chain.
- **Metadata**: Custom key/value pairs attached to each stage.
- **Finalization**: A chain must have at least **2 stages and a title** to be finalized. Once finalized it is immutable and appears in the public Directory.

### 2. PushDrop Protocol

The application uses the **PushDrop protocol** from the BSV SDK to store stage data on-chain. Each stage's metadata (as JSON) is AES-encrypted and embedded in a PushDrop locking script under a 1-satoshi output, using the custom protocol ID `[0, 'supplychain']`.

**Note:** Data is encrypted using a symmetric key derived from the receiver's public key, but this is a demo implementation and should **not** be considered cryptographically secure for production use.

### 3. On-Chain Architecture

This is what makes the chain verifiable end-to-end:

- **Per-stage encryption** — each stage's JSON is encrypted with `SymmetricKey(sha256(receiverPubKey))` and embedded in the PushDrop script. Only the intended receiver's wallet can decrypt it. If no receiver is specified, the data is locked to the creator ("self").
- **UTXO chaining** — each new stage *spends the previous stage's 1-satoshi PushDrop output* and creates a new one. This forms a literal on-chain chain of custody: the transactions are linked input-to-output, stage after stage.
- **BSV overlay network** — transactions are broadcast to a BSV overlay service (topic `tm_supplychain`) and discovered/retrieved via its lookup service (`ls_supplychain`) at `https://overlay-us-1.bsvb.tech`. The overlay is how the app fetches the previous stage's transaction (as BEEF) so the next stage can spend it, and how finalized chains are discovered. A `chainId` is attached as an off-chain value at broadcast time.

#### On-chain vs MongoDB

| Stored on-chain (BSV)                          | Stored in MongoDB                                            |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Stage transaction ID (proof the stage exists)  | Chain title, created/updated/finalized timestamps & flag    |
| Encrypted stage metadata (in PushDrop script)  | Stage display fields (title, imageURL, TXID reference)      |
| The UTXO chain linking stage → stage           | Ownership **locks** and **transfer** records (custody)      |

The blockchain holds the verifiable record; MongoDB provides fast querying, custody tracking, and the demo UI's working state.

### 4. Receiver Keys & Transfers

When creating a stage, you can specify a **receiver public key** to send the chain to another user:

- **No receiver key** → chain locked to yourself; you retain ownership.
- **Provide receiver key** → chain encrypted and sent to that user; ownership transfers to them.

### 5. Ownership & Permissions

Two mechanisms track custody:

#### A. Locks Collection
```typescript
interface ActionLock {
    _id: ObjectId;
    actionChainId: ObjectId;
    userId: string;        // User's public key
    createdAt: Date;
}
```
- Created when a user keeps a chain for themselves (proves active ownership).
- One lock per user per chain (enforced by unique indexes).
- Deleted when the chain is sent to another user.

#### B. ChainTransfer Collection
```typescript
interface ChainTransfer {
    _id: ObjectId;
    actionChainId: ObjectId;
    senderPubKey: string;
    receiverPubKey: string;
    sentAt: Date;
    continued: boolean;      // Has receiver added a stage?
    continuedAt?: Date;
}
```
- Tracks chain transfers between users.
- `continued: false` → chain appears in the receiver's inbox.
- `continued: true` → receiver has added a stage; chain leaves the inbox.

A user may send a chain if they are the original creator (on the first stage), currently hold a lock, or are the most recent receiver who has continued it. This handles chains sent immediately on the first stage, chains bouncing between multiple users, and chains passed forward without being kept.

## User Workflows

### Creating a Chain
1. Navigate to the **Create** page.
2. Enter an Action Chain Title.
3. Optionally select a template (e.g. "Soil to Table", "Plastic Product Lifecycle").
4. Add stages with custom metadata.
5. For each stage:
   - **Leave receiver empty** → lock to self, continue building.
   - **Provide receiver key** → send to another user, transfer ownership.
6. Once there are ≥2 stages, click **Finalize Action Chain**.

### Receiving a Chain
1. Navigate to the **Received** page (the navbar shows a badge with the pending count).
2. View chains sent to you (where `continued: false`).
3. Click **Continue Chain** to add a stage.
4. Choose to:
   - **Keep for self** (no receiver) → create a lock, continue building.
   - **Send to someone else** → transfer ownership onward.

### Browsing the Directory
1. Navigate to the **Directory** page — a paginated, searchable gallery of all finalized supply chains (search by title, ID, creator, or stage).
2. Click any chain to open `/directory/[id]` and view its full stage history.

### Viewing Stage Details
- Click any stage card to open the details panel.
- View decrypted stage metadata and the blockchain transaction details.
- Click **Expand Full Details** for the full-screen modal view (shows receiver/sender public keys and lock status).

## Key Features

### Automatic Pending Count
The navbar shows a real-time badge on **Received** with the count of pending chains, refreshed every 30 seconds (shows "9+" for 10 or more).

### Title Validation
When sending to another user, a chain title is **required** — the send button is disabled and a warning appears until one is provided, ensuring every transferred chain has a meaningful identifier.

### Template System
Pre-defined templates with ready-made stage structures (7 stages each):
- **Soil to Table** — agricultural supply chain.
- **Plastic Product Lifecycle** — manufacturing to recycling.
- **Aircraft Parts Lifecycle** — aviation supply chain.

Templates are just starting points; you can rename stages, add/remove them (1–8), and define any metadata fields.

## Technical Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Blockchain**: Bitcoin SV (BSV)
- **BSV libraries**: `@bsv/sdk` (PushDrop, Transaction, WalletClient) and `@bsv/wallet-toolbox`
- **Overlay services**: BSV overlay network (`tm_supplychain` topic / `ls_supplychain` lookup)
- **Database**: MongoDB (`actionChains`, `locks`, `chainTransfers`)
- **Styling**: Tailwind CSS v4
- **State management**: React Context (wallet)
- **Notifications**: react-hot-toast

## Getting Started

### Prerequisites
- **A BRC-100 wallet running at `localhost:4000`.** The app connects via `WalletClient('auto', 'localhost:4000')`; your wallet's identity public key becomes your user ID. Nothing on-chain works without it.
- **A MongoDB instance** reachable via `MONGODB_URI`.
- Node.js 20+.
- (The BSV overlay endpoint is a public default — `https://overlay-us-1.bsvb.tech` — and requires no configuration.)

### Install
```bash
npm install
```

### Environment Variables
Create a `.env.local` file with your MongoDB connection string (the database name is parsed from the URI path):
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/supplychain
```

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Connect Wallet
Click **Connect Wallet** in the navbar to initialize your BSV wallet (requires the wallet server above).

## API Routes

### Stages
- `POST /api/stages/new-stage` — create the first stage (new chain) or append a stage to an existing chain
- `POST /api/stages/finalize` — finalize a chain (requires ≥2 stages and a title)
- `GET /api/stages/current` — get the user's current active (locked, non-finalized) chain

### Chains / Transfers
- `POST /api/chains/send` — send a chain to another user (creates a transfer, removes sender's lock)
- `GET /api/chains/received` — get chains sent to a user (where `continued: false`)
- `GET /api/chains/pending-count` — count of pending received chains (used by the navbar badge)
- `POST /api/chains/continue` — add a stage to a received chain and mark the transfer continued
- `GET /api/chains/receiver` — receiver lookup helper

### Locks
- `POST /api/lock` — create an ownership lock
- `GET /api/lock` — check the user's active lock
- `POST /api/lock/check` — check lock state (prevents double-locking)

### Discovery & Health
- `GET /api/examples` — fetch finalized chains with search, filtering, and pagination
- `GET /health` — liveness check
- `GET /ready` — readiness check (verifies dependencies such as MongoDB)

## Database Collections

### actionChains
- Stores complete action chains with all stages.
- Each stage includes: `TransactionID`, `Timestamp`, `title`, `imageURL`, and custom metadata. 1–8 stages per chain.

### locks
- Proves active ownership of a chain (one lock per user per chain).
- Deleted when a chain is sent to another user.

### chainTransfers
- Tracks all transfers between users.
- `continued: false` → appears in the receiver's inbox.
- `continued: true` → receiver has taken action.

## Testing

The project uses **Jest** (with `ts-jest`). Tests live in `_tests/`:
- `pushdrop.test.ts` — PushDrop locking-script creation, transaction creation and spending (same wallet **and** cross-wallet, i.e. a receiver unlocking a sender's token), complex supply-chain payloads, and error handling.
- `encryption.test.ts` — symmetric encryption/decryption round-trips and failure with the wrong key.
- `test-utils.ts` — wallet/mocking helpers (`makeWallet`, `MockChain`).

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

## Deployment

A multi-stage **Dockerfile** (Node 20 Alpine, Next.js standalone output, runs as a non-root user on port 3000) is included:

```bash
docker build -t dynamic-supplychains .
docker run -p 3000:3000 -e MONGODB_URI="<your-uri>" dynamic-supplychains
```

CI is configured in `.github/workflows/build.yml`: pushing a `v*` tag (e.g. `v1.2.3`) builds a **multi-arch** image (linux/amd64 + linux/arm64) and publishes it to the GitHub Container Registry (GHCR).

## Security & Privacy

- **Blockchain verification**: every stage is recorded as a BSV transaction, linked to the previous stage via UTXO chaining.
- **Per-stage encryption**: stage data is encrypted to the next party's public key.
- **Permission system**: multi-factor ownership checks (creator / lock / latest continued receiver) prevent unauthorized transfers.
- **Custody tracking**: locks and transfer records maintain a clear chain of custody.

## DISCLAIMER

This is a public, open-source demo. The encryption is **not** production-secure. Do not use it directly for real or sensitive supply-chain data.

## License

MIT
