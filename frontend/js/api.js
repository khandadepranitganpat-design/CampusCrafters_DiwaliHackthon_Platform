/* ==========================================================================
   CampusSprint Network API Client
   System Integration: Handles HTTP requests, JWT token management, 
   response envelope unwrapping, and bridges Frontend to Backend endpoints.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config = global.CampusSprint.ApiConfig || {};
    const Storage = (global.CampusSprint && global.CampusSprint.Storage) || {
        get: (k, d) => {
            try { return localStorage.getItem(k) || d; } catch (e) { return d; }
        },
        set: (k, v) => {
            try { localStorage.setItem(k, v); } catch (e) {}
        },
        remove: (k) => {
            try { localStorage.removeItem(k); } catch (e) {}
        }
    };

    const TOKEN_KEY = (Config.STORAGE_KEYS && Config.STORAGE_KEYS.ACCESS_TOKEN) || 'cs26_access_token';

    function getBaseUrl() {
        return (global.CampusSprint && global.CampusSprint.ApiConfig && global.CampusSprint.ApiConfig.API_BASE_URL)
            || 'http://localhost:5000/api/v1';
    }

    function getAuthToken() {
        return Storage.get(TOKEN_KEY, null);
    }

    function setAuthToken(token) {
        if (token) {
            Storage.set(TOKEN_KEY, token);
        } else {
            Storage.remove(TOKEN_KEY);
        }
    }

    function clearAuthToken() {
        Storage.remove(TOKEN_KEY);
    }

    /**
     * Core Network Request Wrapper with Bearer Auth & Universal Envelope Unwrapping
     */
    async function request(endpoint, options = {}) {
        const baseUrl = getBaseUrl();
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        const headers = Object.assign(
            {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            options.headers || {}
        );

        const token = getAuthToken();
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeoutMs = (Config.TIMEOUT_MS || 10000);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const fetchOptions = {
            method: options.method || 'GET',
            headers,
            signal: controller.signal,
            credentials: 'include'
        };

        if (options.body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
            fetchOptions.body = typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            let resJson = null;
            const text = await response.text();
            try {
                resJson = text ? JSON.parse(text) : {};
            } catch (err) {
                resJson = { raw: text };
            }

            // Universal Response Envelope handling: { success, data, error, meta }
            if (response.ok && (resJson.success === undefined || resJson.success === true)) {
                return {
                    success: true,
                    status: response.status,
                    data: resJson.data !== undefined ? resJson.data : resJson,
                    meta: resJson.meta || null
                };
            }

            const errorObj = resJson.error || {};
            const errorMessage = errorObj.message || resJson.message || `Request failed with HTTP ${response.status}`;

            return {
                success: false,
                status: response.status,
                error: errorMessage,
                errorCode: errorObj.code || 'HTTP_ERROR',
                field: errorObj.field || null,
                details: errorObj.details || null,
                meta: resJson.meta || null
            };
        } catch (error) {
            clearTimeout(timeoutId);
            const isAbort = error.name === 'AbortError';
            return {
                success: false,
                status: isAbort ? 408 : 0,
                error: isAbort ? 'Request timed out' : (error.message || 'Network connection error'),
                errorCode: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR'
            };
        }
    }

    // --- API Operations mapped from FRONTEND_INTEGRATION.md ---

    const Api = {
        // Base helpers
        request,
        getAuthToken,
        setAuthToken,
        clearAuthToken,
        getBaseUrl,

        // 1. Health & Configuration State
        getHealth() {
            return request('/health');
        },

        getSystemState() {
            return request('/config/state');
        },

        // 2. Authentication
        async devLogin(email, password) {
            const res = await request('/auth/dev/login', {
                method: 'POST',
                body: { email, password }
            });
            if (res.success && res.data && res.data.access_token) {
                setAuthToken(res.data.access_token);
                if (res.data.user) {
                    Storage.set('cs26_current_user', JSON.stringify(res.data.user));
                }
            }
            return res;
        },

        async devSignup(data) {
            const res = await request('/auth/dev/signup', {
                method: 'POST',
                body: data
            });
            if (res.success && res.data && res.data.access_token) {
                setAuthToken(res.data.access_token);
                if (res.data.user) {
                    Storage.set('cs26_current_user', JSON.stringify(res.data.user));
                }
            }
            return res;
        },

        async getCurrentUser() {
            return request('/auth/me');
        },

        async logout() {
            try {
                await request('/auth/logout', { method: 'POST' });
            } finally {
                clearAuthToken();
            }
            return { success: true };
        },

        forgotPassword(email) {
            return request('/auth/forgot-password', {
                method: 'POST',
                body: { email }
            });
        },

        // 3. Registrations & Waitlist
        submitRegistration(data) {
            return request('/registrations', {
                method: 'POST',
                body: data
            });
        },

        getMyRegistration() {
            return request('/registrations/me');
        },

        submitWaitlist(data) {
            return request('/registrations/waitlist', {
                method: 'POST',
                body: data
            });
        },

        // 4. Participant Profile
        getProfile() {
            return request('/profile/me');
        },

        updateProfile(data) {
            return request('/profile/me', {
                method: 'PUT',
                body: data
            });
        },

        // 5. Tracks & Problem Statements
        getTracks() {
            return request('/tracks');
        },

        getProblemStatements(params = {}) {
            const query = new URLSearchParams(params).toString();
            return request(`/problem-statements${query ? '?' + query : ''}`);
        },

        getProblemStatementById(id) {
            return request(`/problem-statements/${encodeURIComponent(id)}`);
        },

        // 6. Teams
        listTeams(params = {}) {
            const query = new URLSearchParams(params).toString();
            return request(`/teams${query ? '?' + query : ''}`);
        },

        getMyTeam() {
            return request('/teams/me');
        },

        createTeam(data) {
            return request('/teams', {
                method: 'POST',
                body: data
            });
        },

        joinTeam(joinCode) {
            return request('/teams/join', {
                method: 'POST',
                body: { join_code: joinCode }
            });
        },

        leaveTeam() {
            return request('/teams/leave', {
                method: 'POST'
            });
        },

        renameTeam(teamId, name) {
            return request(`/teams/${encodeURIComponent(teamId)}/name`, {
                method: 'PATCH',
                body: { name }
            });
        },

        regenerateJoinCode(teamId) {
            return request(`/teams/${encodeURIComponent(teamId)}/regenerate-code`, {
                method: 'POST'
            });
        },

        removeMember(teamId, userId) {
            return request(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`, {
                method: 'DELETE'
            });
        },

        transferLeadership(teamId, newLeaderId) {
            return request(`/teams/${encodeURIComponent(teamId)}/transfer-leadership`, {
                method: 'POST',
                body: { new_leader_id: newLeaderId }
            });
        },

        disbandTeam(teamId) {
            return request(`/teams/${encodeURIComponent(teamId)}`, {
                method: 'DELETE'
            });
        },

        // 7. Problem Selection (Per Team)
        getTeamProblemStatement(teamId) {
            return request(`/teams/${encodeURIComponent(teamId)}/problem-statement`);
        },

        selectProblemStatement(teamId, problemStatementId) {
            return request(`/teams/${encodeURIComponent(teamId)}/problem-statement`, {
                method: 'PUT',
                body: { problem_statement_id: problemStatementId }
            });
        },

        clearProblemSelection(teamId) {
            return request(`/teams/${encodeURIComponent(teamId)}/problem-statement`, {
                method: 'DELETE'
            });
        },

        // 8. Submissions
        getTeamSubmission(teamId) {
            return request(`/teams/${encodeURIComponent(teamId)}/submission`);
        },

        saveSubmissionDraft(teamId, draftData) {
            return request(`/teams/${encodeURIComponent(teamId)}/submission/draft`, {
                method: 'PUT',
                body: draftData
            });
        },

        submitFinalProject(teamId, submissionData) {
            return request(`/teams/${encodeURIComponent(teamId)}/submission/submit`, {
                method: 'POST',
                body: submissionData
            });
        },

        // 9. Announcements
        getAnnouncements(params = {}) {
            const query = new URLSearchParams(params).toString();
            return request(`/announcements${query ? '?' + query : ''}`);
        },

        markAnnouncementRead(id) {
            return request(`/announcements/${encodeURIComponent(id)}/read`, {
                method: 'POST'
            });
        },

        markAnnouncementUnread(id) {
            return request(`/announcements/${encodeURIComponent(id)}/read`, {
                method: 'DELETE'
            });
        },

        markAllAnnouncementsRead() {
            return request('/announcements/read-all', {
                method: 'POST'
            });
        },

        // 10. Auto-Sync initialization
        async syncWithBackend() {
            try {
                const health = await this.getHealth();
                if (!health.success) {
                    console.info('[CampusSprint API] Backend currently offline or unreachable. Operating in resilient mode.');
                    return false;
                }
                console.info('[CampusSprint API] Connected to Backend successfully:', health.data);

                // Fetch live event state
                const stateRes = await this.getSystemState();
                if (stateRes.success && stateRes.data && global.CampusSprint.stateManager) {
                    const sm = global.CampusSprint.stateManager;
                    if (stateRes.data.event_state && typeof sm.setEventState === 'function') {
                        sm.setEventState(stateRes.data.event_state);
                    }
                }

                // If authenticated, sync profile & user info
                if (getAuthToken()) {
                    const meRes = await this.getCurrentUser();
                    if (meRes.success && meRes.data) {
                        Storage.set('cs26_current_user', JSON.stringify(meRes.data));
                        if (global.CampusSprint.stateManager && meRes.data.visitor_state) {
                            global.CampusSprint.stateManager.setVisitorState(meRes.data.visitor_state);
                        }
                    } else if (meRes.status === 401) {
                        clearAuthToken();
                    }
                }
                return true;
            } catch (err) {
                console.warn('[CampusSprint API] Sync encounter error:', err);
                return false;
            }
        }
    };

    // Expose on global namespace
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Api = Api;

    // Run connection test on DOMContentLoaded
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => Api.syncWithBackend());
        } else {
            Api.syncWithBackend();
        }
    }

})(window);

