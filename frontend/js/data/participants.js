/* ==========================================================================
   CampusSprint Mock Data — Participants
   DEMO DATA ONLY. All names, emails, and details are fictional.
   ========================================================================== */
(function(global) {
    'use strict';

    const PARTICIPANTS = [
        {
            id: 'p-001',
            displayName: 'Arjun Mehta',
            emailPlaceholder: 'arjun.m@student.example.edu',
            college: '[COLLEGE]',
            skills: ['React', 'Node.js', 'PostgreSQL'],
            avatarInitials: 'AM',
            avatarColor: '#2B50FF'
        },
        {
            id: 'p-002',
            displayName: 'Priya Sharma',
            emailPlaceholder: 'priya.s@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Python', 'Machine Learning', 'Data Visualization'],
            avatarInitials: 'PS',
            avatarColor: '#FF5A3C'
        },
        {
            id: 'p-003',
            displayName: 'Karan Patel',
            emailPlaceholder: 'karan.p@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Solidity', 'Web3.js', 'Smart Contracts'],
            avatarInitials: 'KP',
            avatarColor: '#FFC83D'
        },
        {
            id: 'p-004',
            displayName: 'Sneha Nair',
            emailPlaceholder: 'sneha.n@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Figma', 'HTML/CSS', 'UX Research'],
            avatarInitials: 'SN',
            avatarColor: '#111111'
        },
        {
            id: 'p-005',
            displayName: 'Rohan Verma',
            emailPlaceholder: 'rohan.v@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Flutter', 'Firebase', 'UI Design'],
            avatarInitials: 'RV',
            avatarColor: '#2B50FF'
        },
        {
            id: 'p-006',
            displayName: 'Ananya Krishnan',
            emailPlaceholder: 'ananya.k@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Java', 'Spring Boot', 'MySQL'],
            avatarInitials: 'AK',
            avatarColor: '#FF5A3C'
        },
        {
            id: 'p-007',
            displayName: 'Dev Agarwal',
            emailPlaceholder: 'dev.a@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Python', 'Flask', 'APIs'],
            avatarInitials: 'DA',
            avatarColor: '#FFC83D'
        },
        {
            id: 'p-008',
            displayName: 'Meera Joshi',
            emailPlaceholder: 'meera.j@student.example.edu',
            college: '[COLLEGE]',
            skills: ['Vue.js', 'GraphQL', 'TailwindCSS'],
            avatarInitials: 'MJ',
            avatarColor: '#2B50FF'
        }
    ];

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Data = global.CampusSprint.Data || {};
    global.CampusSprint.Data.participants = PARTICIPANTS;

})(window);

