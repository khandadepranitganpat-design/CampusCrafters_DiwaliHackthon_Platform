/* ==========================================================================
   CampusSprint Mock Data — Announcements
   DEMO DATA ONLY.
   ========================================================================== */
(function(global) {
    'use strict';

    const ANNOUNCEMENTS = [
        {
            id: 'ann-001',
            title: 'Registration is now open!',
            message: 'Campus Sprint 2026 registration is officially open. Head to your CampusCrafters dashboard to secure your spot. Only 150 team slots available — first come, first served.',
            category: 'registration',
            priority: 'high',
            timestamp: '2026-10-20T10:00:00+05:30',
            read: false
        },
        {
            id: 'ann-002',
            title: 'Team formation channels now live on Discord',
            message: 'Looking for teammates? Join the #team-formation channel on our Discord server. Introduce yourself, share your skills, and find your perfect team before registration closes.',
            category: 'community',
            priority: 'normal',
            timestamp: '2026-10-22T14:00:00+05:30',
            read: false
        },
        {
            id: 'ann-003',
            title: 'Problem statements unlock at kickoff — not before',
            message: 'Reminder: problem statements are locked until the kickoff ceremony on Nov 15 at 10:00 AM IST. You can browse tracks and themes on the platform, but specific problem statements will only appear once the event goes live.',
            category: 'event',
            priority: 'normal',
            timestamp: '2026-10-28T09:00:00+05:30',
            read: true
        },
        {
            id: 'ann-004',
            title: 'Submission portal opens 2 hours before deadline',
            message: 'The submission portal will open at 8:00 AM IST on Nov 16, 2 hours before the deadline. Submit your GitHub repository link and a 3-minute demo video. Late submissions will not be accepted.',
            category: 'submissions',
            priority: 'high',
            timestamp: '2026-11-01T10:00:00+05:30',
            read: false
        },
        {
            id: 'ann-005',
            title: 'Beginner Track workshop schedule released',
            message: 'Three guided beginner workshops will run during the hackathon: "Git Basics" (10:30 AM), "How to structure your project" (2:00 PM), and "Presenting your demo" (8:00 AM on Day 2). Links posted in the Beginner Discord channel.',
            category: 'beginner',
            priority: 'normal',
            timestamp: '2026-11-03T11:00:00+05:30',
            read: false
        }
    ];

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Data = global.CampusSprint.Data || {};
    global.CampusSprint.Data.announcements = ANNOUNCEMENTS;

})(window);

