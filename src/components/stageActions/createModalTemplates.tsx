export interface StageTemplate {
    name: string;
    keys: string[];
}

export interface ChainTemplate {
    title: string;
    stages: StageTemplate[];
}

export const CHAIN_TEMPLATES: ChainTemplate[] = [
    {
        title: "Soil to Table",
        stages: [
            {
                name: "Soil Preparation",
                keys: ["location", "soilType", "fertilizerUsed", "startDate"]
            },
            {
                name: "Planting",
                keys: ["cropType", "seedSource", "method", "responsibleParty"]
            },
            {
                name: "Growing & Irrigation",
                keys: ["irrigationMethod", "waterSource", "growthDurationDays", "pesticidesUsed"]
            },
            {
                name: "Harvesting",
                keys: ["harvestDate", "toolsUsed", "laborCount", "yieldAmount"]
            },
            {
                name: "Processing & Packaging",
                keys: ["processingPlant", "processType", "packagingMaterial"]
            },
            {
                name: "Distribution",
                keys: ["distributor", "destinationMarket", "transportMethod"]
            },
            {
                name: "Retail & Consumption",
                keys: ["retailLocation", "retailPrice", "shelfLife"]
            }
        ]
    },
    {
        title: "Plastic Product Lifecycle",
        stages: [
            {
                name: "Raw Material Extraction",
                keys: ["sourceMaterial", "supplier", "extractionMethod"]
            },
            {
                name: "Polymerization",
                keys: ["chemicalProcess", "plantLocation", "outputType"]
            },
            {
                name: "Product Manufacturing",
                keys: ["factory", "machineUsed", "energyConsumption"]
            },
            {
                name: "Packaging",
                keys: ["materialType", "packagingDesign", "labeling"]
            },
            {
                name: "Distribution",
                keys: ["distributor", "regionsCovered", "transportMethod"]
            },
            {
                name: "Consumer Use",
                keys: ["intendedUse", "lifecycleDuration", "safetyInstructions"]
            },
            {
                name: "Recycling or Disposal",
                keys: ["recyclingMethod", "recyclingFacility", "wasteOutput"]
            }
        ]
    },
    {
        title: "Aircraft Parts Lifecycle",
        stages: [
            {
                name: "Material Sourcing",
                keys: ["materialType", "supplier", "qualityCertification"]
            },
            {
                name: "Component Manufacturing",
                keys: ["componentName", "factoryLocation", "machineType"]
            },
            {
                name: "Assembly & Integration",
                keys: ["assemblyLine", "engineerTeam", "assemblyDate"]
            },
            {
                name: "Testing & Certification",
                keys: ["testType", "certificationBody", "results"]
            },
            {
                name: "Deployment (Aircraft Installation)",
                keys: ["aircraftModel", "installationDate", "maintenanceSchedule"]
            },
            {
                name: "Operational Use",
                keys: ["flightHours", "maintenanceChecks", "performanceNotes"]
            },
            {
                name: "Decommissioning or Recycling",
                keys: ["recyclingFacility", "disposalMethod", "salvagedParts"]
            }
        ]
    }
];