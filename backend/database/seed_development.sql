-- ==============================================================================
-- CampusCrafters — Profile B: Development & Demo Seed
-- Strictly executes in local development or staging.
-- Seeds mock participants, registrations, teams, selections, drafts, announcements.
-- ==============================================================================

-- 1. Users (p-001 .. p-008, u-demo-unreg, u-admin-01)
INSERT INTO users (id, email, display_name, college, course, year, phone, bio, skills, roles, password_hash, created_at) VALUES
('p-001', 'arjun.m@student.example.edu', 'Arjun Mehta', 'Apex Institute of Technology', 'B.Tech Computer Science', '3rd Year', '+91 98765 43210', 'Full-stack developer building clean fintech tools.', '["React", "Node.js", "PostgreSQL", "Docker"]'::jsonb, '{"participant", "judge"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T04:00:00Z'),
('p-002', 'riya.s@student.example.edu', 'Riya Sharma', 'Apex Institute of Technology', 'B.Tech Computer Science', '3rd Year', '+91 98765 43211', 'Product designer and frontend engineer.', '["Figma", "Tailwind CSS", "React", "UI/UX"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T04:15:00Z'),
('p-003', 'kavya.n@student.example.edu', 'Kavya Nair', 'Apex Institute of Technology', 'B.Tech Information Technology', '4th Year', '+91 98765 43212', 'Backend specialist, distributed systems nerd.', '["Python", "Flask", "FastAPI", "PostgreSQL", "Redis"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T04:30:00Z'),
('p-004', 'dev.p@student.example.edu', 'Dev Patel', 'Apex Institute of Technology', 'B.Tech Computer Science', '2nd Year', '+91 98765 43213', 'Data pipelines, machine learning, and clean code enthusiast.', '["Python", "Pandas", "Scikit-Learn", "SQL"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T05:00:00Z'),
('p-005', 'ananya.d@student.example.edu', 'Ananya Desai', 'Apex Institute of Technology', 'B.Tech Electronics', '3rd Year', '+91 98765 43214', 'Hardware-software integration and mobile developer.', '["Flutter", "Dart", "Firebase", "C++"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T05:15:00Z'),
('p-006', 'taran.k@student.example.edu', 'Taranpreet Kaur', 'Apex Institute of Technology', 'B.Tech Computer Science', '4th Year', '+91 98765 43215', 'Security, privacy, and smart contract development.', '["Solidity", "Rust", "TypeScript", "Next.js"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T05:30:00Z'),
('p-007', 'sameer.j@student.example.edu', 'Sameer Joshi', 'Apex Institute of Technology', 'B.Tech IT', '3rd Year', '+91 98765 43216', 'DevOps, infrastructure as code, and cloud automation.', '["AWS", "Docker", "Terraform", "GitHub Actions"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T06:00:00Z'),
('p-008', 'neha.v@student.example.edu', 'Neha Verma', 'Apex Institute of Technology', 'B.Tech Computer Science', '2nd Year', '+91 98765 43217', 'Creative technologist, creative UI, accessibility advocate.', '["JavaScript", "HTML/CSS", "Accessibility", "Tailwind CSS"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T06:30:00Z'),
('u-demo-unreg', 'demo.unregistered@student.example.edu', 'Demo Visitor', 'Apex Institute of Technology', 'B.Tech General', '1st Year', '+91 98765 00000', 'Exploring hackathon platform.', '["Python"]'::jsonb, '{"participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-20T07:00:00Z'),
('u-admin-01', 'admin@campuscrafters.com', 'Platform Administrator', 'CampusCrafters HQ', 'Admin', 'Staff', '+91 90000 00001', 'Lead administrator for Diwali Hackathon 2026.', '["DevOps", "Management"]'::jsonb, '{"admin", "judge", "participant"}', 'scrypt:32768:8:1$placeholder$devhash', '2026-10-15T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 2. Registrations
INSERT INTO registrations (id, user_id, ticket_code, track_id, experience, interests, rules_accepted, status, registered_at) VALUES
('REG-2026-0001', 'p-001', 'CS26-4F7K-9M2A', 'fintech', 'intermediate', '["FinTech", "Distributed Systems"]'::jsonb, TRUE, 'confirmed', '2026-10-20T05:00:00Z'),
('REG-2026-0002', 'p-002', 'CS26-7B8N-3C4D', 'fintech', 'intermediate', '["FinTech", "Design"]'::jsonb, TRUE, 'confirmed', '2026-10-20T05:15:00Z'),
('REG-2026-0003', 'p-003', 'CS26-1X2Y-5Z6W', 'web3', 'advanced', '["Web3", "Distributed Systems"]'::jsonb, TRUE, 'confirmed', '2026-10-20T05:30:00Z'),
('REG-2026-0004', 'p-004', 'CS26-8K9L-2M3N', 'fintech', 'intermediate', '["FinTech", "Analytics"]'::jsonb, TRUE, 'confirmed', '2026-10-20T05:45:00Z'),
('REG-2026-0005', 'p-005', 'CS26-3P4Q-7R8S', 'social-good', 'intermediate', '["Social Good", "Mobile"]'::jsonb, TRUE, 'confirmed', '2026-10-20T06:00:00Z'),
('REG-2026-0006', 'p-006', 'CS26-9T0U-1V2W', 'social-good', 'advanced', '["Social Good", "Security"]'::jsonb, TRUE, 'confirmed', '2026-10-20T06:15:00Z'),
('REG-2026-0007', 'p-007', 'CS26-5E6F-9G0H', 'web3', 'advanced', '["Web3", "Cloud"]'::jsonb, TRUE, 'confirmed', '2026-10-20T06:30:00Z'),
('REG-2026-0008', 'p-008', 'CS26-2J3K-6L7M', 'social-good', 'beginner', '["Social Good", "UI/UX"]'::jsonb, TRUE, 'confirmed', '2026-10-20T06:45:00Z')
ON CONFLICT (id) DO NOTHING;

-- 3. Teams
INSERT INTO teams (id, name, join_code, track_id, leader_id, status, created_at) VALUES
('team-001', 'CodeCatalysts', 'CC-4F7K', 'fintech', 'p-001', 'active', '2026-10-21T06:00:00Z'),
('team-002', 'ChainGuardians', 'CG-9R2M', 'web3', 'p-003', 'active', '2026-10-22T03:45:00Z'),
('team-003', 'ImpactHacks', 'IH-6T1N', 'social-good', 'p-006', 'active', '2026-10-23T08:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- 4. Team Memberships
INSERT INTO team_memberships (team_id, user_id, joined_at) VALUES
('team-001', 'p-001', '2026-10-21T06:00:00Z'),
('team-001', 'p-002', '2026-10-21T06:15:00Z'),
('team-001', 'p-004', '2026-10-21T06:30:00Z'),
('team-002', 'p-003', '2026-10-22T03:45:00Z'),
('team-002', 'p-007', '2026-10-22T04:00:00Z'),
('team-003', 'p-005', '2026-10-23T08:30:00Z'),
('team-003', 'p-006', '2026-10-23T08:30:00Z'),
('team-003', 'p-008', '2026-10-23T08:45:00Z')
ON CONFLICT (user_id) DO NOTHING;

-- 5. Problem Selections
INSERT INTO problem_selections (team_id, problem_statement_id, selected_by, selected_at) VALUES
('team-001', 'ps-ft-01', 'p-001', '2026-10-21T06:30:00Z'),
('team-002', 'ps-w3-01', 'p-003', '2026-10-22T04:30:00Z'),
('team-003', 'ps-sg-01', 'p-006', '2026-10-23T09:00:00Z')
ON CONFLICT (team_id) DO NOTHING;

-- 6. Submissions
INSERT INTO project_submissions (id, team_id, problem_statement_id, project_title, short_description, detailed_description, repository_url, demo_url, presentation_url, tech_stack, status, created_at, updated_at) VALUES
('sub-001', 'team-001', 'ps-ft-01', 'SplitEasy — UPI Group Expense Tool', 'A web app that simplifies expense sharing with one-click UPI links.', 'College students regularly split costs for meals and cab rides. SplitEasy lets students paste receipts, calculates exact shares, and generates instant UPI intent deep links for direct mobile payments.', 'https://github.example.com/codecatalysts/spliteasy', 'https://spliteasy.example.dev', '', '["React", "Flask", "PostgreSQL"]'::jsonb, 'DRAFT', '2026-10-21T07:00:00Z', '2026-10-21T07:00:00Z'),
('sub-002', 'team-002', 'ps-w3-01', 'ProofBadge — Verifiable Campus Credentials', 'Cryptographically verifiable event attendance badges on public open standards.', 'Decentralized verifiable credential issuer allowing universities and student chapters to issue tamper-evident digital certificates directly to student wallets.', 'https://github.example.com/chainguardians/proofbadge', 'https://proofbadge.example.dev', '', '["Solidity", "TypeScript", "Next.js"]'::jsonb, 'DRAFT', '2026-10-22T05:00:00Z', '2026-10-22T05:00:00Z'),
('sub-003', 'team-003', 'ps-sg-01', 'MessRescue — Campus Food Redistribution', 'Connecting hostel kitchen surplus with community shelters before food goes to waste.', 'Real-time dispatch system allowing mess supervisors to broadcast daily excess food quantities with temperature and preparation timestamps, matched automatically with nearby verified pickup volunteers.', 'https://github.example.com/impacthacks/messrescue', 'https://messrescue.example.dev', '', '["Flutter", "Firebase", "Python"]'::jsonb, 'DRAFT', '2026-10-23T10:00:00Z', '2026-10-23T10:00:00Z')
ON CONFLICT (team_id) DO NOTHING;

-- 7. Announcements
INSERT INTO announcements (id, title, message, category, priority, created_at) VALUES
('ann-001', 'Welcome to Campus Sprint 2026!', 'Registration is officially open! Form teams of 2 to 5 members and select your challenge statement.', 'registration', 'high', '2026-10-20T04:30:00Z'),
('ann-002', 'Problem Statements Released', 'All challenge statements for FinTech, Social Good, Web3, and Beginner tracks are live. Check the problem directory.', 'event', 'normal', '2026-10-21T02:00:00Z'),
('ann-003', 'Join the Discord Community', 'Hop into our Discord server to connect with mentors, find teammates, and ask organizers questions in real-time.', 'community', 'normal', '2026-10-21T10:00:00Z'),
('ann-004', 'Beginner Track Workshop', 'First-time builders! Join our kickstart workshop tomorrow covering Git basics, API wiring, and project pitching.', 'beginner', 'normal', '2026-10-22T08:00:00Z'),
('ann-005', 'Submission Guidelines Published', 'Final submissions require a public HTTPS repository, demo link, and complete project descriptions. Read the submission checklist.', 'submissions', 'high', '2026-10-23T06:00:00Z')
ON CONFLICT (id) DO NOTHING;

