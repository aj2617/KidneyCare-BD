# Architecture Guide

## Overview

KidneyCare BD is implemented as a single-repository full-stack application:

- React frontend for UI
- Express backend for APIs
- SQLite for persistence
- JWT for session/authentication

The design favors simplicity and explainability over heavy abstraction. That makes the project suitable for academic review, demos, and future student contributions.

## Runtime Model

### Development

- `npm run dev` starts `server.ts` with `tsx`
- Express serves API routes
- Vite runs in middleware mode inside Express
- The browser accesses one server, which handles both SPA assets and API responses

### Production build

- `npm run build` creates the frontend bundle in `dist/`
- Express serves the static frontend files from `dist/`
- API routes remain handled by the same Express process

## Frontend Design

### Entry and page control

The frontend does not use React Router. Instead:

- `src/App.tsx` holds a `currentPage` state
- login state and user role determine which screen is shown
- navigation buttons update `currentPage`

This approach is lightweight and easy to explain, but less scalable than route-based navigation.

### Contexts

- `AuthContext`
  Stores token and user info for authenticated requests
- `LanguageContext`
  Stores language mode and translated labels

### Pages by role

- Public
  `Landing`, `Login`, `Register`
- Patient
  `PatientDashboard`, `GfrCalculator`, `VitalsLog`, `Education`, `CostPlanner`, `Profile`
- Doctor
  `DoctorDashboard`, `DoctorAlerts`, `PatientDetail`
- Admin
  `AdminDashboard`

## Backend Design

All backend behavior currently lives in `server.ts`. This includes:

- database creation
- seed data
- authentication middleware
- route handlers
- helper functions
- Vite middleware bootstrapping

This is acceptable for a prototype, but in a larger system these responsibilities should be split into modules such as:

- `routes/`
- `services/`
- `db/`
- `middleware/`

## Data Model

### `users`

Stores shared identity information:

- name
- email
- password hash
- role
- division
- district

### `patients`

Stores patient-specific health metadata:

- age
- sex
- weight
- diabetes
- hypertension
- family history
- CKD stage
- risk score
- assigned doctor

### `vitals_log`

Stores time-based monitoring records:

- blood pressure
- blood sugar
- creatinine
- urine protein
- weight
- edema
- fatigue
- medications

### `gfr_records`

Stores GFR calculations and recommendations over time.

### `alerts`

Stores doctor-facing alerts triggered from patient data.

### `articles`

Stores bilingual educational content.

## Authentication Flow

1. User logs in with email and password.
2. Backend verifies credentials with bcrypt.
3. Backend signs a JWT containing `id`, `role`, and `name`.
4. Frontend stores the token through `AuthContext`.
5. Protected requests send `Authorization: Bearer <token>`.
6. `authenticateToken` verifies the token and attaches the decoded user to `req.user`.

## Core Business Logic

### Risk score

The current risk score is a simplified weighted model. It considers:

- age
- sex
- diabetes
- hypertension
- family history
- non-metro district proxy

This is intentionally transparent and easy to explain. It is not meant to be treated as a clinically validated model in its current form.

### GFR calculation

The app computes:

- MDRD
- Cockcroft-Gault
- CKD-EPI

Then it averages the values, determines a CKD stage, and returns a recommendation.

### Alert generation

Alerts are currently generated from recent vitals, especially elevated blood pressure values. The logic is intentionally simple to keep the flow demonstrable.

## API Map

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Patient

- `GET /api/patient/profile`
- `PUT /api/patient/profile`
- `POST /api/patient/vitals`
- `GET /api/patient/vitals`
- `POST /api/patient/gfr`
- `GET /api/patient/gfr-history`
- `GET /api/patient/risk-score`

### Doctor

- `GET /api/doctor/patients`
- `GET /api/doctor/patient/:id`
- `GET /api/doctor/alerts`
- `POST /api/doctor/alerts/read`

### Admin

- `GET /api/admin/heatmap`
- `GET /api/admin/export-research-data`
- `GET /api/admin/reports`
- `GET /api/admin/export-national-report`

### Public content

- `GET /api/articles`

## Admin Reporting Design

The admin dashboard uses live aggregates rather than a separate reporting database.

### Heatmap

Heatmap data is built by grouping patients by district and averaging risk scores.

### Research export

The research export joins:

- user identity/location data
- patient profile data
- latest vitals
- latest GFR calculations

The result is exported as CSV to make it easy to analyze externally.

### Policy reports

Policy reports are generated dynamically from aggregate district data. They are exported as Markdown files so they can be read, printed, or attached to submissions.

## Seed Data Strategy

When the database is empty, the server seeds:

- one admin
- one doctor
- multiple demo patients across districts
- multiple educational articles

This allows the project to be demonstrated immediately after startup without manual data entry.

## Design Decisions You Can Explain To A Supervisor

### Why combine frontend and backend in one project?

It reduces setup complexity and makes the system easier to present, test, and maintain for a student or prototype environment.

### Why use one `server.ts` file?

For a prototype, it keeps the architecture visible in one place. A reviewer can inspect the whole backend flow quickly. The tradeoff is reduced modularity, which should be improved in future iterations.

### Why generate admin reports on demand?

It guarantees the exported reports reflect the latest patient data without introducing another storage layer or scheduled reporting job.

### Why use a role-based system?

CKD monitoring is inherently multi-stakeholder. A useful system must support patients, clinicians, and administrators with separate views and actions.

### What is the strongest technical limitation right now?

The codebase is intentionally compact, so backend logic is centralized and validation/testing are still limited. That is the main area for future engineering improvement.

## Recommended Refactoring Path

If a future contributor expands the project, this is the most sensible order:

1. Extract API routes from `server.ts`
2. Add request validation
3. Move calculations into services
4. Add test coverage
5. Introduce real client-side routing
6. Normalize encoding and localization handling
7. Add environment-specific configuration for deployment

## Contribution Guidelines

When adding a feature:

1. Decide which role owns the feature.
2. Add or update the API route if data is involved.
3. Keep UI and backend behavior consistent.
4. Update `README.md` if the feature changes setup or workflow.
5. Update this file if the feature changes architecture or data flow.
