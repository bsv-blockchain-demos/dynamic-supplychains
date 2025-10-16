# Supply Chain Action Builder

A blockchain-based supply chain management system built on Bitcoin SV (BSV) that enables users to create, transfer, and track multi-stage action chains with on-chain data storage and ownership verification.

## Overview

This application allows users to:
- Create blockchain-based action chains with multiple stages
- Send and receive chains between users
- Store stage data on the blockchain with PushDrop protocol
- Track ownership and transfers via locks and transfer records
- View stage details and transaction history

## Core Concepts

### 1. Action Chains
Action chains represent supply chain workflows consisting of multiple stages. Each stage is recorded as a blockchain transaction using the PushDrop protocol.

- **Stages**: Individual steps in the supply chain (e.g., "Raw Material Extraction", "Manufacturing", "Distribution")
- **Metadata**: Custom key-value pairs attached to each stage
- **Finalization**: Chains must have at least 2 stages and a title to be finalized

### 2. PushDrop Protocol

The application uses the **PushDrop protocol** from BSV SDK to create blockchain transactions with data storage.

**Note:** Data is encrypted using AES with a symmetric key, but this is a demo implementation and should not be considered cryptographically secure for production use.

### 3. Receiver Keys & Transfers

When creating a stage, you can specify a **receiver public key** to send the chain to another user:

- **No receiver key** → Chain locked to yourself, you retain ownership
- **Provide receiver key** → Chain sent to that user, ownership transferred

### 4. Ownership & Permissions

The system uses two main mechanisms to track ownership:

#### A. Locks Collection
```typescript
interface ActionLock {
    _id: ObjectId;
    actionChainId: ObjectId;
    userId: string;        // User's public key
    createdAt: Date;
}
```
- Created when a user keeps a chain for themselves
- Proves active ownership
- Deleted when chain is sent to another user

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
- Tracks chain transfers between users
- `continued: false` → Chain appears in receiver's inbox
- `continued: true` → Chain no longer appears in receiver's inbox

The system handles various ownership scenarios including chains sent immediately on first stage, chains bouncing between multiple users, and chains passed forward without being kept.

## User Workflows

### Creating a Chain
1. Navigate to "Create" page
2. Enter an Action Chain Title
3. Optionally select a template (e.g., "Soil to Table", "Plastic Product Lifecycle")
4. Add stages with metadata
5. For each stage:
   - **Leave receiver empty** → Lock to self, continue building
   - **Provide receiver key** → Send to another user, lose ownership
6. Once ≥2 stages, click "Finalize Action Chain"

### Receiving a Chain
1. Navigate to "Received" page (shows badge with pending count)
2. View chains sent to you (where `continued: false`)
3. Click "Continue Chain" to add a stage
4. Choose to:
   - **Keep for self** (no receiver) → Create lock, continue building
   - **Send to someone else** → Transfer ownership

### Viewing Stage Details
- Click on any stage card to open details panel
- View stage metadata and blockchain transaction details
- Click "Expand Full Details" for full-screen modal view
- Shows receiver information and sender public key

## Key Features

### Automatic Pending Count
The navbar shows a real-time badge on "Received" with the count of pending chains:
```typescript
// Fetches count every 30 seconds
const count = await fetch('/api/chains/pending-count?receiverPubKey=<pubkey>');
// Shows red badge with number (or "9+" for 10+)
```

### Title Validation
When sending to another user, a chain title is **required**:
- Modal button disabled if receiver specified without title
- Red warning message appears
- Ensures all transferred chains have meaningful identifiers

### Template System
Pre-defined templates with stage structures:
- **Soil to Table**: Agricultural supply chain (7 stages)
- **Plastic Product Lifecycle**: Manufacturing to recycling (7 stages)
- **Aircraft Parts Lifecycle**: Aviation supply chain (7 stages)

## Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Blockchain**: Bitcoin SV (BSV)
- **SDK**: @bsv/sdk (PushDrop, Transaction, Wallet APIs)
- **Database**: MongoDB (ActionChains, Locks, ChainTransfers)
- **Styling**: Tailwind CSS
- **State Management**: React Context (Wallet)

## Getting Started

### Prerequisites
```bash
npm install
```

### Environment Variables
Create a `.env.local` file:
```env
MONGODB_URI=your_mongodb_connection_string
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Connect Wallet
Click "Connect Wallet" in the navbar to initialize your BSV wallet.

## API Routes

- `POST /api/stages` - Create a new stage
- `POST /api/stages/finalize` - Finalize an action chain
- `GET /api/stages/current` - Get user's current active chain
- `POST /api/chains/send` - Send chain to another user
- `GET /api/chains/received` - Get received chains (not continued)
- `GET /api/chains/pending-count` - Count of pending received chains
- `POST /api/chains/continue` - Continue a received chain
- `POST /api/lock` - Create ownership lock

## Database Collections

### actionChains
- Stores complete action chains with all stages
- Each stage includes: TransactionID, Timestamp, title, imageURL, metadata

### locks
- Proves active ownership of a chain
- One lock per user per chain
- Deleted when chain is sent to another user

### chainTransfers
- Tracks all transfers between users
- `continued: false` → Appears in receiver's inbox
- `continued: true` → Receiver has taken action

## Security & Privacy

- **Blockchain Verification**: All stages recorded as BSV transactions
- **Permission System**: Multi-factor verification prevents unauthorized transfers
- **Ownership Tracking**: Locks and transfer records ensure proper chain custody

## DISCLAIMER:
This is a public open source demo, encryption is not secure. Do not directly use this for real or sensitive supply chain data.

## License

MIT
