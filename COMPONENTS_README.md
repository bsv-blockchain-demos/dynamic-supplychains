# Action Chain Components

## Overview
Dynamic action chain builder for creating blockchain supply chain stages with full state management.

## Stage Limits (from MongoDB validator)
- **Minimum:** 2 stages required
- **Maximum:** 8 stages allowed

## Components

### 1. **StagesColumn** (`src/components/renderStages/stagesColumn.tsx`)
Main container that displays stages vertically with state management.

**Features:**
- Manages internal state of stages
- Renders existing stages using `StageItem`
- Shows an "Add Stage" card (+ icon) that opens the modal
- New stages appear at the TOP of the column
- "Add Stage" card always appears at the bottom
- Disables adding stages when max (8) is reached
- Shows warning when minimum (2) stages not met
- Displays stage counter (e.g., "3/8 stages")

**Usage:**
```tsx
import { StagesColumn } from "./components/renderStages/stagesColumn";

<StagesColumn stages={[]} /> // Empty state (optional prop)
// or
<StagesColumn stages={existingStages} /> // With initial stages
```

### 2. **StageItem** (`src/components/renderStages/stageItem.tsx`)
Individual stage card component.

**Features:**
- Displays stage title, transaction ID, and timestamp
- Shows placeholder image area (can be customized with real images)
- "No tokens yet" section on the right
- Hover effects and smooth animations

**Props:**
```tsx
interface StageItemProps {
  stage: ActionChainStage;
}
```

### 3. **CreateStageModal** (`src/components/stageActions/createStageModal.tsx`)
Modal for creating new stages.

**Features:**
- Form with stage title and metadata inputs
- Form validation (required fields)
- Loading state during submission
- Click outside to close
- Close button (X)
- Automatically creates stage with current timestamp
- Calls `onSubmit` callback with new stage data
- Closes modal and resets form after successful submission

**Props:**
```tsx
interface CreateStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stage: ActionChainStage) => void;
}
```

**Stage Structure:**
```tsx
{
  title: string,           // User-provided title
  Timestamp: Date,         // Auto-generated current date
  TransactionID: string    // User-provided metadata
}
```

## Pages

### Home Page (`src/app/page.tsx`)
Shows the initial empty state with just the "Add Stage" card.

### Examples Page (`src/app/examples/page.tsx`)
Demonstrates the components with sample data including:
- Wellhead
- Gathering Pipeline Custody
- Processing Plant

## Running the App

```bash
npm run dev
```

Then visit:
- `http://localhost:3000` - Empty state
- `http://localhost:3000/examples` - With example stages

## Styling
- Uses **TailwindCSS** for styling
- Blue gradient background matching the original design
- Card-based layout with shadows and hover effects
- Responsive design

## Next Steps

To integrate with your backend:

1. **Update CreateStageModal** to call your API:
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    const response = await fetch('/api/stages', {
      method: 'POST',
      body: JSON.stringify({ 
        title, 
        TransactionID: transactionId,
        Timestamp: new Date()
      })
    });
    
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

2. **Fetch stages** in your page components
3. **Add stage update/delete functionality** if needed
4. **Add image upload** for stage illustrations
5. **Implement token functionality** for the "No tokens yet" section
