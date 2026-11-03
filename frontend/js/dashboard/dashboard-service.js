/* ==========================================================================
   CampusSprint Dashboard Service (Frontend-Only)
   Provides participant profile management, announcement state tracking,
   and dashboard aggregation logic.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config       = global.CampusSprint.Config;
    const Storage      = global.CampusSprint.Storage;
    const Auth         = global.CampusSprint.Auth;
    const Registration = global.CampusSprint.Registration;

    // --- Profile Management ---

    function getStoredProfileEdits() {
        const raw = Storage.get(Config.STORAGE_KEYS.PROFILE_EDITS, null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'object' && parsed !== null) return parsed;
            } catch (e) {
                console.warn('[CampusSprint Dashboard] Failed to parse profile edits', e);
            }
        }
        return {};
    }

    function saveProfileEdits(edits) {
        Storage.set(Config.STORAGE_KEYS.PROFILE_EDITS, JSON.stringify(edits));
    }

    function getUserProfile(userId) {
        if (!userId) return null;

        // Base profile defaults
        let profile = {
            id: userId,
            displayName: 'Hacker',
            email: '',
            college: 'CampusCrafters Participant',
            course: 'B.Tech Computer Science',
            year: '3rd Year',
            bio: 'Passionate developer and builder ready for the 24-hour sprint.',
            skills: ['JavaScript', 'HTML/CSS', 'Python'],
            trackId: 'fintech',
            trackTitle: 'FinTech & Inclusion',
            registrationId: 'REG-2026-DEMO',
            ticketCode: 'CS26-PASS-DEMO',
            registeredAt: new Date().toISOString(),
            avatarInitials: 'HK',
            avatarColor: '#2B50FF'
        };

        // 1. Check Data.participants
        if (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.participants)) {
            const p = global.CampusSprint.Data.participants.find(x => x.id === userId);
            if (p) {
                if (p.displayName) profile.displayName = p.displayName;
                if (p.emailPlaceholder) profile.email = p.emailPlaceholder;
                if (p.college && p.college !== '[COLLEGE]') profile.college = p.college;
                if (Array.isArray(p.skills) && p.skills.length > 0) profile.skills = p.skills.slice();
                if (p.avatarInitials) profile.avatarInitials = p.avatarInitials;
                if (p.avatarColor) profile.avatarColor = p.avatarColor;
            }
        }

        // 2. Check Auth currentUser
        const currentUser = Auth ? Auth.getCurrentUser() : null;
        if (currentUser && currentUser.id === userId) {
            if (currentUser.displayName) profile.displayName = currentUser.displayName;
            if (currentUser.email) profile.email = currentUser.email;
            if (currentUser.college) profile.college = currentUser.college;
            if (currentUser.course) profile.course = currentUser.course;
            if (currentUser.year) profile.year = currentUser.year;
        }

        // 3. Check Registration records
        if (Registration) {
            const reg = Registration.getRegistrationByUserId(userId) ||
                (profile.email ? Registration.getRegistrationByEmail(profile.email) : null);
            if (reg) {
                if (reg.fullName) profile.displayName = reg.fullName;
                if (reg.email) profile.email = reg.email;
                if (reg.college) profile.college = reg.college;
                if (reg.course) profile.course = reg.course;
                if (reg.yearOfStudy) profile.year = reg.yearOfStudy;
                if (reg.trackId) profile.trackId = reg.trackId;
                if (reg.id) profile.registrationId = reg.id;
                if (reg.ticketCode) profile.ticketCode = reg.ticketCode;
                if (reg.timestamp) profile.registeredAt = reg.timestamp;
            }
        }

        // 4. Resolve track title
        if (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.tracks)) {
            const track = global.CampusSprint.Data.tracks.find(t => t.id === profile.trackId);
            if (track) profile.trackTitle = track.title;
        }

        // 5. Apply User Profile Edits override
        const edits = getStoredProfileEdits();
        const userEdit = edits[userId];
        if (userEdit) {
            if (userEdit.displayName) profile.displayName = userEdit.displayName;
            if (userEdit.bio !== undefined) profile.bio = userEdit.bio;
            if (userEdit.college) profile.college = userEdit.college;
            if (userEdit.course) profile.course = userEdit.course;
            if (userEdit.year) profile.year = userEdit.year;
            if (Array.isArray(userEdit.skills)) profile.skills = userEdit.skills;
        }

        // Compute initials
        if (profile.displayName) {
            const parts = profile.displayName.trim().split(/\s+/);
            if (parts.length >= 2) {
                profile.avatarInitials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (parts[0]) {
                profile.avatarInitials = parts[0].substring(0, 2).toUpperCase();
            }
        }

        return profile;
    }

    function updateUserProfile(userId, updates) {
        if (!userId) return { success: false, error: 'User ID is required.' };
        if (!updates || typeof updates !== 'object') {
            return { success: false, error: 'No update data provided.' };
        }

        const edits = getStoredProfileEdits();
        edits[userId] = edits[userId] || {};

        if (typeof updates.displayName === 'string' && updates.displayName.trim().length >= 2) {
            edits[userId].displayName = updates.displayName.trim();
        }
        if (typeof updates.bio === 'string') {
            edits[userId].bio = updates.bio.trim();
        }
        if (typeof updates.college === 'string' && updates.college.trim().length > 0) {
            edits[userId].college = updates.college.trim();
        }
        if (typeof updates.course === 'string') {
            edits[userId].course = updates.course.trim();
        }
        if (typeof updates.year === 'string') {
            edits[userId].year = updates.year.trim();
        }
        if (Array.isArray(updates.skills)) {
            edits[userId].skills = updates.skills.map(s => String(s).trim()).filter(Boolean);
        }

        saveProfileEdits(edits);

        // Update active Auth session if name changed
        const currentUser = Auth ? Auth.getCurrentUser() : null;
        if (currentUser && currentUser.id === userId && edits[userId].displayName) {
            currentUser.displayName = edits[userId].displayName;
            Auth.setCurrentUser(currentUser);
        }

        return { success: true, profile: getUserProfile(userId) };
    }

    // --- Announcements Management ---

    function getReadAnnouncementIds() {
        const raw = Storage.get(Config.STORAGE_KEYS.ANNOUNCEMENTS_READ, null);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return new Set(parsed);
            } catch (e) {}
        }
        return new Set();
    }

    function saveReadAnnouncementIds(set) {
        const arr = Array.from(set);
        Storage.set(Config.STORAGE_KEYS.ANNOUNCEMENTS_READ, JSON.stringify(arr));
    }

    function getAnnouncements(categoryFilter) {
        const filter = (categoryFilter || 'all').toLowerCase();
        const base = (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.announcements)) ?
            global.CampusSprint.Data.announcements : [];

        const readSet = getReadAnnouncementIds();

        // Map read state
        const enriched = base.map(item => {
            const isRead = readSet.has(item.id) || (item.read === true && !readSet.has('unread_' + item.id));
            return Object.assign({}, item, { isRead });
        });

        // Filter
        const filtered = filter === 'all' ?
            enriched :
            enriched.filter(item => (item.category || '').toLowerCase() === filter);

        const unreadCount = enriched.filter(item => !item.isRead).length;

        return {
            list: filtered,
            totalCount: enriched.length,
            unreadCount: unreadCount
        };
    }

    function markAnnouncementAsRead(id) {
        if (!id) return;
        const readSet = getReadAnnouncementIds();
        readSet.add(id);
        saveReadAnnouncementIds(readSet);
    }

    function markAnnouncementAsUnread(id) {
        if (!id) return;
        const readSet = getReadAnnouncementIds();
        readSet.delete(id);
        saveReadAnnouncementIds(readSet);
    }

    function toggleAnnouncementRead(id) {
        if (!id) return false;
        const readSet = getReadAnnouncementIds();
        let isNowRead = false;
        if (readSet.has(id)) {
            readSet.delete(id);
            isNowRead = false;
        } else {
            readSet.add(id);
            isNowRead = true;
        }
        saveReadAnnouncementIds(readSet);
        return isNowRead;
    }

    function markAllAnnouncementsRead() {
        const base = (global.CampusSprint.Data && Array.isArray(global.CampusSprint.Data.announcements)) ?
            global.CampusSprint.Data.announcements : [];
        const readSet = getReadAnnouncementIds();
        base.forEach(a => readSet.add(a.id));
        saveReadAnnouncementIds(readSet);
    }

    // Expose Public API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Dashboard = {
        getUserProfile,
        updateUserProfile,
        getAnnouncements,
        markAnnouncementAsRead,
        markAnnouncementAsUnread,
        toggleAnnouncementRead,
        markAllAnnouncementsRead
    };

})(window);

