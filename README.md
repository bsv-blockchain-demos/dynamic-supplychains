# Dynamic Supply Chains

A Next.js demo for recording configurable product journeys on BSV. Users create a chain of stages, attach metadata and images, pass the chain between wallet identities, and browse completed chains in a directory.

Stages use 1-satoshi PushDrop outputs. MongoDB holds the application's working records, visibility settings and transfer state; a BSV overlay supplies transaction lookup and indexing.

## What it demonstrates

- Free-form stage names and metadata, with up to eight stages per chain.
- Starting templates for produce, plastic products and aircraft parts.
- Wallet-controlled transaction outputs and continuation by another participant.
- Finalisation after at least two stages and a chain title.
- A searchable directory, received-chain inbox and application-level visibility controls.
- Optional image uploads to S3.

The source includes Next.js 16, React 19, TypeScript, Tailwind CSS 4, MongoDB and the BSV SDK.

## Data and custody

The browser asks a BRC-100 wallet to create or spend a stage output. Subsequent stages can spend the previous output, forming a transaction chain. Overlay interaction uses topic `tm_supplychain` and lookup service `ls_supplychain`, configured in [overlayFunctions.ts](src/utils/overlayFunctions.ts).

| Store | Contents |
| --- | --- |
| BSV transactions | PushDrop stage payloads and links between spent and created outputs. |
| MongoDB `actionChain` | Chain title, stage display fields, transaction references and finalisation/visibility state. |
| MongoDB `action_locks` | Current locks, with unique indexes on user and chain. |
| MongoDB `chain_transfers` | Sender, receiver and continuation state. |
| S3 | Uploaded image objects, returned through a public URL or configured CDN. |

Stage payloads are encrypted with a symmetric key derived from the receiver's **public** key. Anyone who knows that public key can derive the decryption key. The transaction spending conditions and data confidentiality are separate: this scheme does not keep supply-chain information private.

API handlers use submitted public-key identifiers for ownership comparisons without a wallet-signature authentication layer. Directory visibility is an application filter. Use demonstration data; the current implementation does not establish verified real-world custody or confidential access.

## Requirements

- Node.js 22 and npm.
- MongoDB with a database name in its connection string.
- A funded, compatible BRC-100 wallet. The client constructs `WalletClient('auto', 'localhost:4000')`.
- Access to the configured BSV overlay for transaction lookup and submission.
- AWS S3 credentials and a readable object URL if uploading images.

## Local setup

```sh
git clone https://github.com/bsv-blockchain-demos/dynamic-supplychains.git
cd dynamic-supplychains
npm ci
```

Create `.env.local`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/supplychain
```

For image uploads, also configure these server-only variables:

| Variable | Purpose |
| --- | --- |
| `AWS_REGION` | S3 region. |
| `AWS_S3_BUCKET` | Bucket name or `s3://` bucket URI. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credentials for writing image objects. |
| `S3_PUBLIC_BASE_URL` | Optional public CDN/base URL; otherwise a standard S3 URL is returned. |

The upload code writes objects but does not grant public read access. Configure the bucket or CDN to serve the returned URLs. MongoDB collections, validators and indexes are prepared when the database connection is first used.

```sh
npm run dev
```

Open `http://localhost:3000` and connect the wallet. Create a chain, add a stage, then keep it or supply another participant's public key. A receiver continues it from the **Received** page. Finalised chains appear in the directory according to their visibility setting.

Wallet actions can spend BSV. Keep the wallet network and the configured overlay consistent.

## API and source guide

| Area | Routes |
| --- | --- |
| Stages | `/api/stages/new-stage`, `/api/stages/current`, `/api/stages/finalize` |
| Transfers | `/api/chains/send`, `/api/chains/received`, `/api/chains/continue`, `/api/chains/pending-count`, `/api/chains/receiver` |
| Visibility | `/api/chains/visibility` |
| Locks | `/api/lock`, `/api/lock/check` |
| Directory and uploads | `/api/examples`, `/api/upload` |
| Probes | `/health`, `/ready` |

See [src/app/api/](src/app/api/) for request shapes, [pushdropHelpers.ts](src/utils/pushdropHelpers.ts) for locking and encryption, and [mongo.ts](src/lib/mongo.ts) for persistence. The overlay's topic-manager and lookup-service implementations are not included in this repository.

## Builds and tests

```sh
npm run build
npm start
```

For the local encryption tests:

```sh
npm test -- --runInBand --runTestsByPath _tests/encryption.test.ts
```

The short-key assertion in `encryption.test.ts` currently fails with the locked SDK: decryption does not throw as the test expects. The other two encryption checks pass.

The complete Jest suite also includes PushDrop tests whose wallet helper connects to `https://store-us-1.bsvb.tech`. `MockChain` substitutes proof checks; it does not make those wallet tests offline. Review that dependency before using `npm test`, `test:watch` or `test:coverage`.

## Deployment

The [Dockerfile](Dockerfile) builds a standalone Next.js application on port 3000. Supply MongoDB and any S3 configuration at runtime. The [build workflow](.github/workflows/build.yml) publishes container images for version tags.

Authentication, data confidentiality and production operation need further development before exposing this demo to untrusted users.

## Licence

A licence file is not included in this checkout. The earlier README's MIT label is not accompanied by licence terms; the intended licence needs confirmation.
