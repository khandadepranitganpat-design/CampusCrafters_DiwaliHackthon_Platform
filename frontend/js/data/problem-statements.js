/* ==========================================================================
   CampusSprint Mock Data — Problem Statements
   DEMO DATA ONLY. Not official or approved problem statements.
   ========================================================================== */
(function(global) {
    'use strict';

    const PROBLEM_STATEMENTS = [
        {
            id: 'ps-ft-01',
            trackId: 'fintech',
            title: 'Campus UPI Split — Simplify Group Expense Sharing',
            description: 'College students regularly split costs for food, travel, accommodation, and supplies. Current apps are either too complex or not localized. Build a lightweight web or mobile tool that simplifies expense splitting using UPI payment links, with no backend account required.',
            difficulty: 'Intermediate',
            domain: 'Payments & Consumer Finance',
            tags: ['UPI', 'Expense Sharing', 'Mobile', 'Students'],
            evaluationCriteria: [
                'Accuracy of split calculations',
                'Ease of generating and sharing payment links',
                'User experience for non-technical users',
                'Handling of edge cases (unequal splits, partial payments)'
            ],
            expectedDeliverables: [
                'Working web or PWA demo',
                'GitHub repository with README',
                'Short recorded demo video (max 3 minutes)'
            ]
        },
        {
            id: 'ps-ft-02',
            trackId: 'fintech',
            title: 'MicroSave — Behavioral Nudge Savings Tool',
            description: 'Many students struggle to save even small amounts. Design and build a tool that tracks discretionary spending patterns and surfaces personalized behavioral nudges that encourage micro-savings — for example, "You spent ₹300 on snacks this week. Save ₹50?"',
            difficulty: 'Advanced',
            domain: 'Personal Finance & Behavioral Economics',
            tags: ['Savings', 'Behavioral Nudges', 'Dashboard', 'Data Visualization'],
            evaluationCriteria: [
                'Quality of nudge logic and personalization',
                'Visual clarity of spending summaries',
                'Motivation and engagement design',
                'Privacy approach (no real financial data required)'
            ],
            expectedDeliverables: [
                'Interactive demo with mock spending data',
                'GitHub repository',
                'Brief explanation of nudge strategy'
            ]
        },
        {
            id: 'ps-sg-01',
            trackId: 'social-good',
            title: 'CampusConnect — Peer Tutoring Matchmaking',
            description: 'Many students who struggle in a subject could benefit from peer tutoring, but finding available, willing tutors is hard. Build a platform that allows students to post tutoring requests and for skilled students to offer help, with a simple scheduling and rating system.',
            difficulty: 'Intermediate',
            domain: 'Education Technology',
            tags: ['Education', 'Peer Learning', 'Scheduling', 'Community'],
            evaluationCriteria: [
                'Match quality and filtering logic',
                'Scheduling UX',
                'Feedback and rating system',
                'Accessibility and ease of onboarding'
            ],
            expectedDeliverables: [
                'Working demo with mock user profiles',
                'GitHub repository',
                'Demo video or live walkthrough'
            ]
        },
        {
            id: 'ps-sg-02',
            trackId: 'social-good',
            title: 'GreenTrack — Campus Sustainability Dashboard',
            description: 'Colleges generate significant waste and carbon footprint. Build a dashboard that lets students log and track personal sustainability actions (e.g., skipping a meal tray, cycling instead of driving), aggregates campus-wide impact, and surfaces leaderboards to drive friendly competition.',
            difficulty: 'Beginner-Friendly',
            domain: 'Environment & Sustainability',
            tags: ['Sustainability', 'Gamification', 'Dashboard', 'Community'],
            evaluationCriteria: [
                'Clarity and accuracy of impact metrics',
                'Gamification effectiveness',
                'Ease of action logging',
                'Visual design and accessibility'
            ],
            expectedDeliverables: [
                'Working demo with sample data',
                'GitHub repository',
                'Impact calculation methodology explained'
            ]
        },
        {
            id: 'ps-w3-01',
            trackId: 'web3',
            title: 'ChainCred — On-Chain Student Credential Badge',
            description: 'Academic achievements and extracurricular participation are often hard to verify and share. Build a system where institutions (simulated in this demo) can issue cryptographically verifiable achievement badges as on-chain tokens, which students can share on their CampusCrafters profile or LinkedIn.',
            difficulty: 'Advanced',
            domain: 'Identity & Credentials',
            tags: ['NFT', 'Credentials', 'Identity', 'Smart Contracts'],
            evaluationCriteria: [
                'Correctness of on-chain issuance flow',
                'Verifiability without platform lock-in',
                'UX for students claiming and sharing credentials',
                'Gas efficiency considerations'
            ],
            expectedDeliverables: [
                'Smart contract deployed on a testnet',
                'Frontend demo for issuance and display',
                'GitHub repository with deployment instructions'
            ]
        },
        {
            id: 'ps-bg-01',
            trackId: 'beginner',
            title: 'MyFirstPortfolio — Personal Dev Portfolio Builder',
            description: 'Every developer needs a portfolio, but getting started is intimidating. Build a simple, guided portfolio builder that lets students enter their projects, skills, and social links, and generates a clean, shareable static portfolio page. No design skills required.',
            difficulty: 'Beginner',
            domain: 'Developer Tools & Personal Branding',
            tags: ['Portfolio', 'Static Site', 'Forms', 'Beginner'],
            evaluationCriteria: [
                'Ease of data entry and editing',
                'Quality and clarity of generated portfolio page',
                'Shareable output (link, downloadable HTML, or hosted demo)',
                'Creativity and personalization options'
            ],
            expectedDeliverables: [
                'Working form-to-page generator demo',
                'GitHub repository',
                'Example generated portfolio'
            ]
        }
    ];

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Data = global.CampusSprint.Data || {};
    global.CampusSprint.Data.problemStatements = PROBLEM_STATEMENTS;

})(window);

