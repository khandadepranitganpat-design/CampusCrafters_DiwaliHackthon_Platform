/**
 * Comprehensive Automated Test Suite for Phase 7: Problem Statement Selection & Project Submission
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = 'E:\\Hackathon\\New Design';

// Mock Browser Environment
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (k) => store[k] !== undefined ? store[k] : null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; },
        _dump: () => store
    };
})();

const mockDocument = {
    addEventListener: () => {},
    getElementById: (id) => ({
        id,
        classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
        style: {},
        value: '',
        textContent: '',
        innerHTML: '',
        addEventListener: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        setAttribute: () => {},
        getAttribute: () => null
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    body: { style: {} },
    readyState: 'complete'
};

const sandbox = {
    window: {},
    document: mockDocument,
    localStorage: mockLocalStorage,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    btoa: (str) => Buffer.from(str).toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString(),
    Date: Date,
    Math: Math,
    Array: Array,
    Object: Object,
    Set: Set,
    String: String,
    Number: Number,
    JSON: JSON
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);

function loadScript(relPath) {
    const fullPath = path.join(baseDir, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(code, sandbox);
}

// 1. Load Core & State
loadScript('js/utils/storage.js');
loadScript('js/state/state-config.js');
loadScript('js/state/state-manager.js');

// 2. Load Mock Datasets
loadScript('js/data/tracks.js');
loadScript('js/data/problem-statements.js');
loadScript('js/data/announcements.js');
loadScript('js/data/participants.js');
loadScript('js/data/teams.js');
loadScript('js/data/submissions.js');
loadScript('js/data/index.js');

// 3. Load Auth & Registration
loadScript('js/auth/auth-service.js');
loadScript('js/registration/registration-service.js');

// 4. Load Phase 6 Services
loadScript('js/teams/team-service.js');
loadScript('js/dashboard/dashboard-service.js');

// 5. Load Phase 7 Services
loadScript('js/submissions/problem-selection-service.js');
loadScript('js/submissions/submission-service.js');

// Test Assertions Runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        console.error(`  ✕ FAIL: ${message}`);
    }
}

console.log('\n--- SECTION 1: Configuration & Storage Keys ---');
const Config = sandbox.CampusSprint.Config;
assert(Config !== undefined, 'CampusSprint.Config is exposed');
assert(Config.STORAGE_KEYS.PROBLEM_SELECTIONS === 'cs26_problem_selections', 'PROBLEM_SELECTIONS storage key defined');
assert(Config.STORAGE_KEYS.PROJECT_SUBMISSIONS === 'cs26_project_submissions', 'PROJECT_SUBMISSIONS storage key defined');
assert(Config.SUBMISSION_CONFIG !== undefined, 'SUBMISSION_CONFIG is defined');
assert(Config.SUBMISSION_CONFIG.enabled === true, 'SUBMISSION_CONFIG.enabled is true');
assert(Config.SUBMISSION_CONFIG.allowProblemStatementChange === true, 'allowProblemStatementChange is true');
assert(Config.SUBMISSION_CONFIG.submissionDeadline === null, 'submissionDeadline is null (uninvented/provisional)');
assert(Config.SUBMISSION_CONFIG.provisional === true, 'SUBMISSION_CONFIG is flagged provisional');

console.log('\n--- SECTION 2: Problem Selection Service ---');
const ProblemSelection = sandbox.CampusSprint.ProblemSelection;
const Teams = sandbox.CampusSprint.Teams;
assert(ProblemSelection !== undefined, 'CampusSprint.ProblemSelection is exposed');

// Dataset check
const allStatements = ProblemSelection.getAvailableProblemStatements();
assert(Array.isArray(allStatements) && allStatements.length === 6, 'Reads existing 6 problem statements from Data');
assert(allStatements === sandbox.CampusSprint.Data.problemStatements, 'Directly reuses Phase 5 dataset without duplication');

// Reset to clean seed
ProblemSelection.resetSelections();
Teams.resetTeams();

// Initial team selection resolution
const team1Sel = ProblemSelection.getSelection('p-001');
assert(team1Sel !== null, 'p-001 (leader of team-001) resolves active selection');
assert(team1Sel.problemStatementId === 'ps-ft-01', 'team-001 has ps-ft-01 selected in seed');
assert(team1Sel.problemStatement !== null && team1Sel.problemStatement.title.includes('Campus UPI'), 'Problem statement details are hydrated');
assert(team1Sel.isLeader === true, 'p-001 flagged as team leader');
assert(team1Sel.canChange === true, 'Team leader can change problem statement');

const team1MemberSel = ProblemSelection.getSelection('p-002');
assert(team1MemberSel !== null, 'p-002 (member of team-001) resolves shared team selection');
assert(team1MemberSel.problemStatementId === 'ps-ft-01', 'p-002 sees same selection as leader');
assert(team1MemberSel.isLeader === false, 'p-002 flagged as regular member');
assert(team1MemberSel.canChange === false, 'Non-leader cannot change team problem statement');

// Permission test: non-leader cannot change
const nonLeaderChange = ProblemSelection.selectProblemStatement('p-002', 'ps-ft-02');
assert(nonLeaderChange.success === false, 'Non-leader selection attempt is rejected');
assert(nonLeaderChange.error.includes('team leader'), 'Returns clear permission error message');

// Invalid problem statement check
const invalidPsChange = ProblemSelection.selectProblemStatement('p-001', 'ps-non-existent');
assert(invalidPsChange.success === false, 'Invalid problem statement ID is rejected');

// Unregistered user check
const unregChange = ProblemSelection.selectProblemStatement('random-unreg-user', 'ps-ft-02');
assert(unregChange.success === false, 'Unregistered user cannot select problem statement');

// Leader valid change
const leaderChange = ProblemSelection.changeProblemStatement('p-001', 'ps-ft-02');
assert(leaderChange.success === true, 'Team leader can change problem statement');
assert(ProblemSelection.getSelection('p-001').problemStatementId === 'ps-ft-02', 'team-001 selection updated to ps-ft-02');
assert(ProblemSelection.getSelection('p-002').problemStatementId === 'ps-ft-02', 'All team members see updated selection immediately');

// Solo participation rule
// When allowSolo is false:
Config.PROVISIONAL_CONFIG.allowSolo = false;
const soloUserReject = ProblemSelection.selectProblemStatement('p-solo-test', 'ps-sg-01');
assert(soloUserReject.success === false, 'Solo selection rejected when allowSolo is false');

// Clear selection
const nonLeaderClear = ProblemSelection.clearSelection('p-002');
assert(nonLeaderClear.success === false, 'Non-leader cannot clear selection');

const leaderClear = ProblemSelection.clearSelection('p-001');
assert(leaderClear.success === true, 'Team leader can clear selection');
assert(ProblemSelection.getSelection('p-001') === null, 'Selection cleared successfully');

// Re-select for submission tests
ProblemSelection.selectProblemStatement('p-001', 'ps-ft-01');
assert(ProblemSelection.getSelection('p-001').problemStatementId === 'ps-ft-01', 'Re-selected ps-ft-01');

console.log('\n--- SECTION 3: Project Submission Service ---');
const Submissions = sandbox.CampusSprint.Submissions;
assert(Submissions !== undefined, 'CampusSprint.Submissions is exposed');

Submissions.resetSubmissions();

// Retrieve seeded submission
const subTeam1 = Submissions.getSubmission('p-001');
assert(subTeam1 !== null, 'p-001 resolves active submission for team-001');
assert(subTeam1.id === 'sub-001', 'Resolved sub-001 from seed');
assert(subTeam1.status === 'DRAFT', 'Initial seed status is DRAFT');
assert(subTeam1.problemStatement !== null, 'Problem statement is hydrated');

const subTeam1Member = Submissions.getSubmission('p-002');
assert(subTeam1Member !== null && subTeam1Member.id === 'sub-001', 'p-002 sees shared team submission');

// Permission test: non-leader cannot edit draft
const memberPerm = Submissions.canEditSubmission('p-002');
assert(memberPerm.canEdit === false, 'Non-leader member cannot edit submission');
assert(memberPerm.reason.includes('team leader'), 'Clear explanation provided for non-leader');

const leaderPerm = Submissions.canEditSubmission('p-001');
assert(leaderPerm.canEdit === true, 'Team leader can edit submission');

// Draft editing & updating
const updateDraftRes = Submissions.createOrUpdateDraft('p-001', {
    projectTitle: 'SplitEasy 2.0 — Instant UPI Splitter',
    shortDescription: 'Splits group campus dining bills with instant QR links.',
    detailedDescription: 'Full architectural documentation explaining how SplitEasy utilizes client-side math and dynamic UPI URI schemes for offline-first split payments.',
    repositoryUrl: 'https://github.com/codecatalysts/spliteasy-v2',
    demoUrl: 'https://spliteasy-v2.vercel.app',
    presentationUrl: 'https://loom.com/share/spliteasy-demo',
    techStack: ['React', 'TypeScript', 'TailwindCSS', 'Vite']
});
assert(updateDraftRes.success === true, 'Leader can update draft submission');
assert(updateDraftRes.submission.projectTitle === 'SplitEasy 2.0 — Instant UPI Splitter', 'Draft title updated');
assert(updateDraftRes.submission.techStack.includes('TypeScript'), 'Draft tech stack updated');
assert(updateDraftRes.submission.status === 'DRAFT', 'Saving draft preserves DRAFT status');

// Persistence check
const reloadedSub = Submissions.getSubmission('p-001');
assert(reloadedSub.projectTitle === 'SplitEasy 2.0 — Instant UPI Splitter', 'Draft updates persist across queries');

// Validation tests
const invalidValMissingTitle = Submissions.validateSubmission({
    problemStatementId: 'ps-ft-01',
    projectTitle: '',
    shortDescription: 'Valid short description text here.',
    detailedDescription: 'Detailed description with sufficient length for valid submission test.',
    repositoryUrl: 'https://github.com/team/repo',
    techStack: ['React']
});
assert(invalidValMissingTitle.isValid === false, 'Validation catches missing project title');
assert(invalidValMissingTitle.errors.projectTitle !== undefined, 'Error message generated for title');

const invalidValInsecureRepo = Submissions.validateSubmission({
    problemStatementId: 'ps-ft-01',
    projectTitle: 'Valid Project Title',
    shortDescription: 'Valid short description text here.',
    detailedDescription: 'Detailed description with sufficient length for valid submission test.',
    repositoryUrl: 'http://insecure-site.com/repo', // not https
    techStack: ['React']
});
assert(invalidValInsecureRepo.isValid === false, 'Validation rejects non-HTTPS repository URL');

const invalidValEmptyTech = Submissions.validateSubmission({
    problemStatementId: 'ps-ft-01',
    projectTitle: 'Valid Project Title',
    shortDescription: 'Valid short description text here.',
    detailedDescription: 'Detailed description with sufficient length for valid submission test.',
    repositoryUrl: 'https://github.com/team/repo',
    techStack: []
});
assert(invalidValEmptyTech.isValid === false, 'Validation catches empty tech stack');

const validVal = Submissions.validateSubmission(reloadedSub);
assert(validVal.isValid === true, 'Valid submission passes all validation rules');

// Non-leader cannot submit
const memberSubmit = Submissions.submitProject('p-002', reloadedSub);
assert(memberSubmit.success === false, 'Non-leader member cannot submit project');

// Leader submits project
const leaderSubmit = Submissions.submitProject('p-001', reloadedSub);
assert(leaderSubmit.success === true, 'Team leader successfully submits project');
assert(leaderSubmit.submission.status === 'SUBMITTED', 'Status updated to SUBMITTED');
assert(leaderSubmit.submission.submittedAt !== null, 'submittedAt timestamp recorded');

// Locked after submission check
assert(Submissions.getSubmissionStatus('p-001') === 'SUBMITTED', 'getSubmissionStatus reports SUBMITTED');
const postSubmitEditPerm = Submissions.canEditSubmission('p-001');
assert(postSubmitEditPerm.canEdit === false, 'Editing is locked after submission');

// Block changing problem statement after submission
const changeAfterSubmit = ProblemSelection.changeProblemStatement('p-001', 'ps-ft-02');
assert(changeAfterSubmit.success === false, 'Cannot change problem statement after project is submitted');
assert(changeAfterSubmit.error.includes('already been submitted'), 'Clear error returned on change attempt');

console.log('\n--- SECTION 4: Regression Suites (Phase 3, 4, 5, 6) ---');
// Phase 3
const SM = sandbox.CampusSprint.stateManager;
assert(SM.getEventState() !== undefined, 'Phase 3 StateManager alive');
assert(sandbox.CampusSprint.Data.tracks.length === 4, 'Phase 3 Tracks intact (4 tracks)');
assert(sandbox.CampusSprint.Data.problemStatements.length === 6, 'Phase 3 Problem statements intact (6 items)');

// Phase 4
const Auth = sandbox.CampusSprint.Auth;
assert(typeof Auth.login === 'function', 'Phase 4 AuthService functional');
const loginRes = Auth.login('arjun.m@student.example.edu', 'Hackathon2026!');
assert(loginRes.success === true, 'Phase 4 Login succeeds for seeded participant');

// Phase 5 Public Pages
assert(fs.existsSync(path.join(baseDir, 'themes.html')), 'themes.html intact');
assert(fs.existsSync(path.join(baseDir, 'problem-statements.html')), 'problem-statements.html intact');
assert(fs.existsSync(path.join(baseDir, 'faq.html')), 'faq.html intact');

// Phase 6 Teams & Dashboard
const Dashboard = sandbox.CampusSprint.Dashboard;
assert(typeof Dashboard.getUserProfile === 'function', 'Dashboard service functional');
assert(typeof Teams.getUserTeam === 'function', 'Teams service functional');

// Verify dashboard.html contains Phase 7 tabs and modals
const dashHtml = fs.readFileSync(path.join(baseDir, 'dashboard.html'), 'utf8');
assert(dashHtml.includes('tab-pane-problem-selection'), 'dashboard.html contains problem-selection pane');
assert(dashHtml.includes('tab-pane-project-submission'), 'dashboard.html contains project-submission pane');
assert(dashHtml.includes('ps-dash-detail-modal'), 'dashboard.html contains problem detail modal');
assert(dashHtml.includes('submission-review-modal'), 'dashboard.html contains submission review modal');
assert(dashHtml.includes('problem-selection-service.js'), 'dashboard.html loads problem-selection-service.js');
assert(dashHtml.includes('submission-service.js'), 'dashboard.html loads submission-service.js');

// Verify problem-statements.html integration
const psHtml = fs.readFileSync(path.join(baseDir, 'problem-statements.html'), 'utf8');
assert(psHtml.includes('ps-card-select-btn'), 'problem-statements.html contains Select card buttons');
assert(psHtml.includes('ps-modal-select-btn'), 'problem-statements.html contains Select modal button');
assert(psHtml.includes('dashboard.html?select='), 'problem-statements.html redirects registered users to dashboard selection');

console.log(`\n========================================`);
console.log(`Phase 7 Test Results: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
    process.exit(1);
}

