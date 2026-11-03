/**
 * Comprehensive Automated Test Suite for Phase 6: Participant Dashboard & Team Workspace
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

console.log('\n--- SECTION 1: Configuration & Provisional Event Specs ---');
const Config = sandbox.CampusSprint.Config;
assert(Config !== undefined, 'CampusSprint.Config is exposed');
assert(Config.STORAGE_KEYS.TEAMS_DYNAMIC === 'cs26_dynamic_teams', 'Storage key TEAMS_DYNAMIC is defined');
assert(Config.STORAGE_KEYS.TEAM_MEMBERSHIPS === 'cs26_team_memberships', 'Storage key TEAM_MEMBERSHIPS is defined');
assert(Config.STORAGE_KEYS.ANNOUNCEMENTS_READ === 'cs26_read_announcements', 'Storage key ANNOUNCEMENTS_READ is defined');
assert(Config.STORAGE_KEYS.PROFILE_EDITS === 'cs26_profile_edits', 'Storage key PROFILE_EDITS is defined');
assert(Config.PROVISIONAL_CONFIG !== undefined, 'PROVISIONAL_CONFIG is defined');
assert(Config.PROVISIONAL_CONFIG.minTeamSize === 2, 'PROVISIONAL_CONFIG.minTeamSize is 2');
assert(Config.PROVISIONAL_CONFIG.maxTeamSize === 5, 'PROVISIONAL_CONFIG.maxTeamSize is 5');
assert(Config.PROVISIONAL_CONFIG.supportEmail === 'support@campuscrafters.com', 'PROVISIONAL_CONFIG.supportEmail is configured');

console.log('\n--- SECTION 2: Teams Service (CampusSprint.Teams) ---');
const Teams = sandbox.CampusSprint.Teams;
assert(Teams !== undefined, 'CampusSprint.Teams is exposed');

// Initial seed
Teams.resetTeams();
const initialTeams = Teams.getTeams();
assert(Array.isArray(initialTeams) && initialTeams.length === 3, 'Teams seeded with 3 initial teams');
assert(Teams.getTeamById('team-001') !== null, 'getTeamById finds team-001 (CodeCatalysts)');
assert(Teams.getTeamByCode('cc-4f7k') !== null, 'getTeamByCode is case-insensitive (matches CC-4F7K)');

// getUserTeam for initial members
const p1Team = Teams.getUserTeam('p-001');
assert(p1Team !== null && p1Team.team.id === 'team-001', 'p-001 belongs to team-001');
assert(p1Team.isLeader === true, 'p-001 is identified as team leader');
assert(p1Team.memberCount === 3, 'team-001 has 3 members initially');

const p2Team = Teams.getUserTeam('p-002');
assert(p2Team !== null && p2Team.isLeader === false, 'p-002 is member, not leader');

// Create Team Validation
const duplicateCreate = Teams.createTeam('p-001', { name: 'New Team' });
assert(duplicateCreate.success === false, 'createTeam rejects user already in a team');

const shortNameCreate = Teams.createTeam('test-user-free', { name: 'No' });
assert(shortNameCreate.success === false, 'createTeam rejects names under 3 chars');

const validCreate = Teams.createTeam('test-user-new', { name: 'BinaryCrafters', trackId: 'web3' });
assert(validCreate.success === true, 'createTeam succeeds with valid parameters');
assert(validCreate.team.name === 'BinaryCrafters', 'New team name correctly stored');
assert(validCreate.team.leaderId === 'test-user-new', 'Creator set as team leader');
assert(validCreate.team.joinCode.startsWith('CS-'), 'Unique join code generated with CS- prefix');
assert(Teams.getUserTeam('test-user-new') !== null, 'New user is immediately mapped to created team');

// Join Team Validation
const joinNonExistent = Teams.joinTeam('hacker-joiner', 'INVALID-CODE');
assert(joinNonExistent.success === false, 'joinTeam rejects invalid join code');

const joinAlreadyInTeam = Teams.joinTeam('p-001', validCreate.team.joinCode);
assert(joinAlreadyInTeam.success === false, 'joinTeam rejects user already in another team');

const joinSuccess = Teams.joinTeam('hacker-joiner', validCreate.team.joinCode.toLowerCase());
assert(joinSuccess.success === true, 'joinTeam succeeds with case-insensitive code');

const updatedTeam = Teams.getTeamById(validCreate.team.id);
assert(updatedTeam.memberIds.includes('hacker-joiner'), 'New member present in team memberIds');

// Capacity Limit Test (max 5)
Teams.joinTeam('hacker-slot-3', validCreate.team.joinCode);
Teams.joinTeam('hacker-slot-4', validCreate.team.joinCode);
Teams.joinTeam('hacker-slot-5', validCreate.team.joinCode);
const atMax = Teams.getTeamById(validCreate.team.id);
assert(atMax.memberIds.length === 5, 'Team filled to max capacity of 5 members');

const joinExceedCapacity = Teams.joinTeam('hacker-slot-6', validCreate.team.joinCode);
assert(joinExceedCapacity.success === false, 'joinTeam rejects 6th member (exceeds max 5)');
assert(joinExceedCapacity.error.includes('maximum capacity'), 'Proper error message returned on capacity limit');

// Leadership Permissions: Regenerate Code
const nonLeaderRegen = Teams.regenerateJoinCode('hacker-joiner');
assert(nonLeaderRegen.success === false, 'regenerateJoinCode rejected for non-leader');

const oldCode = atMax.joinCode;
const leaderRegen = Teams.regenerateJoinCode('test-user-new');
assert(leaderRegen.success === true, 'regenerateJoinCode succeeds for team leader');
assert(leaderRegen.newCode !== oldCode, 'New join code differs from invalidated old code');
assert(Teams.getTeamByCode(oldCode) === null, 'Old join code no longer resolves');
assert(Teams.getTeamByCode(leaderRegen.newCode) !== null, 'New join code resolves successfully');

// Leadership Permissions: Remove Member
const nonLeaderRemove = Teams.removeMember('hacker-joiner', 'hacker-slot-3');
assert(nonLeaderRemove.success === false, 'removeMember rejected for non-leader');

const leaderRemoveSelf = Teams.removeMember('test-user-new', 'test-user-new');
assert(leaderRemoveSelf.success === false, 'leader cannot remove themselves via removeMember');

const leaderRemoveMember = Teams.removeMember('test-user-new', 'hacker-slot-3');
assert(leaderRemoveMember.success === true, 'leader successfully removes a team member');
assert(!Teams.getTeamById(validCreate.team.id).memberIds.includes('hacker-slot-3'), 'Removed member no longer in team memberIds');
assert(Teams.getUserTeam('hacker-slot-3') === null, 'Removed member membership mapping deleted');

// Leave Team
const leaderLeaveMulti = Teams.leaveTeam('test-user-new');
assert(leaderLeaveMulti.success === false, 'Leader cannot leave without transferring or disbanding while other members exist');

const memberLeave = Teams.leaveTeam('hacker-joiner');
assert(memberLeave.success === true, 'Regular member can leave team');
assert(Teams.getUserTeam('hacker-joiner') === null, 'Leaving member membership mapping deleted');

// Leadership Permissions: Disband Team
const nonLeaderDisband = Teams.disbandTeam('hacker-slot-4');
assert(nonLeaderDisband.success === false, 'disbandTeam rejected for non-leader');

const leaderDisband = Teams.disbandTeam('test-user-new');
assert(leaderDisband.success === true, 'leader successfully disbands team');
assert(Teams.getTeamById(validCreate.team.id) === null, 'Disbanded team removed from storage');
assert(Teams.getUserTeam('test-user-new') === null, 'Leader membership cleared');
assert(Teams.getUserTeam('hacker-slot-4') === null, 'Remaining members memberships cleared');

// Hydrated Team Verification
const hydrated = Teams.getHydratedTeam('team-001');
assert(hydrated !== null, 'getHydratedTeam successfully returns hydrated object');
assert(hydrated.members.length === 3, 'Hydrated team has 3 members');
const m1 = hydrated.members.find(m => m.id === 'p-001');
assert(m1 !== null && m1.displayName === 'Arjun Mehta', 'p-001 resolved with display name Arjun Mehta');
assert(m1.isLeader === true, 'p-001 member object flagged as leader');
assert(Array.isArray(m1.skills) && m1.skills.includes('React'), 'p-001 skills hydrated properly');

console.log('\n--- SECTION 3: Dashboard Service (CampusSprint.Dashboard) ---');
const Dashboard = sandbox.CampusSprint.Dashboard;
assert(Dashboard !== undefined, 'CampusSprint.Dashboard is exposed');

// User Profile Resolution
const p1Profile = Dashboard.getUserProfile('p-001');
assert(p1Profile !== null, 'getUserProfile resolves for p-001');
assert(p1Profile.displayName === 'Arjun Mehta', 'Profile displayName matches participant');
assert(Array.isArray(p1Profile.skills) && p1Profile.skills.length > 0, 'Profile skills resolved');
assert(p1Profile.avatarInitials === 'AM', 'Avatar initials computed correctly');

// Profile Editing & Persistence
const editRes = Dashboard.updateUserProfile('p-001', {
    bio: 'Updated bio for testing Phase 6.',
    skills: ['Rust', 'WebAssembly', 'Go', 'Docker'],
    year: 'Final Year'
});
assert(editRes.success === true, 'updateUserProfile succeeds');
assert(editRes.profile.bio === 'Updated bio for testing Phase 6.', 'Updated bio reflected in returned profile');
assert(editRes.profile.skills.includes('Rust'), 'Updated skills saved');
assert(editRes.profile.year === 'Final Year', 'Updated year saved');

const reloadProfile = Dashboard.getUserProfile('p-001');
assert(reloadProfile.bio === 'Updated bio for testing Phase 6.', 'Profile edits persisted across calls');

// Announcements Management
const annAll = Dashboard.getAnnouncements('all');
assert(annAll.totalCount === 5, '5 mock announcements loaded');
assert(annAll.unreadCount > 0, 'Unread announcements identified');

const firstAnn = annAll.list[0];
const initialRead = firstAnn.isRead;
Dashboard.toggleAnnouncementRead(firstAnn.id);
const toggledAnn = Dashboard.getAnnouncements('all').list.find(a => a.id === firstAnn.id);
assert(toggledAnn.isRead === !initialRead, 'toggleAnnouncementRead toggles read state');

Dashboard.markAllAnnouncementsRead();
const allReadRes = Dashboard.getAnnouncements('all');
assert(allReadRes.unreadCount === 0, 'markAllAnnouncementsRead marks all 5 read (unreadCount is 0)');

const filterReg = Dashboard.getAnnouncements('registration');
assert(filterReg.list.every(a => a.category === 'registration'), 'Category filter properly filters announcements');

console.log('\n--- SECTION 4: Regression Suites (Phase 3, 4, 5) ---');
// Verify Phase 3
const SM = sandbox.CampusSprint.stateManager;
assert(SM.getEventState() !== undefined, 'Phase 3 StateManager alive');
assert(sandbox.CampusSprint.Data.tracks.length === 4, 'Phase 3 Tracks intact');
assert(sandbox.CampusSprint.Data.problemStatements.length === 6, 'Phase 3 Problem statements intact');

// Verify Phase 4
const Auth = sandbox.CampusSprint.Auth;
assert(typeof Auth.login === 'function', 'Phase 4 AuthService alive');
const loginRes = Auth.login('arjun.m@student.example.edu', 'Hackathon2026!');
assert(loginRes.success === true, 'Phase 4 Login succeeds for seeded user');
assert(Auth.getCurrentUser().email === 'arjun.m@student.example.edu', 'Current user session set');

// Verify Phase 5 files exist
assert(fs.existsSync(path.join(baseDir, 'dashboard.html')), 'dashboard.html exists');
assert(fs.existsSync(path.join(baseDir, 'themes.html')), 'themes.html exists');
assert(fs.existsSync(path.join(baseDir, 'problem-statements.html')), 'problem-statements.html exists');
assert(fs.existsSync(path.join(baseDir, 'faq.html')), 'faq.html exists');

// Verify dashboard.html contents
const dashHtml = fs.readFileSync(path.join(baseDir, 'dashboard.html'), 'utf8');
assert(dashHtml.includes('dash-guard-logged-out'), 'dashboard.html contains logged-out auth guard');
assert(dashHtml.includes('dash-guard-unregistered'), 'dashboard.html contains unregistered auth guard');
assert(dashHtml.includes('tab-pane-overview'), 'dashboard.html contains Overview tab pane');
assert(dashHtml.includes('tab-pane-profile'), 'dashboard.html contains My Profile tab pane');
assert(dashHtml.includes('tab-pane-team'), 'dashboard.html contains My Team tab pane');
assert(dashHtml.includes('tab-pane-announcements'), 'dashboard.html contains Announcements tab pane');
assert(dashHtml.includes('tab-pane-event-info'), 'dashboard.html contains Event Info tab pane');
assert(dashHtml.includes('ticket-pass-modal'), 'dashboard.html contains Ticket Pass Modal');

console.log(`\n========================================`);
console.log(`Phase 6 Test Results: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
    process.exit(1);
}
