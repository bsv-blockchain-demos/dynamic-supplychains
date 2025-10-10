import { MongoClient, ServerApiVersion, Db, Collection, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
import { actionChainValidator, locksValidator } from "../utils/mongoValidators";

// Action-chain stage with txid including the pushdrop information
export interface ActionChainStage {
    title?: string;
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

// Mongo ENVs
const uri = process.env.MONGODB_URI as string;
const clusterName = process.env.MONGODB_CLUSTER_NAME as string;

// Create the MongoClient
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Database and collections
let db: Db;
let actionChainCollection: Collection<ActionChain>;
let locksCollection: Collection<ActionLock>;

// Connect to MongoDB
async function connectToMongo() {
    if (!db) {
        try {
            // Connect the client to the server
            await client.connect();
            console.log("Connected to MongoDB!");

            // Initialize database and collections
            db = client.db(clusterName);
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

            // Create indexes for better performance
            await actionChainCollection.createIndex({ "_id": 1 });

            await actionChainCollection.createIndex(
                { "stages.TransactionID": 1 },
                {
                    name: "stages.TransactionID_unique_nonEmpty",
                    unique: true,
                    partialFilterExpression: {
                        $and: [
                            { "stages.TransactionID": { $type: "string" } },
                            { "stages.TransactionID": { $ne: "" } },
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

            console.log("MongoDB indexes created successfully");
        } catch (error) {
            console.error("Error connecting to MongoDB:", error);
            throw error;
        }
    }
    return { db, actionChainCollection, locksCollection };
}

// Connect immediately when this module is imported
connectToMongo().catch(console.error);

// Handle application shutdown
process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during MongoDB shutdown:', error);
        process.exit(1);
    }
});

export { connectToMongo, actionChainCollection, locksCollection };
