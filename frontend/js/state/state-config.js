/* ==========================================================================
   CampusSprint State Configuration
   Defines valid states, labels, and transitions.
   ========================================================================== */
(function(global) {
    'use strict';

    const EVENT_STATES = Object.freeze({
        TEASER:         'teaser',
        REG_OPEN:       'reg_open',
        ALMOST_FULL:    'almost_full',
        FULL:           'full',
        REG_CLOSED:     'reg_closed',
        EVENT_LIVE:     'event_live',
        JUDGING:        'judging',
        RESULTS:        'results'
    });

    const EVENT_STATE_META = Object.freeze({
        [EVENT_STATES.TEASER]:      { label: 'Coming Soon',         description: 'Event announced. Registration not yet open.',              ctaLabel: 'Registration Opens Soon',     ctaEnabled: false },
        [EVENT_STATES.REG_OPEN]:    { label: 'Registration Open',   description: 'Registration is open. Secure your spot now.',             ctaLabel: 'Register with CampusCrafters',ctaEnabled: true  },
        [EVENT_STATES.ALMOST_FULL]: { label: 'Almost Full',         description: 'Registration is nearing capacity. Act fast.',             ctaLabel: 'Register — Almost Full!',     ctaEnabled: true  },
        [EVENT_STATES.FULL]:        { label: 'Sold Out',            description: 'Team capacity reached. No new registrations.',            ctaLabel: 'Join Waitlist',               ctaEnabled: true  },
        [EVENT_STATES.REG_CLOSED]:  { label: 'Registration Closed', description: 'Registration has closed.',                               ctaLabel: 'Log in to Dashboard',         ctaEnabled: true  },
        [EVENT_STATES.EVENT_LIVE]:  { label: '🔴 Live Now',         description: 'The hackathon is currently running. Good luck!',          ctaLabel: 'Open Dashboard',              ctaEnabled: true  },
        [EVENT_STATES.JUDGING]:     { label: 'Judging',             description: 'Submissions are being evaluated by judges.',              ctaLabel: 'View Submissions',            ctaEnabled: false },
        [EVENT_STATES.RESULTS]:     { label: 'Results Announced',   description: 'Winners have been announced. Congratulations to all!',   ctaLabel: 'See Results',                 ctaEnabled: false }
    });

    const VISITOR_STATES = Object.freeze({
        LOGGED_OUT:             'logged_out',
        LOGGED_IN_UNREGISTERED: 'logged_in_unregistered',
        REGISTERED:             'registered'
    });

    const VISITOR_STATE_META = Object.freeze({
        [VISITOR_STATES.LOGGED_OUT]:             { label: 'Guest',          description: 'Not signed in.' },
        [VISITOR_STATES.LOGGED_IN_UNREGISTERED]: { label: 'Signed In',      description: 'Signed in but not yet registered for the event.' },
        [VISITOR_STATES.REGISTERED]:             { label: 'Registered',     description: 'Signed in and registered for the event.' }
    });

    const STORAGE_KEYS = Object.freeze({
        EVENT_STATE:        'cs26_event_state',
        VISITOR_STATE:      'cs26_visitor_state',
        CURRENT_USER:       'cs26_current_user',
        REGISTRATIONS:      'cs26_registrations',
        ACCOUNTS:           'cs26_mock_accounts',
        WAITLIST:           'cs26_waitlist',
        TEAMS_DYNAMIC:      'cs26_dynamic_teams',
        TEAM_MEMBERSHIPS:   'cs26_team_memberships',
        ANNOUNCEMENTS_READ: 'cs26_read_announcements',
        PROFILE_EDITS:      'cs26_profile_edits',
        PROBLEM_SELECTIONS: 'cs26_problem_selections',
        PROJECT_SUBMISSIONS:'cs26_project_submissions'
    });

    const PROVISIONAL_CONFIG = Object.freeze({
        minTeamSize: 2,
        maxTeamSize: 5,
        allowSolo: false,
        isTeamCreationOpen: true,
        supportEmail: 'support@campuscrafters.com',
        discordUrl: 'https://discord.gg/campuscrafters',
        label: 'Provisional event specification'
    });

    const SUBMISSION_CONFIG = Object.freeze({
        enabled: true,
        allowProblemStatementChange: true,
        allowDraftEditing: true,
        allowResubmission: false,
        requireProjectTitle: true,
        requireProjectDescription: true,
        requireRepositoryUrl: true,
        requireDemoUrl: false,
        requireTechStack: true,
        requirePresentationUrl: false,
        submissionDeadline: null,
        provisional: true
    });

    const DEFAULT_EVENT_STATE   = EVENT_STATES.REG_OPEN;
    const DEFAULT_VISITOR_STATE = VISITOR_STATES.LOGGED_OUT;

    // Expose to global CampusSprint namespace
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Config = {
        EVENT_STATES,
        EVENT_STATE_META,
        VISITOR_STATES,
        VISITOR_STATE_META,
        STORAGE_KEYS,
        PROVISIONAL_CONFIG,
        SUBMISSION_CONFIG,
        DEFAULT_EVENT_STATE,
        DEFAULT_VISITOR_STATE
    };

})(window);

