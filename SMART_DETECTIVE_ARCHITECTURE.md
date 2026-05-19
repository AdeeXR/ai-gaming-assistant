# Smart Detective - AI Gaming Coach

## Overview

Smart Detective is a FINAL-phase AI-powered competitive gaming coaching application built with **Next.js 15**, **Firebase**, **Gemini 2.5 Flash**, and a gaming-inspired UI aesthetic.

The app implements a **"Causal Handshake"** verification engine that analyzes player gameplay, identifies root causes of mistakes, verifies progress on previous objectives, and generates new actionable goals.

---

## 🎮 5 Core Pillars

### 1. **UI/UX: Modern Gaming Vibe**
- **Obsidian Base**: `#09090b` dark background
- **Cyber Cyan Accents**: `#06b6d4` for primary elements
- **Neon Purple**: `#d946ef` for highlights
- **Glassmorphism**: `bg-white/[0.03] backdrop-blur-xl border border-white/10`
- **Ambient Glows**: Blur effects for depth
- **Typography**: Bold, uppercase headers with tracking-tighter;monospace for telemetry

### 2. **Multi-Modal Synchronization (Frontend Form)**
**Component**: `src/components/Dashboard.tsx`

- Accept `textInput` (string, optional) - Gameplay context/description
- Accept `videoFile` (File, optional) - Gameplay recording
- **NOT mandatory to upload both** - Text only, Video only, or Both allowed
- FormData submission to `/api/analyze`
- Loading states with telemetry phases:
  - "Initializing causal handshake..."
  - "Extracting telemetry data..."
  - "Verifying expertise alignment..."

### 3. **The "Causal Handshake" & Verification Engine**
**Route**: `src/app/api/analyze/route.ts`

**Architecture**:
```
STEP 1 (Handshake):
  └─ Query Firestore: /users/{userId}/objectives (status == "Active")
  
STEP 2 (Multi-Modal Upload):
  └─ If video present:
     └─ Upload via GoogleAIFileManager
     └─ Wait for file to become active
  
STEP 3 (Send to Gemini):
  └─ Text input (if any)
  └─ Video URI (if any)
  └─ Past Active Objectives (if any)
  
STEP 4 (Verification):
  └─ Gemini analyzes data
  └─ Verifies progress on past objectives
  └─ Returns JSON response
  
STEP 5 (Database Update):
  └─ Update old objectives: "Improved" | "Still Failing"
  └─ Create new Active objectives in Firestore
  └─ Save full analysis to /users/{userId}/analyses
```

### 4. **AI Logic Refinement (Gemini Prompt)**

**System Instruction**:
```
"You are a Tactical Esports Analyst and Coach for games like Valorant, CS2, 
and League of Legends. You use Causal Reasoning to find the ROOT CAUSE of 
mistakes. Use advanced terminology: 'Rotation Logic', 'Crosshair Placement', 
'Defaulting', 'Utility Economy', 'Spacing', and 'Peek Advantage'. You must 
analyze the provided text/video. If previous objectives are provided, verify 
if the player has improved on them based on the new data."
```

**Forced JSON Response**:
```json
{
  "analysis": "Detailed causal analysis of what happened.",
  "errorsDetected": ["Error 1", "Error 2"],
  "verifiedPreviousObjectives": [
    { "id": "doc_id", "status": "Improved|Still Failing", "reason": "..." }
  ],
  "newActiveObjectives": ["Goal 1", "Goal 2"]
}
```

### 5. **Progression Dashboard (Closed-Loop UI)**
**Component**: `src/components/ProgressionDashboard.tsx`

Real-time listener to `/users/{userId}/objectives` collection:

- **Live To-Do List**: 
  - Displays objectives with `status == "Active"`
  - Purple theme with Target icons
  - Shows creation date

- **Verified Mastery** (Trophy Room):
  - Displays objectives with `status == "Improved"`
  - Cyan/Green theme with Trophy/Check icons
  - Shows mastery date
  - Hover scale effect

- **Stats Panel**:
  - Active Goals count
  - Skills Mastered count
  - Total Objectives
  - Win Rate %

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with nav logic
│   ├── page.tsx                      # Home (routing: login or dashboard)
│   ├── progression/
│   │   └── page.tsx                  # Progression dashboard page
│   └── api/
│       └── analyze/
│           └── route.ts              # Gemini + Firestore analysis engine
│
├── components/
│   ├── Dashboard.tsx                 # Multi-modal form + results
│   ├── ProgressionDashboard.tsx      # Closed-loop visualizer
│   ├── DashboardNav.tsx              # Navigation bar
│   ├── LoginForm.tsx                 # Gaming-themed auth
│   ├── AuthProvider.tsx              # NextAuth wrapper
│   └── ui/                           # Radix UI components
│
├── lib/
│   ├── auth.ts                       # NextAuth config + Firebase Auth
│   └── firebase.tsx                  # Firebase client context
│
├── styles/
│   └── globals.css                   # Gaming theme + utilities
│
└── types/
    └── user.d.ts                     # User, Objective, Analysis types
