/* ==========================================================================
   CampusSprint Mock Data — Index / Validation
   Loads after all data files. Validates referential integrity.
   ========================================================================== */
(function(global) {
    'use strict';

    const Data = global.CampusSprint.Data;

    function validateData() {
        const errors = [];

        // --- ID uniqueness ---
        function checkUnique(collection, collectionName) {
            if (!collection || !Array.isArray(collection)) {
                errors.push(collectionName + ': collection is missing or not an array');
                return;
            }
            const ids = collection.map(item => item.id);
            const unique = new Set(ids);
            if (unique.size !== ids.length) errors.push(collectionName + ': duplicate IDs found');
        }
        checkUnique(Data.tracks,            'tracks');
        checkUnique(Data.problemStatements, 'problemStatements');
        checkUnique(Data.announcements,     'announcements');
        checkUnique(Data.participants,      'participants');
        checkUnique(Data.teams,             'teams');
        checkUnique(Data.submissions,       'submissions');

        // --- Track references ---
        const trackIds = new Set((Data.tracks || []).map(t => t.id));
        (Data.problemStatements || []).forEach(ps => {
            if (!trackIds.has(ps.trackId)) errors.push('problemStatement ' + ps.id + ': invalid trackId "' + ps.trackId + '"');
        });
        (Data.teams || []).forEach(team => {
            if (!trackIds.has(team.trackId)) errors.push('team ' + team.id + ': invalid trackId "' + team.trackId + '"');
        });

        // --- Participant references in teams ---
        const participantIds = new Set((Data.participants || []).map(p => p.id));
        (Data.teams || []).forEach(team => {
            (team.memberIds || []).forEach(mid => {
                if (!participantIds.has(mid)) errors.push('team ' + team.id + ': invalid memberId "' + mid + '"');
            });
            if (!participantIds.has(team.leaderId)) errors.push('team ' + team.id + ': invalid leaderId "' + team.leaderId + '"');
        });

        // --- Submission references ---
        const teamIds = new Set((Data.teams || []).map(t => t.id));
        const psIds   = new Set((Data.problemStatements || []).map(ps => ps.id));
        (Data.submissions || []).forEach(sub => {
            if (!teamIds.has(sub.teamId))           errors.push('submission ' + sub.id + ': invalid teamId "' + sub.teamId + '"');
            if (!psIds.has(sub.problemStatementId)) errors.push('submission ' + sub.id + ': invalid problemStatementId "' + sub.problemStatementId + '"');
        });

        return errors;
    }

    const validationErrors = validateData();
    if (validationErrors.length > 0) {
        console.error('[CampusSprint Data] Validation errors:', validationErrors);
    } else {
        console.log('[CampusSprint Data] All datasets validated OK. Counts:', {
            tracks:            Data.tracks ? Data.tracks.length : 0,
            problemStatements: Data.problemStatements ? Data.problemStatements.length : 0,
            announcements:     Data.announcements ? Data.announcements.length : 0,
            participants:      Data.participants ? Data.participants.length : 0,
            teams:             Data.teams ? Data.teams.length : 0,
            submissions:       Data.submissions ? Data.submissions.length : 0
        });
    }

    // Expose helpers
    global.CampusSprint.Data.getTrackById = (id) => (Data.tracks || []).find(t => t.id === id) || null;
    global.CampusSprint.Data.getProblemsByTrack = (trackId) => (Data.problemStatements || []).filter(ps => ps.trackId === trackId);
    global.CampusSprint.Data.getParticipantById = (id) => (Data.participants || []).find(p => p.id === id) || null;
    global.CampusSprint.Data.getTeamById = (id) => (Data.teams || []).find(t => t.id === id) || null;
    global.CampusSprint.Data.validateData = validateData;

})(window);

