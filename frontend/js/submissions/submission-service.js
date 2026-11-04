/* ==========================================================================
   CampusSprint Project Submission Service (Frontend-Only)
   Manages draft creation, editing, multi-field validation, simulated
   submission finalization, and status retrieval.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config           = global.CampusSprint.Config;
    const Storage          = global.CampusSprint.Storage;
    const Teams            = global.CampusSprint.Teams;
    const ProblemSelection = global.CampusSprint.ProblemSelection;
    const Registration     = global.CampusSprint.Registration;
    const Auth             = global.CampusSprint.Auth;

    // Helper: validate HTTPS URL
    function isValidHttpsUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim();
        // Requires valid https:// prefix and domain
        const re = /^https:\/\/[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
        return re.test(trimmed);
    }

    // Helper: validate optional Web URL (HTTP or HTTPS)
    function isValidWebUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim();
        const re = /^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
        return re.test(trimmed);
    }

    // Load stored submissions map
    function getStoredSubmissions() {
        const raw = Storage.get(Config.STORAGE_KEYS.PROJECT_SUBMISSIONS, null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
                console.warn('[CampusSprint Submissions] Failed to parse submissions, reseeding', e);
            }
        }

        // Seed from Data.submissions if available
        const seedMap = {};
        if (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.submissions)) {
            global.CampusSprint.Data.submissions.forEach(sub => {
                const key = sub.teamId ? ('team_' + sub.teamId) : ('user_' + sub.participantId);
                seedMap[key] = {
                    id: sub.id,
                    teamId: sub.teamId || null,
                    participantId: sub.participantId || null,
                    problemStatementId: sub.problemStatementId,
                    projectTitle: sub.projectTitle || '',
                    shortDescription: sub.shortDescription || '',
                    detailedDescription: sub.detailedDescription || 'Full project architecture and implementation documentation created during Campus Sprint 2026.',
                    repositoryUrl: sub.repositoryUrl || '',
                    demoUrl: sub.demoUrl || '',
                    presentationUrl: sub.presentationUrl || '',
                    techStack: sub.techStack || ['React', 'Node.js', 'PostgreSQL'],
                    status: (sub.status || 'draft').toUpperCase(),
                    createdAt: sub.lastUpdated || new Date().toISOString(),
                    updatedAt: sub.lastUpdated || new Date().toISOString(),
                    submittedAt: sub.status === 'submitted' ? (sub.lastUpdated || new Date().toISOString()) : null
                };
            });
        }

        saveSubmissions(seedMap);
        return seedMap;
    }

    function saveSubmissions(map) {
        Storage.set(Config.STORAGE_KEYS.PROJECT_SUBMISSIONS, JSON.stringify(map));
    }

    function resolveSubmissionKey(userId) {
        if (!userId) return null;
        const userTeamInfo = (global.CampusSprint.Teams && typeof global.CampusSprint.Teams.getUserTeam === 'function')
            ? global.CampusSprint.Teams.getUserTeam(userId)
            : null;

        if (userTeamInfo && userTeamInfo.team) {
            return { key: 'team_' + userTeamInfo.team.id, isTeam: true, teamId: userTeamInfo.team.id, isLeader: userTeamInfo.isLeader };
        }
        return { key: 'user_' + userId, isTeam: false, teamId: null, isLeader: true };
    }

    // --- Query Functions ---

    function getSubmission(userId) {
        if (!userId) return null;
        const res = resolveSubmissionKey(userId);
        if (!res) return null;

        const map = getStoredSubmissions();
        const sub = map[res.key] || null;
        if (!sub) return null;

        // Hydrate problem statement
        let ps = null;
        if (global.CampusSprint.ProblemSelection && typeof global.CampusSprint.ProblemSelection.getProblemStatementById === 'function') {
            ps = global.CampusSprint.ProblemSelection.getProblemStatementById(sub.problemStatementId);
        }

        return Object.assign({}, sub, {
            isTeam: res.isTeam,
            isLeader: res.isLeader,
            problemStatement: ps
        });
    }

    function getSubmissionById(submissionId) {
        if (!submissionId) return null;
        const map = getStoredSubmissions();
        for (const k in map) {
            if (map[k] && map[k].id === submissionId) {
                return map[k];
            }
        }
        return null;
    }

    function getSubmissionStatus(userId) {
        const sub = getSubmission(userId);
        if (!sub) return 'NOT_STARTED';
        return sub.status || 'DRAFT';
    }

    function canEditSubmission(userId) {
        if (!userId) return { canEdit: false, reason: 'You must be signed in to edit submissions.' };

        const res = resolveSubmissionKey(userId);
        if (!res) return { canEdit: false, reason: 'Unable to resolve participation context.' };

        if (res.isTeam && !res.isLeader) {
            return {
                canEdit: false,
                reason: 'Only the team leader has permission to edit or submit the project on behalf of the team.'
            };
        }

        const map = getStoredSubmissions();
        const sub = map[res.key];
        if (sub && sub.status === 'SUBMITTED') {
            const subConfig = Config.SUBMISSION_CONFIG;
            const allowResubmit = subConfig && subConfig.allowResubmission === true;
            if (!allowResubmit) {
                return {
                    canEdit: false,
                    reason: 'This project has already been submitted and is locked for judging review.'
                };
            }
        }

        return { canEdit: true };
    }

    // --- Validation ---

    function validateSubmission(data) {
        const errors = {};
        const subConfig = Config.SUBMISSION_CONFIG || {};

        // 1. Problem Statement
        if (!data || !data.problemStatementId) {
            errors.problemStatementId = 'A valid problem statement must be selected before submitting.';
        }

        // 2. Project Title
        const title = (data && data.projectTitle) ? String(data.projectTitle).trim() : '';
        if (subConfig.requireProjectTitle !== false) {
            if (!title) {
                errors.projectTitle = 'Project title is required.';
            } else if (title.length < 3) {
                errors.projectTitle = 'Project title must be at least 3 characters long.';
            } else if (title.length > 100) {
                errors.projectTitle = 'Project title cannot exceed 100 characters.';
            }
        }

        // 3. Short Description
        const shortDesc = (data && data.shortDescription) ? String(data.shortDescription).trim() : '';
        if (!shortDesc) {
            errors.shortDescription = 'A short description/tagline is required.';
        } else if (shortDesc.length < 10) {
            errors.shortDescription = 'Short description must be at least 10 characters long.';
        } else if (shortDesc.length > 250) {
            errors.shortDescription = 'Short description cannot exceed 250 characters.';
        }

        // 4. Detailed Description
        const detailDesc = (data && data.detailedDescription) ? String(data.detailedDescription).trim() : '';
        if (subConfig.requireProjectDescription !== false) {
            if (!detailDesc) {
                errors.detailedDescription = 'A detailed project overview and architecture description is required.';
            } else if (detailDesc.length < 30) {
                errors.detailedDescription = 'Detailed description must be at least 30 characters long.';
            }
        }

        // 5. Repository URL
        const repo = (data && data.repositoryUrl) ? String(data.repositoryUrl).trim() : '';
        if (subConfig.requireRepositoryUrl !== false) {
            if (!repo) {
                errors.repositoryUrl = 'GitHub or public repository URL is required.';
            } else if (!isValidHttpsUrl(repo)) {
                errors.repositoryUrl = 'Repository URL must be a valid secure link starting with https:// (e.g. https://github.com/your-team/project).';
            }
        }

        // 6. Demo URL (Optional unless configured)
        const demo = (data && data.demoUrl) ? String(data.demoUrl).trim() : '';
        if (demo && !isValidWebUrl(demo)) {
            errors.demoUrl = 'Demo URL must be a valid link starting with https:// or http://.';
        } else if (!demo && subConfig.requireDemoUrl === true) {
            errors.demoUrl = 'Working demo URL is required.';
        }

        // 7. Presentation / Video URL
        const pres = (data && data.presentationUrl) ? String(data.presentationUrl).trim() : '';
        if (pres && !isValidWebUrl(pres)) {
            errors.presentationUrl = 'Video demo/presentation URL must be a valid link starting with https:// or http://.';
        } else if (!pres && subConfig.requirePresentationUrl === true) {
            errors.presentationUrl = 'Video presentation URL is required.';
        }

        // 8. Tech Stack
        const stack = (data && Array.isArray(data.techStack)) ? data.techStack : [];
        if (subConfig.requireTechStack !== false && stack.length === 0) {
            errors.techStack = 'Please declare at least one technology or framework in your tech stack.';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    // --- Mutations ---

    function createOrUpdateDraft(userId, formData) {
        if (!userId) return { success: false, error: 'User ID is required.' };

        const perm = canEditSubmission(userId);
        if (!perm.canEdit) {
            return { success: false, error: perm.reason };
        }

        const res = resolveSubmissionKey(userId);
        const map = getStoredSubmissions();

        let sub = map[res.key];

        // Resolve active problem statement if not in formData
        let psId = (formData && formData.problemStatementId) || (sub && sub.problemStatementId) || null;
        if (!psId && global.CampusSprint.ProblemSelection && typeof global.CampusSprint.ProblemSelection.getSelection === 'function') {
            const currentSel = global.CampusSprint.ProblemSelection.getSelection(userId);
            if (currentSel) psId = currentSel.problemStatementId;
        }

        const now = new Date().toISOString();

        if (!sub) {
            sub = {
                id: 'sub-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
                teamId: res.teamId,
                participantId: res.isTeam ? null : userId,
                problemStatementId: psId || '',
                projectTitle: '',
                shortDescription: '',
                detailedDescription: '',
                repositoryUrl: '',
                demoUrl: '',
                presentationUrl: '',
                techStack: [],
                status: 'DRAFT',
                createdAt: now,
                updatedAt: now,
                submittedAt: null
            };
        }

        // Apply fields from formData if supplied
        if (formData) {
            if (formData.projectTitle !== undefined) sub.projectTitle = String(formData.projectTitle).trim();
            if (formData.shortDescription !== undefined) sub.shortDescription = String(formData.shortDescription).trim();
            if (formData.detailedDescription !== undefined) sub.detailedDescription = String(formData.detailedDescription).trim();
            if (formData.repositoryUrl !== undefined) sub.repositoryUrl = String(formData.repositoryUrl).trim();
            if (formData.demoUrl !== undefined) sub.demoUrl = String(formData.demoUrl).trim();
            if (formData.presentationUrl !== undefined) sub.presentationUrl = String(formData.presentationUrl).trim();
            if (Array.isArray(formData.techStack)) sub.techStack = formData.techStack.map(s => String(s).trim()).filter(Boolean);
            if (formData.problemStatementId) sub.problemStatementId = formData.problemStatementId;
        }

        sub.updatedAt = now;
        map[res.key] = sub;
        saveSubmissions(map);

        return {
            success: true,
            submission: getSubmission(userId)
        };
    }

    function submitProject(userId, formData) {
        if (!userId) return { success: false, error: 'User ID is required.' };

        const perm = canEditSubmission(userId);
        if (!perm.canEdit) {
            return { success: false, error: perm.reason };
        }

        // First update/persist current inputs
        createOrUpdateDraft(userId, formData);

        const sub = getSubmission(userId);
        if (!sub) {
            return { success: false, error: 'Unable to locate submission record.' };
        }

        // Full validation check
        const val = validateSubmission(sub);
        if (!val.isValid) {
            return {
                success: false,
                error: 'Please fix all highlighted errors before submitting your project.',
                errors: val.errors
            };
        }

        const res = resolveSubmissionKey(userId);
        const map = getStoredSubmissions();
        const stored = map[res.key];

        const now = new Date().toISOString();
        stored.status = 'SUBMITTED';
        stored.submittedAt = now;
        stored.updatedAt = now;

        map[res.key] = stored;
        saveSubmissions(map);

        return {
            success: true,
            submission: getSubmission(userId)
        };
    }

    function resetSubmissions() {
        Storage.remove(Config.STORAGE_KEYS.PROJECT_SUBMISSIONS);
        return getStoredSubmissions();
    }

    // Expose Public API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Submissions = {
        getSubmissions: getStoredSubmissions,
        getSubmission,
        getSubmissionById,
        getSubmissionStatus,
        canEditSubmission,
        validateSubmission,
        createOrUpdateDraft,
        submitProject,
        resetSubmissions
    };

})(window);

