/* ==========================================================================
   CampusSprint Mock Data — Submissions
   DEMO DATA ONLY. All URLs are nonfunctional example placeholders.
   ========================================================================== */
(function(global) {
    'use strict';

    const SUBMISSIONS = [
        {
            id: 'sub-001',
            teamId: 'team-001',
            problemStatementId: 'ps-ft-01',
            status: 'draft',
            projectTitle: 'SplitEasy — UPI Group Expense Tool',
            shortDescription: "A web app that lets students create shared expense groups, log costs, and generate UPI payment links for each participant's share with one click.",
            repositoryUrl: 'https://github.example.com/codecatalysts/spliteasy',
            demoUrl: 'https://spliteasy.example.dev',
            lastUpdated: '2026-11-03T20:00:00+05:30'
        },
        {
            id: 'sub-002',
            teamId: 'team-002',
            problemStatementId: 'ps-w3-01',
            status: 'draft',
            projectTitle: 'EduChain Badge Protocol',
            shortDescription: 'A smart contract system on the Polygon Mumbai testnet that allows colleges to issue tamper-proof achievement badges to students as soulbound tokens.',
            repositoryUrl: 'https://github.example.com/chaingang/educhain',
            demoUrl: 'https://educhain-demo.example.dev',
            lastUpdated: '2026-11-03T18:30:00+05:30'
        },
        {
            id: 'sub-003',
            teamId: 'team-003',
            problemStatementId: 'ps-sg-01',
            status: 'draft',
            projectTitle: 'PeerUp — Campus Tutoring Network',
            shortDescription: 'A matchmaking platform that connects students who need help in a subject with peer tutors who can teach it, with an integrated scheduling and review system.',
            repositoryUrl: 'https://github.example.com/impacthackers/peerup',
            demoUrl: 'https://peerup.example.dev',
            lastUpdated: '2026-11-03T21:00:00+05:30'
        }
    ];

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Data = global.CampusSprint.Data || {};
    global.CampusSprint.Data.submissions = SUBMISSIONS;

})(window);

