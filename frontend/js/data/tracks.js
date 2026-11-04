/* ==========================================================================
   CampusSprint Mock Data — Tracks
   DEMO DATA ONLY. Not official event data.
   ========================================================================== */
(function(global) {
    'use strict';

    const TRACKS = [
        {
            id: 'fintech',
            name: 'FinTech',
            shortDescription: 'Reimagine how money moves.',
            detailedDescription: 'Build tools that make financial services smarter, fairer, and more accessible. Think payments, budgeting, lending, micro-insurance, or financial literacy for underserved communities.',
            accentColor: '#2B50FF',
            textColor: '#FFF8EB',
            iconType: 'currency',
            tags: ['Payments', 'Budgeting', 'Lending', 'Micro-finance'],
            exampleThemes: [
                'P2P lending platform for students',
                'Expense splitting app with UPI integration',
                'Financial literacy game for first-year students',
                'Automated savings tool with behavioral nudges'
            ]
        },
        {
            id: 'social-good',
            name: 'Social Good',
            shortDescription: 'Use tech as a force for community impact.',
            detailedDescription: 'Tackle real problems in education, health, environment, or civic life. Projects should demonstrate meaningful potential benefit to a real community or group.',
            accentColor: '#FFF8EB',
            textColor: '#111111',
            iconType: 'users',
            tags: ['Education', 'Health', 'Environment', 'Civic Tech'],
            exampleThemes: [
                'Peer tutoring matchmaking platform',
                'Campus waste reduction tracker',
                'Mental health check-in tool for students',
                'Local volunteer coordination app'
            ]
        },
        {
            id: 'web3',
            name: 'Web3',
            shortDescription: 'Build the next layer of the internet.',
            detailedDescription: 'Explore decentralized applications, smart contracts, and the open web. Projects may use blockchain, DAOs, or decentralized storage — but must have a working demo.',
            accentColor: '#FFF8EB',
            textColor: '#111111',
            iconType: 'globe',
            tags: ['DeFi', 'NFTs', 'DAOs', 'Smart Contracts'],
            exampleThemes: [
                'On-chain student credential verification',
                'DAO-based student club governance tool',
                'Decentralized peer review system',
                'NFT-based hackathon achievement badge'
            ]
        },
        {
            id: 'beginner',
            name: 'Beginner',
            shortDescription: 'First hackathon? This track is made for you.',
            detailedDescription: 'A mentored, welcoming track for first-time hackers. Dedicated mentors, guided workshops, and relaxed judging criteria focused on learning and effort.',
            accentColor: '#FF5A3C',
            textColor: '#FFF8EB',
            iconType: 'flame',
            tags: ['Mentored', 'Guided', 'Any Skill Level'],
            exampleThemes: [
                'Personal portfolio website',
                'Simple quiz or trivia web app',
                'To-do list with a creative twist',
                'Campus event reminder bot'
            ]
        }
    ];

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Data = global.CampusSprint.Data || {};
    global.CampusSprint.Data.tracks = TRACKS;

})(window);

