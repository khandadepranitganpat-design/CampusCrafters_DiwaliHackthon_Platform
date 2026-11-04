# CAMPUSCRAFTERS HACKATHON PLATFORM — FRONTEND INTEGRATION GUIDE
## Migration Reference for Frontend Developer (Ayush Jain)

**Document Version:** 1.0.0 (Phase 2 Architecture)  
**Date:** November 4, 2026  
**Audience:** Ayush Jain (Frontend Lead)  
**Target Backend API:** `https://api.campuscrafters.com/api/v1` (Production) / `http://localhost:5000/api/v1` (Development)

---

## 1. Overview & Key Transition Principles

The Flask backend is built as an independent service running on a separate host/port from the vanilla JavaScript frontend.

### Primary Transition Rules:
1. **Base URL Configuration:**
   Configure a single dynamic base URL in `frontend/js/config.js` or equivalent:
   ```javascript
   const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? 'http://localhost:5000/api/v1'
       : 'https://api.campuscrafters.com/api/v1';
   ```
2. **Universal Response Envelope:**
   Every API response is wrapped in a standard JSON envelope:
   ```javascript
   // Success response
   {
     "success": true,
     "data": { ... },
     "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
   }

   // Error response
   {
     "success": false,
     "error": { "code": "VALIDATION_ERROR", "message": "...", "field": null, "details": {} },
     "meta": { "timestamp": "2026-11-04T12:00:00Z", "version": "v1" }
   }
   ```
   In your client fetch wrapper, unwrap `response.data` or handle `response.error`.
3. **Authentication via Bearer Token:**
   Upon login or signup, store the `access_token` in `localStorage` or memory, and include it in the `Authorization` header on protected requests:
   ```javascript
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${token}`
   }
   ```
4. **All Timestamps are UTC ISO 8601 ending in `Z`:**
   e.g. `2026-11-04T12:00:00Z`. Convert to local browser time using `new Date(utcString).toLocaleString()`.

---

## 2. API Method Mapping Reference

| Frontend Operation | Client Module | Canonical API Route | HTTP Method |
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

---

## 3. Important Field Enforcements

1. **Team Join Codes:**
   - Both seed format (`CC-4F7K`) and newly generated format (`CS-XXXX`) are accepted case-insensitively.
2. **Draft Auto-Saving:**
   - The backend accepts partial draft payloads at `/api/v1/teams/{id}/submission/draft` without blocking on missing fields or unselected problem statements.
3. **Final Project Submission:**
   - Repository URL must strictly begin with `https://`.
   - Team member count must meet `MIN_TEAM_SIZE` (default 2).
   - An active problem statement must be selected.
   - If submission deadline has elapsed, the endpoint returns HTTP 423 `DEADLINE_EXPIRED`.

