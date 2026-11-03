/* ==========================================================================
   CampusSprint Mock Data — Teams
   DEMO DATA ONLY. All data is fictional.
   ========================================================================== */
(function(global) {
    'use strict';

    const TEAMS = [
        {
            id: 'team-001',
            name: 'CodeCatalysts',
            joinCode: 'CC-4F7K',
            trackId: 'fintech',
            memberIds: ['p-001', 'p-002', 'p-004'],
            leaderId: 'p-001',
            createdAt: '2026-10-21T11:30:00+05:30',
            status: 'active'
        },
        {
            id: 'team-002',
            name: 'ChainGang',
            joinCode: 'CG-9R2M',
            trackId: 'web3',
            memberIds: ['p-003', 'p-007'],
            leaderId: 'p-003',
            createdAt: '2026-10-22T09:15:00+05:30',
            status: 'active'
        },
        {
            id: 'team-003',
            name: 'ImpactHackers',
            joinCode: 'IH-6T1N',
            trackId: 'social-good',
            memberIds: ['p-005', 'p-006', 'p-008'],
            leaderId: 'p-006',
            createdAt: '2026-10-23T14:00:00+05:30',
            status: 'active'
        }
    ];

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Data = global.CampusSprint.Data || {};
    global.CampusSprint.Data.teams = TEAMS;

})(window);

