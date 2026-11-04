# CAMPUSCRAFTERS HACKATHON PLATFORM — CANONICAL REST API CONTRACT
## Production-Oriented RESTful Interface Specification

**Document Version:** 1.3.0 (Phase 1.5 Contract Revision)  
**Status:** Canonical, Reconciled & Binding  
**Date:** November 4, 2026  
**Target Repository:** `CampusCrafters_DiwaliHackthon_Platform`  
**API Prefix:** `/api/v1`  
**Authors:** Mangesh Mahajan & Vaibhav Patil Dhumal (Backend & API Engineering)  

---

## 1. Overview & Architectural Standards

This document establishes the **single canonical REST API contract** for the CampusCrafters Hackathon Platform. It reconciles all frontend expectations from `window.CampusSprint` with production-grade HTTP standards.

### Universal Constraints
1. **Base Path:** All API endpoints are prefixed with `/api/v1`.
2. **Data Format:** All requests with payloads must specify `Content-Type: application/json`. All responses are formatted as JSON.
3. **CORS:** The backend allows configurable frontend origins via `CORS_ALLOWED_ORIGINS` environment variable, supporting preflight `OPTIONS` requests, credentials, and `Authorization` headers.
4. **Time & Dates:** Every timestamp sent to or received from the API must be an **ISO 8601 UTC string ending strictly in `Z`** (e.g. `2026-11-04T12:00:00Z`).
5. **No Conflicting Endpoints:** Each operation has exactly one canonical URL and HTTP method. Deprecated or competing routes are eliminated.
6. **Configurable Team Capacity:** Team limits default to `MIN_TEAM_SIZE=2` and `MAX_TEAM_SIZE=5`, remaining runtime-configurable via environment variables until project leadership formally confirms the upper bound.
7. **Team Size Enforcement Lifecycle:** `MIN_TEAM_SIZE` (default 2) is **not** enforced during initial team creation (which starts with the creator alone), but is strictly enforced as an eligibility requirement at final submission (`POST /api/v1/teams/{id}/submission/submit`).

---

## 2. Standardized Response & Error Envelopes

Every single endpoint response adheres strictly to the universal envelopes without exception.

