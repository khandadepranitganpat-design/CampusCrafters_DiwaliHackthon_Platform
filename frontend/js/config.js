/* ==========================================================================
   CampusSprint Network & API Configuration
   System Integration: Bridges Frontend with Flask Backend & Supabase.
   ========================================================================== */
(function(global) {
    'use strict';

    // Dynamic API Base URL resolution based on current host environment
    const isLocal = ['localhost', '127.0.0.1'].includes(global.location.hostname) || global.location.hostname === '';
    const API_BASE_URL = global.__CAMPUSCRAFTERS_API_BASE__ || (
        isLocal
            ? 'http://localhost:5000/api/v1'
            : 'https://api.campuscrafters.com/api/v1'
    );

    const ENDPOINTS = Object.freeze({
        // Health & System State
        HEALTH:             '/health',
        CONFIG_STATE:       '/config/state',

        // Authentication & Session
        AUTH_DEV_LOGIN:     '/auth/dev/login',
        AUTH_DEV_SIGNUP:    '/auth/dev/signup',
        AUTH_ME:            '/auth/me',
        AUTH_LOGOUT:        '/auth/logout',
        AUTH_FORGOT_PW:     '/auth/forgot-password',
        AUTH_SSO_LOGIN:     '/auth/sso/login',
        AUTH_SSO_CALLBACK:  '/auth/sso/callback',

        // Registrations
        REGISTRATIONS:      '/registrations',
        REGISTRATIONS_ME:   '/registrations/me',
        WAITLIST:           '/registrations/waitlist',

        // Profile / Participant
        PROFILE_ME:         '/profile/me',

        // Tracks & Problem Statements
        TRACKS:             '/tracks',
        PROBLEM_STATEMENTS: '/problem-statements',

        // Teams & Leadership
        TEAMS:              '/teams',
        TEAMS_ME:           '/teams/me',
        TEAMS_JOIN:         '/teams/join',
        TEAMS_LEAVE:        '/teams/leave',

        // Announcements
        ANNOUNCEMENTS:      '/announcements',
        ANNOUNCEMENTS_READ_ALL: '/announcements/read-all'
    });

    const STORAGE_KEYS = Object.freeze({
        ACCESS_TOKEN: 'cs26_access_token',
        REFRESH_TOKEN: 'cs26_refresh_token',
        AUTH_USER: 'cs26_current_user'
    });

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.ApiConfig = {
        API_BASE_URL,
        ENDPOINTS,
        STORAGE_KEYS,
        TIMEOUT_MS: 10000
    };

})(window);

