You are a senior full-stack engineer and AI engineer.
Build a web-based patient management platform called **INAYA**.

The goal is to manage patients, their cases, medical documents, and AI-powered pre-analysis.

––––––––––––––––––––
TECH STACK
––––––––––––––––––––
- Frontend: Next.js (App Router), React, TypeScript
- UI: Tailwind CSS + shadcn/ui
- Backend: Next.js API routes
- Database: PostgreSQL (via Prisma) OR MongoDB (clearly structured schemas)
- Auth: Simple role-based access (admin / doctor)
- File Storage: Google Drive API
- AI: OpenAI API (OCR + document analysis)
- State management: React Server Components where possible

––––––––––––––––––––
CORE CONCEPTS (VERY IMPORTANT)
––––––––––––––––––––
- A **Patient** can have multiple **Cases**
- Updating a patient NEVER overwrites data
- Each upload creates a NEW CASE under the same patient
- AI analysis is done per CASE, not per patient
- All notes are versioned and timestamped

––––––––––––––––––––
DATA MODELS
––––––––––––––––––––

Patient:
- id
- patientCode (format: IN0001, IN0002… auto-increment)
- fullName
- nationality
- passportNumber
- createdAt

Case:
- id
- patientId
- createdAt
- aiPreAnalysis (text)
- documents[] (links to Google Drive)

Note:
- id
- caseId
- content
- author
- createdAt

––––––––––––––––––––
PAGES & FEATURES
––––––––––––––––––––

1) PATIENT CREATE / UPDATE PAGE

Purpose:
Add a new patient OR add a new case to an existing patient.

Features:
- Patient name input with autocomplete:
  - While typing (e.g. “Alex”), query DB and suggest existing patients
  - If selected → attach a NEW CASE
  - If not found → create a NEW PATIENT

- Patient info form:
  - Full name
  - Nationality
  - Passport number
  - Any additional identity fields

- Passport OCR:
  - Upload passport scan (image or PDF)
  - Use OpenAI API to extract:
    - Name
    - Nationality
    - Passport number
  - Auto-fill form fields with extracted data
  - User can edit before saving

- File upload section:
  - Allow multiple files (PDFs, images)
  - Upload to Google Drive
  - Folder structure:
    /INAYA/
      /IN0001_Alex_Smith/
        /Case_2024-01-15/
          files…
  - Store Google Drive links in DB

- On submit:
  - If patient exists → create NEW CASE
  - If new → create patient + first case

––––––––––––––––––––
2) AI CASE PRE-ANALYSIS
––––––––––––––––––––

After files are uploaded:
- Send all documents’ text to OpenAI
- Generate a **medical pre-analysis**:
  - Summary of condition
  - Key observations
  - Potential red flags
  - “This is NOT a diagnosis” disclaimer
- Save result inside the Case record

––––––––––––––––––––
3) PATIENT LIST PAGE
––––––––––––––––––––

Features:
- Table or card view of all patients
- Advanced search:
  - By patient name
  - By patient code
  - By doctor (if applicable)
- Click a patient → go to Patient Profile

––––––––––––––––––––
4) PATIENT PROFILE PAGE
––––––––––––––––––––

Displays:
- Patient identity information
- List of all CASES (chronological)

For each CASE:
- Uploaded documents (links)
- AI pre-analysis
- Notes section

Notes:
- Add notes per case
- Notes are append-only (no overwrite)
- Display full note history with timestamps

––––––––––––––––––––
UX / UI REQUIREMENTS
––––––––––––––––––––
- Clean, medical-grade UI
- Fast autocomplete (debounced)
- Loading states for AI + uploads
- Clear separation:
  Patient → Cases → Notes
- No accidental data overwrite possible

––––––––––––––––––––
DELIVERABLE
––––––––––––––––––––
Generate:
- Database schema
- API routes
- Core React components
- Google Drive integration logic
- OpenAI OCR + analysis logic
- Minimal but functional UI

Assume this is an MVP but built cleanly for future scaling.
