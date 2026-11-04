-- ==============================================================================
-- CampusCrafters — Profile A: Production Foundation Seed
-- Run on initial production deployment.
-- NEVER seeds mock users, fake registrations, or sample submissions.
-- ==============================================================================

-- 1. Tracks
INSERT INTO tracks (id, name, short_description, detailed_description, accent_color, tags) VALUES
('fintech', 'FinTech', 'Reimagine how money moves, splits, and settles.', 'Build tools that make financial services smarter, faster, and more accessible for college campuses and micro-merchants.', '#2B50FF', '["Payments", "Budgeting", "UPI", "Lending"]'::jsonb),
('social-good', 'Social Good', 'Technology that lifts communities and solves local problems.', 'Create applications addressing education accessibility, campus mental health, sustainable living, and mutual aid.', '#10B981', '["Sustainability", "Civic Tech", "Mental Health", "Accessibility"]'::jsonb),
('web3', 'Web3 & Open Protocol', 'Decentralized applications and trustless coordination.', 'Explore distributed identity, verifiable credentials, micropayments, and community-driven protocols.', '#8B5CF6', '["Identity", "Smart Contracts", "Verifiable Credentials", "Zero Knowledge"]'::jsonb),
('beginner', 'Beginner Friendly', 'First-time builders welcome. High support, high impact.', 'Build focused utility tools for students, clubs, and universities with clean execution and thoughtful UX.', '#F59E0B', '["Student Utilities", "Productivity", "Community Tools"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Problem Statements
INSERT INTO problem_statements (id, track_id, title, description, difficulty, domain, tags, evaluation_criteria, expected_deliverables, is_active) VALUES
('ps-ft-01', 'fintech', 'Campus UPI Split — Simplify Group Expense Sharing', 'College students regularly split costs for meals, cab rides, and supplies. Build a streamlined web tool that lets students paste payment receipts, divide bills with custom proportions, and generate instant UPI intent payment links.', 'Intermediate', 'Payments & Consumer Finance', '["UPI", "Expense Sharing", "Students", "Mobile Web"]'::jsonb, '["Accuracy of split calculations", "Ease of UPI QR/Intent generation", "Mobile UX"]'::jsonb, '["Working web demo", "Clean source code", "Documentation"]'::jsonb, TRUE),
('ps-ft-02', 'fintech', 'Micro-Savings & College Budget Guard', 'Create an automated micro-savings tracker for students with irregular monthly allowances. Features spare-change roundups and predictive spending warnings.', 'Beginner', 'Personal Finance', '["Budgeting", "Savings", "Analytics"]'::jsonb, '["UX simplicity", "Actionable budget insights", "Data safety"]'::jsonb, '["Interactive prototype", "API specification"]'::jsonb, TRUE),
('ps-sg-01', 'social-good', 'Campus Food Surplus & Mess Redistribution', 'Bridge the gap between campus hostel mess surplus and local community shelters or hungry students. Build an alert dashboard with verified pickup time-slots.', 'Intermediate', 'Civic Tech & Sustainability', '["Zero Waste", "Community Relief", "Logistics"]'::jsonb, '["Real-time tracking", "Volunteer verification", "Simplicity"]'::jsonb, '["Working prototype", "Walkthrough video"]'::jsonb, TRUE),
('ps-sg-02', 'social-good', 'Peer-to-Peer Study Note Exchange & Accessibility', 'A collaborative accessible notes repository with screen-reader compatibility and automated multi-lingual audio summaries.', 'Beginner', 'Education & Inclusion', '["Accessibility", "Education", "Audio Summaries"]'::jsonb, '["WCAG compliance", "Content moderation", "Speed"]'::jsonb, '["Accessible web app", "Test report"]'::jsonb, TRUE),
('ps-w3-01', 'web3', 'Verifiable Campus Event & Skill Badges', 'Issue cryptographically verifiable attendance and hackathon achievement credentials that students can display on portfolios without vendor lock-in.', 'Advanced', 'Decentralized Identity', '["Verifiable Credentials", "Badges", "W3C Standards"]'::jsonb, '["Cryptographic verification", "Tamper resistance", "UX"]'::jsonb, '["Verification engine", "Verifier demo UI"]'::jsonb, TRUE),
('ps-bg-01', 'beginner', 'Club Event Central — One Calendar for Campus', 'Consolidate all university club announcements, workshop dates, and venue bookings into one synchronized student calendar.', 'Beginner', 'Campus Life', '["Calendar", "Student Clubs", "Events"]'::jsonb, '["Clean UI", "iCal export", "Search & filter"]'::jsonb, '["Interactive web app", "Setup instructions"]'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Event Configuration
INSERT INTO event_config (key, value) VALUES
('event_state', '"reg_open"'::jsonb),
('label', '"Registration Open"'::jsonb),
('description', '"Registration is open. Secure your spot now."'::jsonb),
('cta_label', '"Register with CampusCrafters"'::jsonb),
('cta_enabled', 'true'::jsonb),
('min_team_size', '2'::jsonb),
('max_team_size', '5'::jsonb),
('allow_solo', 'false'::jsonb),
('allow_problem_change', 'true'::jsonb),
('submission_deadline_utc', 'null'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

