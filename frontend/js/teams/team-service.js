/* ==========================================================================
   CampusSprint Team Service (Frontend-Only)
   Manages team creation, joining, member rosters, leadership actions,
   and local persistence seeded from mock data.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config  = global.CampusSprint.Config;
    const Storage = global.CampusSprint.Storage;

    const DEFAULT_PROVISIONAL = {
        minTeamSize: 2,
        maxTeamSize: 5,
        allowSolo: false,
        isTeamCreationOpen: true,
        supportEmail: 'support@campuscrafters.com',
        label: 'Provisional event specification'
    };

    function getConfig() {
        return (Config && Config.PROVISIONAL_CONFIG) || DEFAULT_PROVISIONAL;
    }

    // Helper: Generate unique join code e.g. "CS-4K9M"
    function generateCode(existingCodes) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        let attempts = 0;
        do {
            code = 'CS-';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            attempts++;
        } while (existingCodes.has(code.toUpperCase()) && attempts < 100);
        return code;
    }

    // Seed dynamic teams from CampusSprint.Data.teams if not present
    function getStoredTeams() {
        const raw = Storage.get(Config.STORAGE_KEYS.TEAMS_DYNAMIC, null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.warn('[CampusSprint Teams] Failed to parse dynamic teams, reseeding', e);
            }
        }

        // Seed from Data.teams
        const seed = (global.CampusSprint.Data && global.CampusSprint.Data.teams) ?
            JSON.parse(JSON.stringify(global.CampusSprint.Data.teams)) : [];

        saveTeams(seed);

        // Seed initial memberships
        const memberships = {};
        seed.forEach(team => {
            if (Array.isArray(team.memberIds)) {
                team.memberIds.forEach(mId => {
                    memberships[mId] = team.id;
                });
            }
        });
        saveMemberships(memberships);

        return seed;
    }

    function saveTeams(teams) {
        Storage.set(Config.STORAGE_KEYS.TEAMS_DYNAMIC, JSON.stringify(teams));
    }

    function getStoredMemberships() {
        const raw = Storage.get(Config.STORAGE_KEYS.TEAM_MEMBERSHIPS, null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'object' && parsed !== null) return parsed;
            } catch (e) {
                console.warn('[CampusSprint Teams] Failed to parse memberships, reseeding', e);
            }
        }
        return {};
    }

    function saveMemberships(memberships) {
        Storage.set(Config.STORAGE_KEYS.TEAM_MEMBERSHIPS, JSON.stringify(memberships));
    }

    // Query helpers
    function getTeams() {
        return getStoredTeams();
    }

    function getTeamById(teamId) {
        if (!teamId) return null;
        const teams = getStoredTeams();
        return teams.find(t => t.id === teamId) || null;
    }

    function getTeamByCode(code) {
        if (!code) return null;
        const norm = code.trim().toUpperCase();
        const teams = getStoredTeams();
        return teams.find(t => (t.joinCode || '').toUpperCase() === norm) || null;
    }

    function getUserTeam(userId) {
        if (!userId) return null;
        const memberships = getStoredMemberships();
        let teamId = memberships[userId];

        let teams = getStoredTeams();
        let team = teamId ? teams.find(t => t.id === teamId) : null;

        // Fallback: check memberIds array directly if membership index was out of sync
        if (!team) {
            team = teams.find(t => Array.isArray(t.memberIds) && t.memberIds.includes(userId)) || null;
            if (team) {
                memberships[userId] = team.id;
                saveMemberships(memberships);
            }
        }

        if (!team) return null;

        const isLeader = team.leaderId === userId;
        return {
            team,
            isLeader,
            memberCount: team.memberIds ? team.memberIds.length : 0
        };
    }

    // Resolves participant/user metadata for team member display
    function getMemberDetails(memberId) {
        let details = {
            id: memberId,
            displayName: 'Participant',
            email: '',
            college: 'CampusCrafters Participant',
            course: '',
            year: '',
            skills: [],
            avatarInitials: 'CP',
            avatarColor: '#2B50FF'
        };

        // 1. Check Data.participants
        if (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.participants)) {
            const p = global.CampusSprint.Data.participants.find(x => x.id === memberId);
            if (p) {
                details.displayName = p.displayName || details.displayName;
                details.college = p.college !== '[COLLEGE]' ? p.college : details.college;
                details.skills = p.skills || [];
                details.avatarInitials = p.avatarInitials || details.avatarInitials;
                details.avatarColor = p.avatarColor || details.avatarColor;
                details.email = p.emailPlaceholder || '';
            }
        }

        // 2. Check stored accounts
        const rawAccounts = Storage.get(Config.STORAGE_KEYS.ACCOUNTS, null);
        if (rawAccounts) {
            try {
                const accounts = JSON.parse(rawAccounts);
                const acc = accounts.find(a => a.id === memberId);
                if (acc) {
                    details.displayName = acc.displayName || details.displayName;
                    details.email = acc.email || details.email;
                    if (acc.college) details.college = acc.college;
                    if (acc.course) details.course = acc.course;
                    if (acc.year) details.year = acc.year;
                }
            } catch (e) {}
        }

        // 3. Check registration records
        const rawRegs = Storage.get(Config.STORAGE_KEYS.REGISTRATIONS, null);
        if (rawRegs) {
            try {
                const regs = JSON.parse(rawRegs);
                const reg = regs.find(r => r.userId === memberId || (details.email && r.email === details.email));
                if (reg) {
                    details.displayName = reg.fullName || details.displayName;
                    if (reg.college) details.college = reg.college;
                    if (reg.course) details.course = reg.course;
                    if (reg.yearOfStudy) details.year = reg.yearOfStudy;
                }
            } catch (e) {}
        }

        // 4. Check profile edits
        const rawEdits = Storage.get(Config.STORAGE_KEYS.PROFILE_EDITS, null);
        if (rawEdits) {
            try {
                const edits = JSON.parse(rawEdits);
                const userEdit = edits[memberId];
                if (userEdit) {
                    if (userEdit.displayName) details.displayName = userEdit.displayName;
                    if (userEdit.college) details.college = userEdit.college;
                    if (userEdit.course) details.course = userEdit.course;
                    if (userEdit.year) details.year = userEdit.year;
                    if (userEdit.bio) details.bio = userEdit.bio;
                    if (Array.isArray(userEdit.skills)) details.skills = userEdit.skills;
                }
            } catch (e) {}
        }

        // Ensure initials
        if (details.displayName) {
            const parts = details.displayName.trim().split(/\s+/);
            if (parts.length >= 2) {
                details.avatarInitials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (parts[0]) {
                details.avatarInitials = parts[0].substring(0, 2).toUpperCase();
            }
        }

        return details;
    }

    function getHydratedTeam(teamId) {
        const team = getTeamById(teamId);
        if (!team) return null;

        const members = (team.memberIds || []).map(mId => {
            const m = getMemberDetails(mId);
            return Object.assign({}, m, {
                isLeader: mId === team.leaderId
            });
        });

        // Hydrate track name if available
        let trackName = team.trackId;
        if (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.tracks)) {
            const t = global.CampusSprint.Data.tracks.find(tr => tr.id === team.trackId);
            if (t) trackName = t.title;
        }

        return {
            id: team.id,
            name: team.name,
            joinCode: team.joinCode,
            trackId: team.trackId,
            trackName,
            leaderId: team.leaderId,
            memberIds: team.memberIds,
            members,
            createdAt: team.createdAt,
            status: team.status || 'active',
            maxMembers: getConfig().maxTeamSize,
            isFull: (team.memberIds || []).length >= getConfig().maxTeamSize
        };
    }

    // Mutations
    function createTeam(userId, payload) {
        if (!userId) return { success: false, error: 'User ID is required to create a team.' };

        const existing = getUserTeam(userId);
        if (existing) {
            return {
                success: false,
                error: `You are already a member of team "${existing.team.name}". Leave that team before creating a new one.`
            };
        }

        const name = (payload && payload.name ? payload.name.trim() : '');
        if (!name || name.length < 3) {
            return { success: false, error: 'Team name must be at least 3 characters long.' };
        }

        const trackId = (payload && payload.trackId ? payload.trackId.trim() : 'fintech');

        const teams = getStoredTeams();
        const existingCodes = new Set(teams.map(t => (t.joinCode || '').toUpperCase()));
        const joinCode = generateCode(existingCodes);

        const newTeam = {
            id: 'team-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            name: name,
            joinCode: joinCode,
            trackId: trackId,
            memberIds: [userId],
            leaderId: userId,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        teams.push(newTeam);
        saveTeams(teams);

        const memberships = getStoredMemberships();
        memberships[userId] = newTeam.id;
        saveMemberships(memberships);

        return { success: true, team: newTeam };
    }

    function joinTeam(userId, code) {
        if (!userId) return { success: false, error: 'User ID is required.' };
        if (!code || !code.trim()) {
            return { success: false, error: 'Please enter a team join code.' };
        }

        const existing = getUserTeam(userId);
        if (existing) {
            return {
                success: false,
                error: `You are already in team "${existing.team.name}". Leave that team first to join another.`
            };
        }

        const normCode = code.trim().toUpperCase();
        const teams = getStoredTeams();
        const team = teams.find(t => (t.joinCode || '').toUpperCase() === normCode);

        if (!team) {
            return { success: false, error: `Invalid join code "${code}". Please verify with your team leader.` };
        }

        if (team.status && team.status !== 'active') {
            return { success: false, error: 'This team is no longer active.' };
        }

        const maxMembers = getConfig().maxTeamSize;
        if (team.memberIds && team.memberIds.length >= maxMembers) {
            return {
                success: false,
                error: `Team "${team.name}" has reached the maximum capacity of ${maxMembers} members.`
            };
        }

        if (team.memberIds && team.memberIds.includes(userId)) {
            return { success: false, error: 'You are already a member of this team.' };
        }

        team.memberIds = team.memberIds || [];
        team.memberIds.push(userId);
        saveTeams(teams);

        const memberships = getStoredMemberships();
        memberships[userId] = team.id;
        saveMemberships(memberships);

        return { success: true, team };
    }

    function leaveTeam(userId) {
        if (!userId) return { success: false, error: 'User ID is required.' };

        const userTeamInfo = getUserTeam(userId);
        if (!userTeamInfo) {
            return { success: false, error: 'You are not currently in any team.' };
        }

        const team = userTeamInfo.team;
        const teams = getStoredTeams();
        const memberships = getStoredMemberships();

        if (userTeamInfo.isLeader) {
            // If leader is alone, disband team
            if (team.memberIds.length <= 1) {
                return disbandTeam(userId);
            } else {
                return {
                    success: false,
                    error: 'As team leader, you must transfer leadership to another member or disband the team before leaving.'
                };
            }
        }

        // Regular member leaving
        team.memberIds = team.memberIds.filter(mId => mId !== userId);
        const idx = teams.findIndex(t => t.id === team.id);
        if (idx !== -1) teams[idx] = team;
        saveTeams(teams);

        delete memberships[userId];
        saveMemberships(memberships);

        return { success: true };
    }

    function removeMember(leaderId, memberIdToRemove) {
        if (!leaderId || !memberIdToRemove) {
            return { success: false, error: 'Invalid parameters.' };
        }
        if (leaderId === memberIdToRemove) {
            return { success: false, error: 'Team leader cannot be removed this way. Use disband or leave.' };
        }

        const userTeamInfo = getUserTeam(leaderId);
        if (!userTeamInfo || !userTeamInfo.isLeader) {
            return { success: false, error: 'Only the team leader has permission to remove members.' };
        }

        const team = userTeamInfo.team;
        if (!team.memberIds.includes(memberIdToRemove)) {
            return { success: false, error: 'Member is not part of this team.' };
        }

        team.memberIds = team.memberIds.filter(id => id !== memberIdToRemove);
        const teams = getStoredTeams();
        const idx = teams.findIndex(t => t.id === team.id);
        if (idx !== -1) teams[idx] = team;
        saveTeams(teams);

        const memberships = getStoredMemberships();
        delete memberships[memberIdToRemove];
        saveMemberships(memberships);

        return { success: true, team };
    }

    function transferLeadership(currentLeaderId, newLeaderId) {
        if (!currentLeaderId || !newLeaderId) return { success: false, error: 'Invalid parameters.' };

        const userTeamInfo = getUserTeam(currentLeaderId);
        if (!userTeamInfo || !userTeamInfo.isLeader) {
            return { success: false, error: 'Only the current team leader can transfer leadership.' };
        }

        const team = userTeamInfo.team;
        if (!team.memberIds.includes(newLeaderId)) {
            return { success: false, error: 'New leader must be an existing member of the team.' };
        }

        team.leaderId = newLeaderId;
        const teams = getStoredTeams();
        const idx = teams.findIndex(t => t.id === team.id);
        if (idx !== -1) teams[idx] = team;
        saveTeams(teams);

        return { success: true, team };
    }

    function regenerateJoinCode(leaderId) {
        if (!leaderId) return { success: false, error: 'User ID is required.' };

        const userTeamInfo = getUserTeam(leaderId);
        if (!userTeamInfo || !userTeamInfo.isLeader) {
            return { success: false, error: 'Only the team leader can regenerate the join code.' };
        }

        const team = userTeamInfo.team;
        const teams = getStoredTeams();
        const existingCodes = new Set(teams.map(t => (t.joinCode || '').toUpperCase()));

        const newCode = generateCode(existingCodes);
        team.joinCode = newCode;

        const idx = teams.findIndex(t => t.id === team.id);
        if (idx !== -1) teams[idx] = team;
        saveTeams(teams);

        return { success: true, newCode, team };
    }

    function disbandTeam(leaderId) {
        if (!leaderId) return { success: false, error: 'User ID is required.' };

        const userTeamInfo = getUserTeam(leaderId);
        if (!userTeamInfo || !userTeamInfo.isLeader) {
            return { success: false, error: 'Only the team leader can disband the team.' };
        }

        const team = userTeamInfo.team;
        let teams = getStoredTeams();
        teams = teams.filter(t => t.id !== team.id);
        saveTeams(teams);

        const memberships = getStoredMemberships();
        (team.memberIds || []).forEach(mId => {
            delete memberships[mId];
        });
        saveMemberships(memberships);

        return { success: true };
    }

    function updateTeamName(leaderId, newName) {
        if (!leaderId) return { success: false, error: 'User ID is required.' };
        const cleanName = (newName || '').trim();
        if (cleanName.length < 3) {
            return { success: false, error: 'Team name must be at least 3 characters.' };
        }

        const userTeamInfo = getUserTeam(leaderId);
        if (!userTeamInfo || !userTeamInfo.isLeader) {
            return { success: false, error: 'Only the team leader can rename the team.' };
        }

        const team = userTeamInfo.team;
        team.name = cleanName;

        const teams = getStoredTeams();
        const idx = teams.findIndex(t => t.id === team.id);
        if (idx !== -1) teams[idx] = team;
        saveTeams(teams);

        return { success: true, team };
    }

    // Reset helper for development & test suites
    function resetTeams() {
        Storage.remove(Config.STORAGE_KEYS.TEAMS_DYNAMIC);
        Storage.remove(Config.STORAGE_KEYS.TEAM_MEMBERSHIPS);
        return getStoredTeams();
    }

    // Expose Public API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Teams = {
        getTeams,
        getTeamById,
        getTeamByCode,
        getUserTeam,
        getHydratedTeam,
        createTeam,
        joinTeam,
        leaveTeam,
        removeMember,
        transferLeadership,
        regenerateJoinCode,
        disbandTeam,
        updateTeamName,
        resetTeams
    };

})(window);