### A. Success Envelope
Every successful response returns HTTP 200 (OK) or HTTP 201 (Created) wrapped in a standard envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-04T12:00:00Z",
    "version": "v1"
  }
}
```

### B. Error Envelope
Every error response returns standard HTTP error status codes wrapped in a structured error envelope:

```json
{
  "success": false,
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable explanation.",
    "field": null,
    "details": {}
  },
  "meta": {
    "timestamp": "2026-11-04T12:00:00Z",
    "version": "v1"
  }
}
```

### C. Standard Error Code Dictionary
| HTTP Status | Error Code | Description / Scenario |
| :---: | :--- | :--- |
| **400** | `INVALID_PAYLOAD` | Malformed JSON or unparseable request body. |
| **400** | `VALIDATION_ERROR` | Field validation failed (length, regex, required missing). |
| **400** | `MIN_TEAM_SIZE_NOT_MET` | Team has fewer than `MIN_TEAM_SIZE` members at final submission. |
| **400** | `PROBLEM_STATEMENT_REQUIRED`| Final submission attempted without an active selected problem statement. |
| **400** | `LEADER_CANNOT_LEAVE` | Team leader attempted to leave a multi-member team without transferring leadership. |
| **400** | `INVALID_STATE` | OAuth2 state parameter mismatch in SSO callback. |
| **401** | `UNAUTHORIZED` | Missing, expired, revoked, or malformed Bearer token. |
| **403** | `FORBIDDEN` | Valid token, but caller lacks necessary role or team leader permissions. |
| **403** | `REGISTRATION_REQUIRED` | Operation requires a registered participant, but user is unregistered. |
| **403** | `EVENT_STATE_LOCKED` | Action not permitted in current event state (e.g., registering during `event_live`). |
| **404** | `RESOURCE_NOT_FOUND` | User, team, problem statement, or submission not found. |
| **409** | `USER_ALREADY_REGISTERED` | User email or ID already registered for the hackathon. |
| **409** | `USER_ALREADY_IN_TEAM` | User attempted to create or join a team while already in an active team. |
| **409** | `TEAM_CAPACITY_EXCEEDED` | Attempted to join a team that has reached `MAX_TEAM_SIZE`. |
| **409** | `JOIN_CODE_INVALID` | Join code does not match any active team. |
| **423** | `SUBMISSION_LOCKED` | Project submission or problem selection is permanently locked post-submission. |
| **423** | `DEADLINE_EXPIRED` | Server submission deadline has passed. |
| **423** | `EVALUATION_LOCKED` | Judging window has closed; scores cannot be modified. |
| **500** | `INTERNAL_SERVER_ERROR` | Unhandled server error. |

---

## 3. Authentication, Identity & Token Revocation Architecture

### A. Development vs Production Authentication
- **Production Architecture (Campus Crafter SSO):** Users authenticate via Campus Crafter SSO (OAuth2 / OIDC). There are **no password tables or password hashing in production**. The backend exchanges the SSO authorization code or validates signed OIDC JWTs, provisions the local user, and issues a platform API access token.
- **Development Architecture (Mock Auth):** For local offline development and automated testing, mock authentication routes (`/api/v1/auth/dev/*`) mirror the frontend mock accounts (`p-001`, `p-002`, `u-demo-unreg`).
- **Production Guard:** In production mode (`FLASK_ENV=production`), all `/api/v1/auth/dev/*` routes are disabled and return HTTP 404.

### B. Production SSO Security Architecture & Unresolved Specifications
The production SSO integration follows OAuth 2.0 with PKCE and OpenID Connect:
1. **CSRF Mitigation via `state`:** The client initiates the SSO flow by generating a cryptographically random `state` string stored in an encrypted, HttpOnly, SameSite=Lax cookie. The callback endpoint verifies the returned `state`. Mismatches return HTTP 400 `INVALID_STATE`.
2. **Replay Protection via `nonce`:** An unguessable `nonce` is included in the OIDC authorization request and validated against the `nonce` claim in the received ID token.
3. **Backend Code Exchange:** The authorization code is exchanged directly by the Flask server over TLS HTTPS with the SSO provider's token endpoint. Client secrets are never transmitted to the browser.
4. **JWT Verification Configuration:**
   - Signatures verified against the provider's JWKS public keys fetched from `/.well-known/jwks.json` and cached with TTL.
   - Strict claim verification: `iss` (Issuer URL), `aud` (Client ID), `exp` (Future UTC timestamp with <=60s clock skew tolerance), and `nbf`.
5. **Explicitly Unresolved Provider Details:** The exact SSO Provider Issuer URL, Client ID, Client Secret, JWKS URL, and user claims mappings remain **unresolved pending project-lead provisioning**.

### C. Server-Side Token Revocation & Logout Strategy
- **Mechanism:** JWTs carry a unique identifier claim (`jti`) and expiration claim (`exp`).
- **Logout Action:** When `POST /api/v1/auth/logout` is called:
  1. The server extracts the `jti` and `exp` from the active Bearer token.
  2. The server records `jti`, `user_id`, and `expires_at` into the persistence layer (`revoked_tokens` table / Redis cache).
- **Enforcement:** The `@require_auth` middleware checks incoming tokens against the revocation repository. Revoked tokens immediately return HTTP 401 `UNAUTHORIZED`.
- **Garbage Collection:** Expired revoked tokens (`expires_at < NOW()`) are purged periodically to maintain minimal table size.

---

## 4. Complete Canonical Endpoints Specification

### A. Health & System State

#### 1. System Health Check
- **Endpoint:** `GET /api/v1/health`
- **Auth:** None (Public)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "environment": "development",
      "timestamp": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Global Event State & Configuration
- **Endpoint:** `GET /api/v1/config/state`
- **Auth:** None (Public)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "event_state": "reg_open",
      "label": "Registration Open",
      "description": "Registration is open. Secure your spot now.",
      "cta_label": "Register with CampusCrafters",
      "cta_enabled": true,
      "config": {
        "min_team_size": 2,
        "max_team_size": 5,
        "allow_solo": false,
        "allow_problem_change": true,
        "submission_deadline_utc": null
      }
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### B. Authentication & Session

#### 1. Development Login (Local Dev Only)
- **Endpoint:** `POST /api/v1/auth/dev/login`
- **Auth:** None (Public; Disabled in Production)
- **Request Body:**
  ```json
  {
    "email": "arjun.m@student.example.edu",
    "password": "Hackathon2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1Ni...",
      "token_type": "Bearer",
      "expires_in": 86400,
      "user": {
        "id": "p-001",
        "display_name": "Arjun Mehta",
        "email": "arjun.m@student.example.edu",
        "college": "Apex Institute of Technology",
        "visitor_state": "registered",
        "is_registered": true
      }
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Development Signup (Local Dev Only)
- **Endpoint:** `POST /api/v1/auth/dev/signup`
- **Auth:** None (Public; Disabled in Production)
- **Request Body:**
  ```json
  {
    "full_name": "Rohan Verma",
    "email": "rohan.v@student.example.edu",
    "college": "Apex Institute of Technology",
    "course": "B.Tech Computer Science",
    "year": "3rd Year",
    "phone": "+91 98765 43210",
    "password": "Hackathon2026!",
    "confirm_password": "Hackathon2026!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1Ni...",
      "token_type": "Bearer",
      "expires_in": 86400,
      "user": {
        "id": "u-rv01",
        "display_name": "Rohan Verma",
        "email": "rohan.v@student.example.edu",
        "college": "Apex Institute of Technology",
        "visitor_state": "logged_in_unregistered",
        "is_registered": false
      }
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2b. Begin Production SSO (`GET /api/v1/auth/sso/login`)
- **Auth:** None (Public). Returns `503 SSO_NOT_CONFIGURED` until `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET` and `SSO_DISCOVERY_URL` are set.
- **Response (200 OK):** `{ "authorization_url": "https://<provider>/authorize?...&state=...&nonce=...&code_challenge=...", "state": "..." }`
- **Side effect:** sets the signed, HttpOnly `cc_sso_flow` cookie (path `/api/v1/auth`, 10-minute lifetime) that binds `state`, `nonce` and the PKCE verifier to this browser. The frontend must call this endpoint with `credentials: "include"`, redirect the browser to `authorization_url`, then POST the returned `code`/`state` to the callback below, also with `credentials: "include"`.

#### 3. Production SSO Callback
- **Endpoint:** `POST /api/v1/auth/sso/callback`
- **Auth:** None (Public)
- **Request Body:**
  ```json
  {
    "code": "auth_code_from_campus_crafter_sso",
    "state": "crypto_random_state_string",
    "redirect_uri": "https://campuscrafters.com/auth/callback"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJSUzI1Ni...",
      "token_type": "Bearer",
      "expires_in": 86400,
      "user": {
        "id": "u-sso-01",
        "display_name": "Priya Sharma",
        "email": "priya.s@student.example.edu",
        "college": "Apex Institute of Technology",
        "visitor_state": "registered",
        "is_registered": true
      }
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 4. Get Current User Context
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "p-001",
      "display_name": "Arjun Mehta",
      "email": "arjun.m@student.example.edu",
      "college": "Apex Institute of Technology",
      "visitor_state": "registered",
      "is_registered": true,
      "team_id": "team-001",
      "is_team_leader": true,
      "roles": ["participant"]
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 5. User Logout (Server-Side Revocation)
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Session revoked successfully."
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 6. Forgot Password (Development Simulation)
- **Endpoint:** `POST /api/v1/auth/forgot-password`
- **Auth:** None (Public)
- **Request Body:** `{"email": "user@example.edu"}`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "If an account exists with this email, reset instructions have been dispatched."
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### C. Registrations & Waitlist

#### 1. Submit Registration Record
- **Endpoint:** `POST /api/v1/registrations`
- **Auth:** Bearer Token Required (`logged_in_unregistered` state)
- **Gate:** Accepted only during `reg_open` or `almost_full`.
- **Request Body:**
  ```json
  {
    "full_name": "Arjun Mehta",
    "email": "arjun.m@student.example.edu",
    "college": "Apex Institute of Technology",
    "course": "B.Tech Computer Science",
    "year": "3rd Year",
    "phone": "+91 98765 43210",
    "skills": ["React", "Node.js", "PostgreSQL"],
    "interests": ["FinTech", "Distributed Systems"],
    "bio": "Passionate developer and builder.",
    "experience": "intermediate",
    "track_id": "fintech",
    "rules_accepted": true
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "REG-2026-9K2LM",
      "user_id": "p-001",
      "ticket_code": "CS26-4F7K-9M2A",
      "status": "confirmed",
      "registered_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Get User Registration & Ticket Pass
- **Endpoint:** `GET /api/v1/registrations/me`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "REG-2026-9K2LM",
      "user_id": "p-001",
      "ticket_code": "CS26-4F7K-9M2A",
      "track_id": "fintech",
      "experience": "intermediate",
      "status": "confirmed",
      "registered_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Submit Waitlist Entry (When Event is FULL)
- **Endpoint:** `POST /api/v1/registrations/waitlist`
- **Auth:** None (Public) / Optional Bearer Token
- **Gate:** Available during `full` event state.
- **Request Body:**
  ```json
  {
    "full_name": "Siddharth Rao",
    "email": "sid.r@student.example.edu",
    "college": "National Engineering College",
    "track_interest": "fintech"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "WL-9K2LM",
      "full_name": "Siddharth Rao",
      "email": "sid.r@student.example.edu",
      "status": "waitlisted",
      "submitted_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### D. User Profile

#### 1. Get Profile Details
- **Endpoint:** `GET /api/v1/profile/me`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "p-001",
      "display_name": "Arjun Mehta",
      "email": "arjun.m@student.example.edu",
      "college": "Apex Institute of Technology",
      "course": "B.Tech Computer Science",
      "year": "3rd Year",
      "bio": "Passionate developer and builder ready for the 24-hour sprint.",
      "skills": ["React", "Node.js", "PostgreSQL"],
      "track_id": "fintech",
      "track_title": "FinTech",
      "registration_id": "REG-2026-9K2LM",
      "ticket_code": "CS26-4F7K-9M2A",
      "avatar_initials": "AM",
      "avatar_color": "#2B50FF"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Update Profile Details
- **Endpoint:** `PUT /api/v1/profile/me`
- **Auth:** Bearer Token Required
- **Request Body:**
  ```json
  {
    "display_name": "Arjun Mehta",
    "bio": "Updated bio focusing on fintech tooling.",
    "college": "Apex Institute of Technology",
    "course": "B.Tech Computer Science",
    "year": "3rd Year",
    "skills": ["React", "Flask", "PostgreSQL", "Docker"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "p-001",
      "display_name": "Arjun Mehta",
      "bio": "Updated bio focusing on fintech tooling.",
      "college": "Apex Institute of Technology",
      "course": "B.Tech Computer Science",
      "year": "3rd Year",
      "skills": ["React", "Flask", "PostgreSQL", "Docker"]
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### E. Tracks & Problem Statements

#### 1. List All Tracks
- **Endpoint:** `GET /api/v1/tracks`
- **Auth:** None (Public)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "fintech",
        "name": "FinTech",
        "short_description": "Reimagine how money moves.",
        "detailed_description": "Build tools that make financial services smarter...",
        "accent_color": "#2B50FF",
        "tags": ["Payments", "Budgeting", "Lending"]
      }
    ],
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. List Problem Statements
- **Endpoint:** `GET /api/v1/problem-statements`
- **Auth:** None (Public)
- **Query Params:** `?track=fintech&difficulty=Intermediate&search=UPI`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ps-ft-01",
        "track_id": "fintech",
        "title": "Campus UPI Split — Simplify Group Expense Sharing",
        "difficulty": "Intermediate",
        "domain": "Payments & Consumer Finance",
        "tags": ["UPI", "Expense Sharing", "Students"]
      }
    ],
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Get Problem Statement Details
- **Endpoint:** `GET /api/v1/problem-statements/{id}`
- **Auth:** None (Public)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ps-ft-01",
      "track_id": "fintech",
      "title": "Campus UPI Split — Simplify Group Expense Sharing",
      "description": "College students regularly split costs...",
      "difficulty": "Intermediate",
      "domain": "Payments & Consumer Finance",
      "tags": ["UPI", "Expense Sharing", "Mobile"],
      "evaluation_criteria": ["Accuracy of split calculations", "Ease of use"],
      "expected_deliverables": ["Working web demo", "GitHub repository"]
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### F. Team Management

#### 1. List Teams (Directory Query)
- **Endpoint:** `GET /api/v1/teams`
- **Auth:** Optional Bearer Token / Public
- **Query Params:** `?track_id=fintech&status=active`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "team-001",
        "name": "CodeCatalysts",
        "track_id": "fintech",
        "track_name": "FinTech",
        "leader_id": "p-001",
        "member_count": 3,
        "max_members": 5,
        "is_full": false,
        "status": "active",
        "created_at": "2026-10-21T06:00:00Z"
      }
    ],
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Create New Team
- **Endpoint:** `POST /api/v1/teams`
- **Auth:** Bearer Token Required (`registered`)
- **Rules:** User cannot already belong to an active team. Team starts with creator as sole member.
- **Request Body:**
  ```json
  {
    "name": "CodeCatalysts",
    "track_id": "fintech"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "team-001",
      "name": "CodeCatalysts",
      "join_code": "CS-4K9M",
      "track_id": "fintech",
      "leader_id": "p-001",
      "member_ids": ["p-001"],
      "created_at": "2026-11-04T12:00:00Z",
      "status": "active"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Get Current User's Team
- **Endpoint:** `GET /api/v1/teams/me`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "team-001",
      "name": "CodeCatalysts",
      "join_code": "CC-4F7K",
      "track_id": "fintech",
      "track_name": "FinTech",
      "leader_id": "p-001",
      "is_leader": true,
      "member_ids": ["p-001", "p-002", "p-004"],
      "members": [
        {
          "id": "p-001",
          "display_name": "Arjun Mehta",
          "email": "arjun.m@student.example.edu",
          "college": "Apex Institute of Technology",
          "skills": ["React", "Node.js", "PostgreSQL"],
          "avatar_initials": "AM",
          "avatar_color": "#2B50FF",
          "is_leader": true
        }
      ],
      "max_members": 5,
      "is_full": false,
      "status": "active",
      "created_at": "2026-10-21T06:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 4. Join Team via Join Code
- **Endpoint:** `POST /api/v1/teams/join`
- **Auth:** Bearer Token Required (`registered`)
- **Rules:** Code is case-insensitive. Accepts existing seed formats (`CC-4F7K`) and newly generated formats (`CS-XXXX`). User must be unteamed. Team capacity must be `< MAX_TEAM_SIZE`.
- **Request Body:**
  ```json
  {
    "join_code": "CC-4F7K"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "team-001",
      "name": "CodeCatalysts",
      "member_ids": ["p-001", "p-002", "p-004", "p-005"],
      "status": "active"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 5. Leave Current Team
- **Endpoint:** `POST /api/v1/teams/leave`
- **Auth:** Bearer Token Required
- **Rules:**
  - Non-leaders leave immediately.
  - Leaders with teammates must transfer leadership or disband (returns HTTP 400 `LEADER_CANNOT_LEAVE`).
  - Sole member leaving disbands the team automatically.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Left team successfully."
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 6. Rename Team
- **Endpoint:** `PATCH /api/v1/teams/{id}/name`
- **Auth:** Bearer Token Required (Team Leader only)
- **Request Body:** `{"name": "CodeCatalysts Alpha"}`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "team-001",
      "name": "CodeCatalysts Alpha",
      "status": "active"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 7. Regenerate Join Code
- **Endpoint:** `POST /api/v1/teams/{id}/regenerate-code`
- **Auth:** Bearer Token Required (Team Leader only)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "join_code": "CS-8N2Q"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 8. Remove Team Member
- **Endpoint:** `DELETE /api/v1/teams/{id}/members/{user_id}`
- **Auth:** Bearer Token Required (Team Leader only)
- **Rules:** Leader cannot remove themselves. Target user must be a current member.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "team-001",
      "member_ids": ["p-001", "p-002"],
      "status": "active"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 9. Transfer Team Leadership
- **Endpoint:** `POST /api/v1/teams/{id}/transfer-leadership`
- **Auth:** Bearer Token Required (Current Team Leader only)
- **Request Body:**
  ```json
  {
    "new_leader_id": "p-002"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "team-001",
      "leader_id": "p-002",
      "status": "active"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 10. Disband Team
- **Endpoint:** `DELETE /api/v1/teams/{id}`
- **Auth:** Bearer Token Required (Team Leader only)
- **Rules:** Deletes team entity and releases all member associations.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Team disbanded successfully."
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### G. Problem Statement Selection

#### 1. Get Team's Selected Problem
- **Endpoint:** `GET /api/v1/teams/{id}/problem-statement`
- **Auth:** Bearer Token Required (Team Members or Admin)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "problem_statement_id": "ps-ft-01",
      "selected_by": "p-001",
      "selected_at": "2026-10-21T06:30:00Z",
      "is_locked": false,
      "problem_statement": {
        "id": "ps-ft-01",
        "title": "Campus UPI Split — Simplify Group Expense Sharing",
        "track_id": "fintech",
        "difficulty": "Intermediate"
      }
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Select or Change Problem Statement
- **Endpoint:** `PUT /api/v1/teams/{id}/problem-statement`
- **Auth:** Bearer Token Required (Team Leader only)
- **Rules:** Locked once project submission status is `SUBMITTED`. Automatically synchronizes any existing submission draft's `problem_statement_id`.
- **Request Body:**
  ```json
  {
    "problem_statement_id": "ps-ft-01"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "team_id": "team-001",
      "problem_statement_id": "ps-ft-01",
      "selected_by": "p-001",
      "selected_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Clear Problem Statement Selection
- **Endpoint:** `DELETE /api/v1/teams/{id}/problem-statement`
- **Auth:** Bearer Token Required (Team Leader only)
- **Rules:** Locked once project submission status is `SUBMITTED`. Automatically sets existing draft's `problem_statement_id` to `null`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Problem statement selection cleared."
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### H. Project Submissions & Draft Auto-Save

#### 1. Get Team Submission Record
- **Endpoint:** `GET /api/v1/teams/{id}/submission`
- **Auth:** Bearer Token Required (Team Members, Evaluators, or Admin)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "sub-001",
      "team_id": "team-001",
      "problem_statement_id": "ps-ft-01",
      "project_title": "SplitEasy — UPI Group Expense Tool",
      "short_description": "A web app that simplifies expense sharing with one-click UPI links.",
      "detailed_description": "Full architectural documentation...",
      "repository_url": "https://github.example.com/codecatalysts/spliteasy",
      "demo_url": "https://spliteasy.example.dev",
      "presentation_url": "",
      "tech_stack": ["React", "Node.js", "PostgreSQL"],
      "status": "DRAFT",
      "is_locked": false,
      "created_at": "2026-11-03T14:30:00Z",
      "updated_at": "2026-11-03T14:30:00Z",
      "submitted_at": null
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Auto-save Submission Draft
- **Endpoint:** `PUT /api/v1/teams/{id}/submission/draft`
- **Auth:** Bearer Token Required (Team Leader only)
- **Rules:**
  - Accepts partial payloads for 800ms client debouncing.
  - If no problem statement is currently selected in `problem_selections`, the draft is saved with `problem_statement_id: null` (returns HTTP 200). Draft saving is never blocked by incomplete fields.
  - If submission `status === SUBMITTED`, rejects with HTTP 423 `SUBMISSION_LOCKED`.
  - If `now_utc > deadline_utc`, rejects with HTTP 423 `DEADLINE_EXPIRED`.
- **Request Body:**
  ```json
  {
    "problem_statement_id": "ps-ft-01",
    "project_title": "SplitEasy — UPI Group Expense Tool",
    "short_description": "A web app that simplifies expense sharing.",
    "detailed_description": "Full architecture details...",
    "repository_url": "https://github.example.com/codecatalysts/spliteasy",
    "demo_url": "https://spliteasy.example.dev",
    "presentation_url": "",
    "tech_stack": ["React", "Node.js", "PostgreSQL"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "sub-001",
      "team_id": "team-001",
      "status": "DRAFT",
      "updated_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Final Project Submission
- **Endpoint:** `POST /api/v1/teams/{id}/submission/submit`
- **Auth:** Bearer Token Required (Team Leader only)
- **Rules:**
  - **Team Size Check:** Must have `>= MIN_TEAM_SIZE` members (returns HTTP 400 `MIN_TEAM_SIZE_NOT_MET` if violated).
  - **Problem Statement Check:** An active problem statement must be selected in `problem_selections` (returns HTTP 400 `PROBLEM_STATEMENT_REQUIRED` if missing).
  - **Completeness Validation:** Mandatory `project_title` (3–100 chars), `short_description` (10–250 chars), `detailed_description` (>=30 chars), `repository_url` (must be strictly HTTPS `https://...`), and `tech_stack` (>=1 item).
  - **Deadline Enforcement:** If `now_utc > deadline_utc`, rejects with HTTP 423 `DEADLINE_EXPIRED`.
  - Sets `status: "SUBMITTED"` and `submitted_at: now_utc`.
  - Permanently locks draft editing and problem statement selection.
- **Request Body:** Same schema as draft.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "sub-001",
      "team_id": "team-001",
      "status": "SUBMITTED",
      "is_locked": true,
      "submitted_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### I. Announcements

#### 1. List Announcements
- **Endpoint:** `GET /api/v1/announcements`
- **Auth:** Optional Bearer Token
- **Query Params:**
  - `category`: optional filter (`registration`, `community`, `event`, `submissions`, `beginner`)
  - `priority`: optional filter (`normal`, `high`, `urgent`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ann-001",
        "title": "Registration is now open!",
        "message": "Campus Sprint 2026 registration is officially open...",
        "category": "registration",
        "priority": "high",
        "timestamp": "2026-10-20T04:30:00Z",
        "is_read": false
      }
    ],
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Mark Announcement as Read
- **Endpoint:** `POST /api/v1/announcements/{id}/read`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ann-001",
      "is_read": true
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Mark Announcement as Unread
- **Endpoint:** `DELETE /api/v1/announcements/{id}/read`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ann-001",
      "is_read": false
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 4. Mark All Announcements as Read
- **Endpoint:** `POST /api/v1/announcements/read-all`
- **Auth:** Bearer Token Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "unread_count": 0
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### J. Evaluator & Scoring Endpoints (Phase 8 Operations)

#### 1. List Submissions for Evaluation
- **Endpoint:** `GET /api/v1/evaluator/submissions`
- **Auth:** Bearer Token Required (Role: `judge` or `admin`)
- **Query Params:** `?track_id=fintech`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "sub-001",
        "team_id": "team-001",
        "team_name": "CodeCatalysts",
        "track_id": "fintech",
        "project_title": "SplitEasy — UPI Group Expense Tool",
        "repository_url": "https://github.example.com/codecatalysts/spliteasy",
        "demo_url": "https://spliteasy.example.dev",
        "has_evaluated": false
      }
    ],
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Get Submission Evaluation Detail
- **Endpoint:** `GET /api/v1/evaluator/submissions/{id}`
- **Auth:** Bearer Token Required (Role: `judge` or `admin`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "submission": {
        "id": "sub-001",
        "team_id": "team-001",
        "project_title": "SplitEasy — UPI Group Expense Tool",
        "detailed_description": "Full architectural documentation...",
        "repository_url": "https://github.example.com/codecatalysts/spliteasy",
        "demo_url": "https://spliteasy.example.dev",
        "tech_stack": ["React", "Node.js", "PostgreSQL"]
      },
      "my_score": {
        "innovation_score": 28,
        "technical_score": 27,
        "uiux_score": 18,
        "impact_score": 19,
        "total_score": 92,
        "feedback": "Outstanding implementation.",
        "submitted_at": "2026-11-04T12:00:00Z"
      }
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Submit or Update Evaluation Score (Upsert)
- **Endpoint:** `POST /api/v1/evaluator/submissions/{id}/scores`
- **Auth:** Bearer Token Required (Role: `judge`)
- **Rules:**
  - Rubric ranges: `innovation_score` (0..30), `technical_score` (0..30), `uiux_score` (0..20), `impact_score` (0..20).
  - `total_score` is strictly computed by the server as `innovation + technical + uiux + impact` (sum out of 100).
  - Repeating this call updates the judge's score (upsert). Locked if `event_state != 'judging'`.
- **Request Body:**
  ```json
  {
    "innovation_score": 28,
    "technical_score": 27,
    "uiux_score": 18,
    "impact_score": 19,
    "feedback": "Outstanding UPI integration and clean architecture."
  }
  ```
- **Response (200 OK / 201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "submission_id": "sub-001",
      "judge_id": "u-judge-01",
      "innovation_score": 28,
      "technical_score": 27,
      "uiux_score": 18,
      "impact_score": 19,
      "total_score": 92,
      "feedback": "Outstanding UPI integration and clean architecture.",
      "submitted_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

### K. Administrative Endpoints (Admin Command Console)

#### 1. Override Event Lifecycle State
- **Endpoint:** `PATCH /api/v1/admin/event-state`
- **Auth:** Bearer Token Required (Role: `admin`)
- **Request Body:** `{"event_state": "event_live"}`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "event_state": "event_live",
      "updated_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 2. Broadcast Flash Announcement
- **Endpoint:** `POST /api/v1/admin/announcements`
- **Auth:** Bearer Token Required (Role: `admin`)
- **Request Body:**
  ```json
  {
    "title": "One Hour Remaining!",
    "message": "Submissions lock strictly at 10:00 AM UTC.",
    "category": "submissions",
    "priority": "urgent"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ann-flash-01",
      "title": "One Hour Remaining!",
      "message": "Submissions lock strictly at 10:00 AM UTC.",
      "category": "submissions",
      "priority": "urgent",
      "created_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 3. Set or Override Submission Deadline
- **Endpoint:** `PATCH /api/v1/admin/deadline`
- **Auth:** Bearer Token Required (Role: `admin`)
- **Request Body:**
  ```json
  {
    "submission_deadline_utc": "2026-11-15T18:30:00Z"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "submission_deadline_utc": "2026-11-15T18:30:00Z",
      "updated_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

#### 4. Toggle Problem Statement Unlock Status
- **Endpoint:** `PATCH /api/v1/admin/problem-statements/{id}/toggle`
- **Auth:** Bearer Token Required (Role: `admin`)
- **Request Body:** `{"is_active": true}`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "ps-ft-01",
      "is_active": true,
      "updated_at": "2026-11-04T12:00:00Z"
    },
    "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
  }
  ```

---

## 5. Client Integration Mapping Table

| Frontend Operation | Client Method (`CampusSprint`) | Canonical API Endpoint | Method |
| :--- | :--- | :--- | :---: |
| **System State** | `stateManager.getSnapshot()` | `/api/v1/config/state` | `GET` |
| **Dev Login** | `Auth.login(email, pass)` | `/api/v1/auth/dev/login` | `POST` |
| **Dev Signup** | `Auth.signup(data)` | `/api/v1/auth/dev/signup` | `POST` |
| **User Session** | `Auth.getCurrentUser()` | `/api/v1/auth/me` | `GET` |
| **User Logout** | `Auth.logout()` | `/api/v1/auth/logout` | `POST` |
| **Registration** | `Registration.submitRegistration(data)` | `/api/v1/registrations` | `POST` |
| **Waitlist** | `Registration.submitWaitlist(data)` | `/api/v1/registrations/waitlist` | `POST` |
| **My Profile** | `Dashboard.getUserProfile(id)` | `/api/v1/profile/me` | `GET` |
| **Update Profile** | `Dashboard.updateUserProfile(id, data)` | `/api/v1/profile/me` | `PUT` |
| **Browse Tracks** | `Data.tracks` | `/api/v1/tracks` | `GET` |
| **Browse Problems** | `ProblemSelection.getAvailableProblemStatements()` | `/api/v1/problem-statements` | `GET` |
| **Problem Detail** | `ProblemSelection.getProblemStatementById(id)` | `/api/v1/problem-statements/{id}` | `GET` |
| **List Teams** | `Teams.getTeams()` | `/api/v1/teams` | `GET` |
| **My Team** | `Teams.getUserTeam(userId)` | `/api/v1/teams/me` | `GET` |
| **Create Team** | `Teams.createTeam(userId, data)` | `/api/v1/teams` | `POST` |
| **Join Team** | `Teams.joinTeam(userId, code)` | `/api/v1/teams/join` | `POST` |
| **Leave Team** | `Teams.leaveTeam(userId)` | `/api/v1/teams/leave` | `POST` |
| **Rename Team** | `Teams.updateTeamName(leaderId, name)` | `/api/v1/teams/{id}/name` | `PATCH` |
| **Regen Code** | `Teams.regenerateJoinCode(leaderId)` | `/api/v1/teams/{id}/regenerate-code` | `POST` |
| **Remove Member** | `Teams.removeMember(leaderId, mId)` | `/api/v1/teams/{id}/members/{user_id}` | `DELETE` |
| **Transfer Lead** | `Teams.transferLeadership(curId, newId)`| `/api/v1/teams/{id}/transfer-leadership` | `POST` |
| **Disband Team** | `Teams.disbandTeam(leaderId)` | `/api/v1/teams/{id}` | `DELETE` |
| **Get Selection** | `ProblemSelection.getSelection(userId)` | `/api/v1/teams/{id}/problem-statement` | `GET` |
| **Select Problem**| `ProblemSelection.selectProblemStatement(...)` | `/api/v1/teams/{id}/problem-statement` | `PUT` |
| **Clear Problem** | `ProblemSelection.clearSelection(userId)` | `/api/v1/teams/{id}/problem-statement` | `DELETE` |
| **Get Submission**| `Submissions.getSubmission(userId)` | `/api/v1/teams/{id}/submission` | `GET` |
| **Auto-save Draft**| `Submissions.createOrUpdateDraft(...)` | `/api/v1/teams/{id}/submission/draft` | `PUT` |
| **Final Submit** | `Submissions.submitProject(...)` | `/api/v1/teams/{id}/submission/submit` | `POST` |
| **Announcements** | `Dashboard.getAnnouncements(filter)` | `/api/v1/announcements` | `GET` |
| **Mark Read** | `Dashboard.markAnnouncementAsRead(id)` | `/api/v1/announcements/{id}/read` | `POST` |
| **Mark Unread** | `Dashboard.markAnnouncementAsUnread(id)` | `/api/v1/announcements/{id}/read` | `DELETE` |
| **Mark All Read** | `Dashboard.markAllAnnouncementsRead()` | `/api/v1/announcements/read-all` | `POST` |
