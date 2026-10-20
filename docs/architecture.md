# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route-level views and capability components in React; load and submit data through the shared API client only. Each view exposes accessible loading, empty, and error states without embedding persistence or business rules.
- Logic tier decision: Keep Express routes as thin HTTP handlers and put validation, calculations, and queries in `octofitService.ts`. Return deliberate 4xx responses for invalid or unknown resources, never database cast errors as 500 responses.
- Data tier decision: Define required fields, references, and safe defaults in the Mongoose models. Keep seed operations idempotent and update only the known sample records so unrelated user data is preserved.
- Activity tracking approach: Validate positive minutes, activity type, and well-formed IDs; confirm the referenced user and team exist before writing. Award one point per minute and store the user, team, type, minutes, points, and occurrence time.
- Team management approach: Require a non-empty name, preserve the submitted name and mascot, and store only valid member references without duplicates. Listing teams returns their member IDs.
- Leaderboard approach: Sum activity points per team, include teams with no activity at zero points, sort by total points descending, and assign 1-based ranks.
- Workout suggestions approach: Find the user by email or return 404. Prefer workouts matching the user's goal, then recent activity; include a concise reason tied to the matching goal or activity.

## Test plan

Run the data tests first, then the API and frontend contracts, and finish with both builds. A failure in an earlier tier should be fixed there before interpreting failures in dependent tiers. Re-run affected downstream checks after changing a shared contract.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. Failures indicate missing or incorrect model validation, defaults, references, or seed idempotency/data preservation.
- API command: `npm run test:api --prefix octofit-tracker/backend`. Failures indicate incorrect HTTP status or response shape, request/reference validation, activity calculations, leaderboard aggregation/ranking, or workout matching/reasons.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. Failures indicate incorrect API-client usage, rendering of returned data, requested user email, or inaccessible/missing loading, empty, and error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend`. Failures indicate TypeScript errors in backend models, services, routes, or server configuration.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. Failures indicate frontend TypeScript or Vite production-build errors.
