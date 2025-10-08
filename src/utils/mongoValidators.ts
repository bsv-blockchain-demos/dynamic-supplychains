export const actionChainValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "stages"],
    additionalProperties: false,
    properties: {
      _id: {}, // created by Mongo
      userId: { bsonType: "string" },
      createdAt: { bsonType: ["date", "null"] },
      updatedAt: { bsonType: ["date", "null"] },
      stages: {
        bsonType: "array",
        minItems: 2,
        maxItems: 8,
        items: {
          bsonType: "object",
          required: ["Timestamp", "TransactionID"],
          additionalProperties: true,
          properties: {
            // Prefer a normalized title, but allow projects that provide dynamic keys (e.g., stage1Title)
            title: { bsonType: "string" },
            Timestamp: { bsonType: "date" },
            TransactionID: { bsonType: "string" },
          },
          // Accept dynamic keys like stage1Title, stage2Title, ... if present.
          // MongoDB supports patternProperties in $jsonSchema.
          patternProperties: {
            "^stage[0-9]+Title$": { bsonType: "string" },
          },
        },
      },
    },
  },
} as const;

// Validator for the action_locks collection
export const locksValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["actionChainId", "userId", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: {},
      actionChainId: { bsonType: "objectId" },
      userId: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
} as const;
