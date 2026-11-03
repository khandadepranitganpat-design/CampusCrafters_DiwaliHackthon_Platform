/* ==========================================================================
   CampusSprint Mock Registration Service (Frontend-Only)
   Handles registration validation, persistence, duplicate checking, and record retrieval.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config  = global.CampusSprint.Config;
    const Storage = global.CampusSprint.Storage;
    const SM      = global.CampusSprint.stateManager;

    // Helper: Generate unique registration ID and ticket code
    function generateId() {
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        return 'REG-2026-' + rand;
    }

    function generateTicketCode() {
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        return 'CS26-' + part1 + '-' + part2;
    }

    // Load registrations array from storage
    function getRegistrations() {
        const raw = Storage.get(Config.STORAGE_KEYS.REGISTRATIONS, '[]');
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            console.warn('[CampusSprint Registration] Error parsing registrations, returning empty list', e);
            return [];
        }
    }

    function saveRegistrations(regs) {
        Storage.set(Config.STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
    }

    // Lookup helpers
    function getRegistrationByEmail(email) {
        if (!email) return null;
        const regs = getRegistrations();
        const norm = email.trim().toLowerCase();
        return regs.find(r => (r.email || '').toLowerCase() === norm) || null;
    }

    function getRegistrationByUserId(userId) {
        if (!userId) return null;
        const regs = getRegistrations();
        return regs.find(r => r.userId === userId) || null;
    }

    function hasRegistrationForEmail(email) {
        return !!getRegistrationByEmail(email);
    }

    // Validation for Step 1: Personal Info
    function validatePersonalInfo(data) {
        const errors = {};
        if (!data.fullName || !data.fullName.trim()) {
            errors.fullName = 'Full name is required.';
        }
        if (!data.email || !data.email.trim()) {
            errors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
            errors.email = 'Please enter a valid email address.';
        }
        if (!data.college || !data.college.trim()) {
            errors.college = 'College or institution name is required.';
        }
        if (!data.course || !data.course.trim()) {
            errors.course = 'Degree / Course is required.';
        }
        if (!data.year || !data.year.trim()) {
            errors.year = 'Academic year is required.';
        }
        if (!data.phone || !data.phone.trim()) {
            errors.phone = 'Phone number is required.';
        } else if (!/^[0-9+() -]{8,18}$/.test(data.phone.trim())) {
            errors.phone = 'Please enter a valid phone number.';
        }
        return { isValid: Object.keys(errors).length === 0, errors };
    }

    // Validation for Step 2: Profile & Skills
    function validateProfileInfo(data) {
        const errors = {};
        if (!data.skills || !Array.isArray(data.skills) || data.skills.length === 0) {
            errors.skills = 'Please select or add at least one technical skill.';
        }
        if (!data.experience) {
            errors.experience = 'Please select your hackathon experience level.';
        }
        return { isValid: Object.keys(errors).length === 0, errors };
    }

    // Validation for Step 3: Track Selection
    function validateTrackSelection(trackId) {
        const errors = {};
        const validTracks = (global.CampusSprint.Data && global.CampusSprint.Data.tracks)
            ? global.CampusSprint.Data.tracks.map(t => t.id)
            : ['fintech', 'social-good', 'web3', 'beginner'];

        if (!trackId || !validTracks.includes(trackId)) {
            errors.track = 'Please select one of the four official hackathon tracks.';
        }
        return { isValid: Object.keys(errors).length === 0, errors };
    }

    // Validation for Step 4: Rules Agreement
    function validateRulesAgreement(rulesAccepted) {
        const errors = {};
        if (!rulesAccepted) {
            errors.rules = 'You must accept the hackathon rules and code of conduct to proceed.';
        }
        return { isValid: Object.keys(errors).length === 0, errors };
    }

    // Create & Persist Final Registration Record
    function submitRegistration(formData) {
        // Enforce event-state restriction: cannot register during REG_CLOSED, EVENT_LIVE, JUDGING, RESULTS, TEASER
        const currentEventState = SM.getEventState();
        const nonRegStates = [
            Config.EVENT_STATES.TEASER,
            Config.EVENT_STATES.FULL,
            Config.EVENT_STATES.REG_CLOSED,
            Config.EVENT_STATES.EVENT_LIVE,
            Config.EVENT_STATES.JUDGING,
            Config.EVENT_STATES.RESULTS
        ];

        if (nonRegStates.includes(currentEventState)) {
            return {
                success: false,
                error: `Registration is currently not accepted during "${currentEventState}" stage.`
            };
        }

        // Validate personal info
        const personalVal = validatePersonalInfo(formData);
        if (!personalVal.isValid) return { success: false, errors: personalVal.errors };

        // Validate profile info
        const profileVal = validateProfileInfo(formData);
        if (!profileVal.isValid) return { success: false, errors: profileVal.errors };

        // Validate track
        const trackVal = validateTrackSelection(formData.trackId);
        if (!trackVal.isValid) return { success: false, errors: trackVal.errors };

        // Validate rules
        const rulesVal = validateRulesAgreement(formData.rulesAccepted);
        if (!rulesVal.isValid) return { success: false, errors: rulesVal.errors };

        // Prevent duplicate registration for the same email
        const existing = getRegistrationByEmail(formData.email);
        if (existing) {
            return {
                success: false,
                error: 'A registration for this email address has already been submitted.'
            };
        }

        // Build official record
        const record = {
            id: generateId(),
            userId: formData.userId || 'u-guest-' + Date.now().toString(36),
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            college: formData.college.trim(),
            course: formData.course.trim(),
            year: formData.year.trim(),
            phone: formData.phone.trim(),
            skills: Array.isArray(formData.skills) ? formData.skills : [],
            interests: Array.isArray(formData.interests) ? formData.interests : [],
            bio: (formData.bio || '').trim(),
            experience: formData.experience,
            trackId: formData.trackId,
            rulesAccepted: true,
            status: 'confirmed',
            ticketCode: generateTicketCode(),
            registeredAt: new Date().toISOString()
        };

        const allRegs = getRegistrations();
        allRegs.push(record);
        saveRegistrations(allRegs);

        // Update Visitor State to REGISTERED
        SM.setVisitorState(Config.VISITOR_STATES.REGISTERED);

        return {
            success: true,
            registration: record
        };
    }

    // Waitlist Handling (for FULL event state)
    function submitWaitlist(data) {
        if (!data.fullName || !data.fullName.trim() || !data.email || !data.email.trim()) {
            return { success: false, error: 'Name and email are required for the waitlist.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
            return { success: false, error: 'Please enter a valid email address.' };
        }

        const raw = Storage.get(Config.STORAGE_KEYS.WAITLIST, '[]');
        let waitlist = [];
        try { waitlist = JSON.parse(raw); } catch (e) { waitlist = []; }

        const entry = {
            id: 'WL-' + Date.now().toString(36).toUpperCase(),
            fullName: data.fullName.trim(),
            email: data.email.trim(),
            college: (data.college || '').trim(),
            trackInterest: data.trackInterest || 'any',
            submittedAt: new Date().toISOString()
        };

        waitlist.push(entry);
        Storage.set(Config.STORAGE_KEYS.WAITLIST, JSON.stringify(waitlist));

        return { success: true, entry };
    }

    function getWaitlist() {
        const raw = Storage.get(Config.STORAGE_KEYS.WAITLIST, '[]');
        try { return JSON.parse(raw); } catch (e) { return []; }
    }

    // Expose API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Registration = {
        getRegistrations,
        getRegistrationByEmail,
        getRegistrationByUserId,
        hasRegistrationForEmail,
        validatePersonalInfo,
        validateProfileInfo,
        validateTrackSelection,
        validateRulesAgreement,
        submitRegistration,
        submitWaitlist,
        getWaitlist
    };

})(window);

