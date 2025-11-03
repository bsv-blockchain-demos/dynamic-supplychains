import { MongoClient, ServerApiVersion, Db, Collection, ObjectId } from "mongodb";
import { actionChainValidator, locksValidator } from "../utils/mongoValidators";
import { getRequiredEnv } from "./env";

// Action-chain stage with txid including the pushdrop information
export interface ActionChainStage {
    title?: string;
    imageURL?: string;
    Timestamp: Date;
    TransactionID: string;
}

// Action-chain that will showcase each action in stages (soil->harvest->plate)
export interface ActionChain {
    _id: ObjectId;
    userId: string;
    title?: string;
    stages: ActionChainStage[];
    createdAt?: Date | null;
    updatedAt?: Date | null;
    finalized?: boolean;
    finalizedAt?: Date | null;
}

// Action-lock to prevent multiple actions from being processed at the same time
export interface ActionLock {
    _id: ObjectId;
    actionChainId: ObjectId;
    userId: string;
    createdAt: Date;
}

// Chain transfer record - tracks chains sent from one user to another
export interface ChainTransfer {
    _id: ObjectId;
    actionChainId: ObjectId;
    senderPubKey: string;
    receiverPubKey: string;
    sentAt: Date;
    continued: boolean; // Has the receiver continued the chain?
    continuedAt?: Date | null;
}

// Extract database name from URI
function getDatabaseNameFromUri(connectionUri: string): string {
    try {
        // Parse the URI to extract the database name
        const url = new URL(connectionUri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
        const dbName = url.pathname.slice(1).split('?')[0]; // Remove leading '/' and query params

        if (!dbName) {
            throw new Error('Database name not found in MONGODB_URI. Please include the database name in the connection string (e.g., mongodb+srv://user:pass@cluster.mongodb.net/supplychain)');
        }

        return dbName;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Database name not found')) {
            throw error;
        }
        throw new Error('Failed to parse MONGODB_URI. Please ensure it is a valid MongoDB connection string with a database name.');
    }
}

// Lazy initialization - only get env vars when actually connecting
function getMongoConfig() {
    const uri = getRequiredEnv('MONGODB_URI');
    const dbName = getDatabaseNameFromUri(uri);
    return { uri, dbName };
}

// Client will be initialized on first connection
let client: MongoClient | null = null;

// Database and collections
let db: Db;
let actionChainCollection: Collection<ActionChain>;
let locksCollection: Collection<ActionLock>;
let chainTransfersCollection: Collection<ChainTransfer>;

// Connect to MongoDB
async function connectToMongo() {
    if (!db) {
        try {
            // Get config only when actually connecting
            const { uri, dbName } = getMongoConfig();

            // Initialize client if not already done
            if (!client) {
                client = new MongoClient(uri, {
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                    }
                });
            }

            // Connect the client to the server
            await client.connect();
            console.log("Connected to MongoDB!");

            // Initialize database and collections
            db = client.db(dbName);
            // Ensure collections exist with validators applied
            const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));

            // action-chain collection
            if (!existing.has("actionChain")) {
                await db.createCollection("actionChain", {
                    validator: actionChainValidator as any,
                    validationLevel: "strict",
                });
            } else {
                try {
                    await db.command({
                        collMod: "actionChain",
                        validator: actionChainValidator,
                        validationLevel: "strict",
                    });
                } catch (e) {
                    console.warn("collMod actionChain failed (will continue):", e);
                }
            }

            // action locks collection
            if (!existing.has("action_locks")) {
                await db.createCollection("action_locks", {
                    validator: locksValidator as any,
                    validationLevel: "strict",
                });
            } else {
                try {
                    await db.command({
                        collMod: "action_locks",
                        validator: locksValidator as any,
                        validationLevel: "strict",
                    });
                } catch (e) {
                    console.warn("collMod action_locks failed (will continue):", e);
                }
            }

            // Get typed collection handles
            actionChainCollection = db.collection("actionChain");
            locksCollection = db.collection("action_locks");
            chainTransfersCollection = db.collection("chain_transfers");

            // Create indexes for better performance
            await actionChainCollection.createIndex({ "_id": 1 });

            await actionChainCollection.createIndex(
                { "stages.TransactionID": 1 },
                {
                    name: "stages.TransactionID_unique_nonEmpty",
                    unique: true,
                    partialFilterExpression: {
                        $and: [
                            { "stages.TransactionID": { $exists: true } },
                            { "stages.TransactionID": { $type: "string" } },
                            { "stages.TransactionID": { $gt: "" } },
                        ],
                    },
                }
            );

            // Ensure single lock per user (delete the lock upon completion)
            await locksCollection.createIndex(
                { userId: 1 },
                {
                    name: "uniqueLockPerUser",
                    unique: true,
                }
            );

            // Ensure single lock per chain (prevent multiple users locking same chain)
            await locksCollection.createIndex(
                { actionChainId: 1 },
                {
                    name: "uniqueLockPerChain",
                    unique: true,
                }
            );

            // Create indexes for chain transfers
            await chainTransfersCollection.createIndex({ receiverPubKey: 1, sentAt: -1 });
            await chainTransfersCollection.createIndex({ actionChainId: 1 });
            await chainTransfersCollection.createIndex({ senderPubKey: 1, sentAt: -1 });

            console.log("MongoDB indexes created successfully");
        } catch (error) {
            console.error("Error connecting to MongoDB:", error);
            throw error;
        }
    }
    return { db, actionChainCollection, locksCollection, chainTransfersCollection };
}

// Handle application shutdown
process.on('SIGINT', async () => {
    try {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error during MongoDB shutdown:', error);
        process.exit(1);
    }
});

export { connectToMongo, actionChainCollection, locksCollection, chainTransfersCollection };
