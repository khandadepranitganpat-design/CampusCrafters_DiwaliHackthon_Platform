/* ==========================================================================
   CampusSprint Problem Statement Selection Service (Frontend-Only)
   Manages authenticated problem statement selection for participants and teams,
   enforces team leadership permissions, and syncs selection state to storage.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config       = global.CampusSprint.Config;
    const Storage      = global.CampusSprint.Storage;
    const Teams        = global.CampusSprint.Teams;
    const Registration = global.CampusSprint.Registration;
    const Auth         = global.CampusSprint.Auth;

    // Seed initial team selections matching mock data
    const SEED_TEAM_SELECTIONS = {
        'team-001': {
            problemStatementId: 'ps-ft-01',
            teamId: 'team-001',
            participantId: null,
            selectedBy: 'p-001',
            selectedAt: '2026-10-21T12:00:00+05:30'
        },
        'team-002': {
            problemStatementId: 'ps-w3-01',
            teamId: 'team-002',
            participantId: null,
            selectedBy: 'p-003',
            selectedAt: '2026-10-22T10:00:00+05:30'
        },
        'team-003': {
            problemStatementId: 'ps-sg-01',
            teamId: 'team-003',
            participantId: null,
            selectedBy: 'p-006',
            selectedAt: '2026-10-23T14:30:00+05:30'
        }
    };

    function getStore() {
        const raw = Storage.get(Config.STORAGE_KEYS.PROBLEM_SELECTIONS, null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    parsed.teams = parsed.teams || {};
                    parsed.participants = parsed.participants || {};
                    return parsed;
                }
            } catch (e) {
                console.warn('[CampusSprint ProblemSelection] Failed to parse selections store, resetting', e);
            }
        }

        const initial = {
            teams: Object.assign({}, SEED_TEAM_SELECTIONS),
            participants: {}
        };
        saveStore(initial);
        return initial;
    }

    function saveStore(store) {
        Storage.set(Config.STORAGE_KEYS.PROBLEM_SELECTIONS, JSON.stringify(store));
    }

    // --- Query Functions ---

    function getAvailableProblemStatements() {
        return (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.problemStatements))
            ? global.CampusSprint.Data.problemStatements
            : [];
    }

    function getProblemStatementById(id) {
        if (!id) return null;
        const all = getAvailableProblemStatements();
        return all.find(p => p.id === id) || null;
    }

    function getSelectionForTeam(teamId) {
        if (!teamId) return null;
        const store = getStore();
        const sel = store.teams[teamId];
        if (!sel) return null;

        const ps = getProblemStatementById(sel.problemStatementId);
        return Object.assign({}, sel, {
            problemStatement: ps
        });
    }

    function getSelection(userId) {
        if (!userId) return null;

        const store = getStore();
        const userTeamInfo = (global.CampusSprint.Teams && typeof global.CampusSprint.Teams.getUserTeam === 'function')
            ? global.CampusSprint.Teams.getUserTeam(userId)
            : null;

        let sel = null;
        let isTeam = false;
        let teamId = null;
        let isLeader = false;

        if (userTeamInfo && userTeamInfo.team) {
            isTeam = true;
            teamId = userTeamInfo.team.id;
            isLeader = userTeamInfo.isLeader;
            sel = store.teams[teamId] || null;
        } else {
            sel = store.participants[userId] || null;
            isLeader = true; // Solo participant has full control over their own selection
        }

        if (!sel) return null;

        const ps = getProblemStatementById(sel.problemStatementId);
        return Object.assign({}, sel, {
            isTeam,
            teamId,
            isLeader,
            canChange: isLeader && (!Config.SUBMISSION_CONFIG || Config.SUBMISSION_CONFIG.allowProblemStatementChange !== false),
            problemStatement: ps
        });
    }

    // --- Validation Helper ---

    function isParticipantRegistered(userId) {
        if (!userId) return false;
        if (Registration && typeof Registration.getRegistrationByUserId === 'function') {
            const reg = Registration.getRegistrationByUserId(userId);
            if (reg) return true;
        }
        // Fallback: Check email in currentUser
        const user = Auth ? Auth.getCurrentUser() : null;
        if (user && user.id === userId && Registration && typeof Registration.hasRegistrationForEmail === 'function') {
            if (user.email && Registration.hasRegistrationForEmail(user.email)) return true;
        }
        // Fallback: Check mock participants (p-001 through p-008 are registered by default in seed)
        if (userId.startsWith('p-')) return true;

        return false;
    }

    // --- Selection Operations ---

    function selectProblemStatement(userId, problemStatementId) {
        if (!userId) {
            return { success: false, error: 'User ID is required to select a problem statement.' };
        }

        // 1. Auth & Registration Check
        if (!isParticipantRegistered(userId)) {
            return {
                success: false,
                error: 'Registration is required before selecting a problem statement. Please complete event registration.'
            };
        }

        // 2. Validate Statement Existence
        const ps = getProblemStatementById(problemStatementId);
        if (!ps) {
            return {
                success: false,
                error: `Problem statement with ID "${problemStatementId}" was not found.`
            };
        }

        // 3. Team Status & Permissions Check
        const userTeamInfo = (global.CampusSprint.Teams && typeof global.CampusSprint.Teams.getUserTeam === 'function')
            ? global.CampusSprint.Teams.getUserTeam(userId)
            : null;

        const store = getStore();
        let record = null;

        if (userTeamInfo && userTeamInfo.team) {
            // Team Mode: only leader can make/change selection
            if (!userTeamInfo.isLeader) {
                return {
                    success: false,
                    error: 'Only the team leader has permission to select or change the team\'s problem statement.'
                };
            }

            const teamId = userTeamInfo.team.id;
            record = {
                problemStatementId: problemStatementId,
                teamId: teamId,
                participantId: null,
                selectedBy: userId,
                selectedAt: new Date().toISOString()
            };
            store.teams[teamId] = record;
        } else {
            // Solo Mode: verify if allowed
            const allowSolo = Config.PROVISIONAL_CONFIG && Config.PROVISIONAL_CONFIG.allowSolo === true;
            if (!allowSolo) {
                return {
                    success: false,
                    error: 'Solo participation is currently disabled for this hackathon. You must join or create a team (2-5 members) before selecting a problem statement.'
                };
            }

            record = {
                problemStatementId: problemStatementId,
                teamId: null,
                participantId: userId,
                selectedBy: userId,
                selectedAt: new Date().toISOString()
            };
            store.participants[userId] = record;
        }

        saveStore(store);
        return {
            success: true,
            selection: getSelection(userId)
        };
    }

    function changeProblemStatement(userId, newProblemStatementId) {
        if (!userId || !newProblemStatementId) {
            return { success: false, error: 'Invalid parameters for changing problem statement.' };
        }

        const subConfig = Config.SUBMISSION_CONFIG;
        if (subConfig && subConfig.allowProblemStatementChange === false) {
            return {
                success: false,
                error: 'Changing problem statement is locked for this event phase.'
            };
        }

        // Check if project is already submitted
        const Submissions = global.CampusSprint.Submissions;
        if (Submissions && typeof Submissions.getSubmission === 'function') {
            const sub = Submissions.getSubmission(userId);
            if (sub && sub.status === 'SUBMITTED') {
                const allowResubmit = subConfig && subConfig.allowResubmission === true;
                if (!allowResubmit) {
                    return {
                        success: false,
                        error: 'Cannot change problem statement after your project has already been submitted.'
                    };
                }
            }
        }

        return selectProblemStatement(userId, newProblemStatementId);
    }

    function clearSelection(userId) {
        if (!userId) return { success: false, error: 'User ID is required.' };

        const userTeamInfo = (global.CampusSprint.Teams && typeof global.CampusSprint.Teams.getUserTeam === 'function')
            ? global.CampusSprint.Teams.getUserTeam(userId)
            : null;

        const Submissions = global.CampusSprint.Submissions;
        if (Submissions && typeof Submissions.getSubmission === 'function') {
            const sub = Submissions.getSubmission(userId);
            if (sub && sub.status === 'SUBMITTED') {
                return {
                    success: false,
                    error: 'Cannot clear problem statement after project has been submitted.'
                };
            }
        }

        const store = getStore();

        if (userTeamInfo && userTeamInfo.team) {
            if (!userTeamInfo.isLeader) {
                return { success: false, error: 'Only the team leader can clear the problem statement.' };
            }
            delete store.teams[userTeamInfo.team.id];
        } else {
            delete store.participants[userId];
        }

        saveStore(store);
        return { success: true };
    }

    function resetSelections() {
        Storage.remove(Config.STORAGE_KEYS.PROBLEM_SELECTIONS);
        return getStore();
    }

    // Expose Public API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.ProblemSelection = {
        getAvailableProblemStatements,
        getProblemStatementById,
        getSelection,
        getSelectionForTeam,
        selectProblemStatement,
        changeProblemStatement,
        clearSelection,
        resetSelections
    };

})(window);