```

---

## 🗄️ Firestore Structure

```
users/
└── {userId}/
    ├── profiles/
    │   └── userDoc                   # User profile data
    ├── objectives/
    │   ├── {objectiveId}
    │   │   ├── text: string
    │   │   ├── status: "Active" | "Improved" | "Still Failing"
    │   │   ├── createdAt: Timestamp
    │   │   └── ...
    │   └── ...
    └── analyses/
        ├── {analysisId}
        │   ├── analysis: string
        │   ├── errorsDetected: string[]
        │   ├── verifiedObjectives: { id, status, reason }[]
        │   ├── newObjectives: string[]
        │   ├── textInput: string | null
        │   ├── videoUri: string | null
        │   └── createdAt: Timestamp
        └── ...
```

---

## 🔐 Environment Variables

See `.env.example` for the complete list. Required:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret

# Gemini API
GOOGLE_API_KEY=...
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

### 4. Create Account
- Register with email/password
- Dashboard will show after login

### 5. Try Analysis
- **Text Only**: Describe what happened in a round
- **Video Only**: Upload gameplay clip
- **Both**: Text context + video for richer analysis

---

## 📊 User Flow

```
[Login/Register]
       ↓
[Dashboard - Multi-modal Form]
       ↓
[Select Text and/or Video]
       ↓
[POST /api/analyze with FormData]
       ↓
[API: Causal Handshake Cycle]
  ├─ Query past objectives from Firestore
  ├─ Upload video if present
  ├─ Call Gemini with multi-modal data
  ├─ Parse JSON response
  └─ Update Firestore (objectives + analysis)
       ↓
[Display Analysis Results in Dashboard]
       ↓
[Progression Dashboard]
  ├─ View Active objectives
  ├─ View Improved objectives
  └─ Track stats
```

---

## 🎨 Styling

### CSS Utilities (added to `globals.css`)
- `.glass` - Glassmorphism base
- `.glow-cyan` - Cyan ambient glow
- `.glow-purple` - Purple ambient glow
- `.heading-gaming` - Gaming-style headings
- `.input-gaming` - Gaming-style inputs
- `.btn-primary` - Primary button (cyan)
- `.btn-secondary` - Secondary button (purple)
- `.card-gaming` - Gaming card base

### Color Palette
- Obsidian: `#09090b`
- Cyan: `#06b6d4` (accent, hover)
- Purple/Fuchsia: `#d946ef` (highlights)
- White/Transparent: `rgba(255,255,255,0.x)`

---

## ⚙️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 3.4, Radix UI |
| **Icons** | Lucide React |
| **Auth** | NextAuth.js 4 + Firebase Auth |
| **Database** | Firestore (NoSQL) |
| **AI** | Google Gemini 2.5 Flash + File API |
| **Backend** | Next.js API Routes |
| **Deployment** | Vercel |

---

## 🔄 Data Flow Example

### Scenario: Player submits analysis

1. **Frontend** (Dashboard.tsx):
   - Collect text input: "I pushed site without team, lost utility..."
   - Collect video file: gameplay_round_5.mp4
   - POST to `/api/analyze` with FormData

2. **Backend** (route.ts):
   - STEP 1: Query user's Active objectives from Firestore
     - Found: "Improve crosshair placement", "Better utility usage"
   
   - STEP 2: Upload video via GoogleAIFileManager
     - Video becomes active after ~2 seconds
   
   - STEP 3: Call Gemini with:
     - Text: "I pushed site without team, lost utility..."
     - Video URI: `https://generativelanguage.googleapis.com/v1beta/files/files/xyz`
     - Past goals: ["Improve crosshair placement", "Better utility usage"]
   
   - STEP 4: Gemini analyzes and returns:
     ```json
     {
       "analysis": "Committing early without team support led to 1v5...",
       "errorsDetected": ["Poor positioning", "No utility setup"],
       "verifiedPreviousObjectives": [
         {"id":"obj_1", "status":"Still Failing", "reason":"..."},
         {"id":"obj_2", "status":"Improved", "reason":"..."}
       ],
       "newActiveObjectives": ["Practice 5v5 coordination", "Pre-round recon"]
     }
     ```
   
   - STEP 5: Update Firestore:
     - Update obj_1: status="Still Failing"
     - Update obj_2: status="Improved"
     - Create new objectives with status="Active"
     - Save full analysis to /analyses collection

3. **Frontend** (Dashboard.tsx):
   - Display analysis results
   - User can navigate to Progression Dashboard
   - See new Active objectives in "Live To-Do List"
   - See verified objectives in "Trophy Room"

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Video upload hangs | Check GOOGLE_API_KEY and file size (<100MB) |
| Firestore no data | Verify FIREBASE_SERVICE_ACCOUNT_KEY is valid |
| Gemini errors | Check API quota at https://aistudio.google.com/apikey |
| Auth failed | Ensure NEXTAUTH_SECRET and Firebase credentials match |
| CSS not loading | Run `npm install` and clear `.next` folder |

---

## 📄 License & Credits

**Architecture**: Smart Detective (Final Version)  
**Built with**: Next.js 15, Firebase, Gemini API  
**UI Inspiration**: Mobalytics, Blitz.gg esports platforms

---

Generated with ✨ for competitive gaming excellence.
