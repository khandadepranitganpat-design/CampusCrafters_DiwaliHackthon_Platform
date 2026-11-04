/* ==========================================================================
   CampusSprint Dashboard Controller
   Manages dashboard views, tab switching, auth guards, profile editing,
   team management interactions, problem selection, and project submissions.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config           = global.CampusSprint.Config;
    const Storage          = global.CampusSprint.Storage;
    const SM               = global.CampusSprint.stateManager;
    const Auth             = global.CampusSprint.Auth;
    const Registration     = global.CampusSprint.Registration;
    const Teams            = global.CampusSprint.Teams;
    const Dashboard        = global.CampusSprint.Dashboard;
    const ProblemSelection = global.CampusSprint.ProblemSelection;
    const Submissions      = global.CampusSprint.Submissions;

    let currentTab = 'overview';
    let currentAnnFilter = 'all';
    let psDashFilter = 'all';
    let profileSkills = [];
    let subTechStack = [];
    let autoSaveTimer = null;
    let selectedProblemInModal = null;

    // --- Tab Switching ---

    function switchTab(tabName) {
        currentTab = tabName;
        window.location.hash = tabName;

        // Update tab buttons
        document.querySelectorAll('.dash-tab-btn').forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === tabName;
            if (isActive) {
                btn.classList.add('bg-cobalt', 'text-cream');
                btn.classList.remove('bg-cream', 'text-ink');
            } else {
                btn.classList.remove('bg-cobalt', 'text-cream');
                btn.classList.add('bg-cream', 'text-ink');
            }
        });

        // Update content sections
        document.querySelectorAll('.dash-tab-pane').forEach(pane => {
            if (pane.id === 'tab-pane-' + tabName) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });

        // Trigger tab-specific refresh
        if (tabName === 'overview') renderOverview();
        if (tabName === 'profile') renderProfile();
        if (tabName === 'team') renderTeam();
        if (tabName === 'problem-selection') renderProblemSelection();
        if (tabName === 'project-submission') renderProjectSubmission();
        if (tabName === 'announcements') renderAnnouncements();
    }

    // --- Auth Guard & State Checker ---

    function getActiveUserId() {
        const user = Auth ? Auth.getCurrentUser() : null;
        return user ? user.id : null;
    }

    function checkAuthGuard() {
        if (!SM) return;
        const snapshot = SM.getSnapshot();
        const visitorState = snapshot.visitorState;

        const authGuardLoggedOut = document.getElementById('dash-guard-logged-out');
        const authGuardUnregistered = document.getElementById('dash-guard-unregistered');
        const dashMain = document.getElementById('dash-main-workspace');

        if (!dashMain) return;

        if (visitorState === Config.VISITOR_STATES.LOGGED_OUT) {
            dashMain.classList.add('hidden');
            if (authGuardUnregistered) authGuardUnregistered.classList.add('hidden');
            if (authGuardLoggedOut) authGuardLoggedOut.classList.remove('hidden');
            return false;
        }

        if (visitorState === Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED) {
            dashMain.classList.add('hidden');
            if (authGuardLoggedOut) authGuardLoggedOut.classList.add('hidden');
            if (authGuardUnregistered) {
                authGuardUnregistered.classList.remove('hidden');
                const user = Auth.getCurrentUser();
                const userSpan = document.getElementById('unregistered-user-name');
                if (userSpan && user) {
                    userSpan.textContent = user.displayName || user.email;
                }
            }
            return false;
        }

        // REGISTERED
        if (authGuardLoggedOut) authGuardLoggedOut.classList.add('hidden');
        if (authGuardUnregistered) authGuardUnregistered.classList.add('hidden');
        dashMain.classList.remove('hidden');

        return true;
    }

    // --- Renderers ---

    // 1. Overview Tab
    function renderOverview() {
        const userId = getActiveUserId();
        if (!userId) return;

        const profile = Dashboard.getUserProfile(userId);
        if (!profile) return;

        // Welcome banner
        const nameEl = document.getElementById('overview-user-name');
        if (nameEl) nameEl.textContent = profile.displayName;

        const regIdEl = document.getElementById('overview-reg-id');
        if (regIdEl) regIdEl.textContent = profile.registrationId;

        const trackBadgeEl = document.getElementById('overview-track-badge');
        if (trackBadgeEl) trackBadgeEl.textContent = profile.trackTitle;

        // Event State Box
        const eventStateEl = document.getElementById('overview-event-state');
        if (eventStateEl && SM) {
            const eState = SM.getEventState();
            const meta = Config.EVENT_STATE_META[eState];
            eventStateEl.textContent = meta ? meta.label : eState;
        }

        // Team Status Box
        const teamInfo = Teams ? Teams.getUserTeam(userId) : null;
        const teamStatusEl = document.getElementById('overview-team-status');
        const teamActionSubEl = document.getElementById('overview-team-subtext');
        if (teamStatusEl) {
            if (teamInfo && teamInfo.team) {
                teamStatusEl.textContent = teamInfo.team.name;
                if (teamActionSubEl) teamActionSubEl.textContent = `${teamInfo.memberCount} of 5 members • ${teamInfo.isLeader ? 'Leader' : 'Member'}`;
            } else {
                teamStatusEl.textContent = 'No Team Joined';
                if (teamActionSubEl) teamActionSubEl.textContent = 'Action Required: Create or join a team (2-5 members).';
            }
        }

        // Digital Ticket Card
        const ticketCodeEl = document.getElementById('overview-ticket-code');
        if (ticketCodeEl) ticketCodeEl.textContent = profile.ticketCode;

        const ticketNameEl = document.getElementById('overview-ticket-name');
        if (ticketNameEl) ticketNameEl.textContent = profile.displayName;

        const ticketTrackEl = document.getElementById('overview-ticket-track');
        if (ticketTrackEl) ticketTrackEl.textContent = profile.trackTitle;

        // Recent Announcements Widget (top 2)
        const annWidget = document.getElementById('overview-announcements-widget');
        if (annWidget) {
            const data = Dashboard.getAnnouncements('all');
            const topAnnouncements = (data.list || []).slice(0, 2);
            if (topAnnouncements.length === 0) {
                annWidget.innerHTML = '<p class="text-sm opacity-60 italic">No announcements posted yet.</p>';
            } else {
                annWidget.innerHTML = topAnnouncements.map(ann => `
                    <div class="p-3 border-2 border-ink ${ann.isRead ? 'bg-white' : 'bg-sun/30'} flex justify-between items-start gap-3">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 border border-ink ${ann.priority === 'high' ? 'bg-tomato text-white' : 'bg-cobalt text-cream'}">${ann.priority}</span>
                                <span class="text-xs font-bold opacity-60">${new Date(ann.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <h5 class="font-bricolage font-bold text-sm leading-tight text-ink">${escapeHtml(ann.title)}</h5>
                            <p class="text-xs mt-1 text-ink/80 line-clamp-1">${escapeHtml(ann.message)}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    // 2. Profile Tab
    function renderProfile() {
        const userId = getActiveUserId();
        if (!userId) return;

        const profile = Dashboard.getUserProfile(userId);
        if (!profile) return;

        // Editable fields
        const nameInput = document.getElementById('profile-name-input');
        if (nameInput) nameInput.value = profile.displayName;

        const bioInput = document.getElementById('profile-bio-input');
        if (bioInput) bioInput.value = profile.bio || '';

        const collegeInput = document.getElementById('profile-college-input');
        if (collegeInput) collegeInput.value = profile.college || '';

        const courseInput = document.getElementById('profile-course-input');
        if (courseInput) courseInput.value = profile.course || '';

        const yearInput = document.getElementById('profile-year-input');
        if (yearInput) yearInput.value = profile.year || '';

        // Read-only fields
        const emailEl = document.getElementById('profile-email-ro');
        if (emailEl) emailEl.textContent = profile.email || '—';

        const trackEl = document.getElementById('profile-track-ro');
        if (trackEl) trackEl.textContent = profile.trackTitle;

        const regIdEl = document.getElementById('profile-regid-ro');
        if (regIdEl) regIdEl.textContent = profile.registrationId;

        const ticketCodeEl = document.getElementById('profile-ticket-ro');
        if (ticketCodeEl) ticketCodeEl.textContent = profile.ticketCode;

        // Avatar
        const avatarEl = document.getElementById('profile-avatar-circle');
        if (avatarEl) {
            avatarEl.textContent = profile.avatarInitials;
            avatarEl.style.backgroundColor = profile.avatarColor || '#2B50FF';
        }

        // Skills Tags
        profileSkills = Array.isArray(profile.skills) ? profile.skills.slice() : [];
        renderSkillsTags();
    }

    function renderSkillsTags() {
        const container = document.getElementById('profile-skills-tags-container');
        if (!container) return;

        if (profileSkills.length === 0) {
            container.innerHTML = '<span class="text-xs opacity-60 italic">No skills added yet. Click suggestions below or type a skill.</span>';
            return;
        }

        container.innerHTML = profileSkills.map((skill, idx) => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cream border-2 border-ink text-xs font-bold">
                ${escapeHtml(skill)}
                <button type="button" class="remove-skill-btn hover:text-tomato font-black" data-idx="${idx}" aria-label="Remove skill ${escapeHtml(skill)}">×</button>
            </span>
        `).join('');

        container.querySelectorAll('.remove-skill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                profileSkills.splice(idx, 1);
                renderSkillsTags();
            });
        });
    }

    function addSkill(skillName) {
        const clean = (skillName || '').trim();
        if (!clean) return;
        if (!profileSkills.some(s => s.toLowerCase() === clean.toLowerCase())) {
            profileSkills.push(clean);
            renderSkillsTags();
        }
    }

    function handleProfileSave() {
        const userId = getActiveUserId();
        if (!userId) return;

        const nameInput = document.getElementById('profile-name-input');
        const bioInput = document.getElementById('profile-bio-input');
        const collegeInput = document.getElementById('profile-college-input');
        const courseInput = document.getElementById('profile-course-input');
        const yearInput = document.getElementById('profile-year-input');
        const statusMsg = document.getElementById('profile-save-status');

        const updates = {
            displayName: nameInput ? nameInput.value.trim() : '',
            bio: bioInput ? bioInput.value.trim() : '',
            college: collegeInput ? collegeInput.value.trim() : '',
            course: courseInput ? courseInput.value.trim() : '',
            year: yearInput ? yearInput.value.trim() : '',
            skills: profileSkills
        };

        const res = Dashboard.updateUserProfile(userId, updates);
        if (res.success) {
            if (statusMsg) {
                statusMsg.textContent = '✓ Profile saved successfully!';
                statusMsg.className = 'text-xs font-bold text-green-700 block';
                setTimeout(() => {
                    statusMsg.textContent = '';
                }, 3500);
            }
            renderOverview();
            renderProfile();
        } else {
            if (statusMsg) {
                statusMsg.textContent = '✕ Error saving profile: ' + res.error;
                statusMsg.className = 'text-xs font-bold text-tomato block';
            }
        }
    }

    // 3. Team Workspace Tab
    function renderTeam() {
        const userId = getActiveUserId();
        if (!userId) return;

        const userTeamInfo = Teams ? Teams.getUserTeam(userId) : null;
        const noTeamPane = document.getElementById('team-no-team-pane');
        const hasTeamPane = document.getElementById('team-has-team-pane');

        if (!userTeamInfo || !userTeamInfo.team) {
            if (noTeamPane) noTeamPane.classList.remove('hidden');
            if (hasTeamPane) hasTeamPane.classList.add('hidden');
            return;
        }

        if (noTeamPane) noTeamPane.classList.add('hidden');
        if (hasTeamPane) hasTeamPane.classList.remove('hidden');

        const team = Teams.getHydratedTeam(userTeamInfo.team.id);
        if (!team) return;

        const isLeader = team.leaderId === userId;

        const nameEl = document.getElementById('team-display-name');
        if (nameEl) nameEl.textContent = team.name;

        const trackBadgeEl = document.getElementById('team-track-badge');
        if (trackBadgeEl) trackBadgeEl.textContent = team.trackName || team.trackId;

        const memberCountEl = document.getElementById('team-member-count-badge');
        if (memberCountEl) memberCountEl.textContent = `${team.members.length} / ${team.maxMembers} Members`;

        const codeDisplay = document.getElementById('team-join-code-display');
        if (codeDisplay) codeDisplay.textContent = team.joinCode;

        const renameBtn = document.getElementById('team-rename-btn');
        if (renameBtn) renameBtn.style.display = isLeader ? 'inline-block' : 'none';

        const regenBtn = document.getElementById('team-regen-code-btn');
        if (regenBtn) regenBtn.style.display = isLeader ? 'inline-flex' : 'none';

        const disbandBtn = document.getElementById('team-disband-btn');
        if (disbandBtn) disbandBtn.style.display = isLeader ? 'inline-block' : 'none';

        const leaveBtn = document.getElementById('team-leave-btn');
        if (leaveBtn) leaveBtn.style.display = !isLeader ? 'inline-block' : 'none';

        // Member Roster Grid
        const rosterContainer = document.getElementById('team-roster-container');
        if (rosterContainer) {
            rosterContainer.innerHTML = team.members.map(member => `
                <div class="p-4 border-2 border-ink bg-white card-neo flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 border-2 border-ink font-bricolage font-bold text-cream flex items-center justify-center rounded-none shadow-[2px_2px_0_#111111]" style="background-color:${member.avatarColor || '#2B50FF'}">
                                ${member.avatarInitials || 'CC'}
                            </div>
                            <div class="overflow-hidden">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h4 class="font-bricolage font-bold text-base text-ink truncate">${escapeHtml(member.displayName)}</h4>
                                    ${member.isLeader ? '<span class="text-[10px] font-black uppercase tracking-wider bg-sun border border-ink px-1.5 py-0.5">👑 Leader</span>' : '<span class="text-[10px] font-bold uppercase tracking-wider bg-cream border border-ink px-1.5 py-0.5">Member</span>'}
                                </div>
                                <p class="text-xs text-ink/70 truncate">${escapeHtml(member.college)}</p>
                            </div>
                        </div>
                        <div class="mb-3 text-xs text-ink/80">
                            <div><span class="font-bold">Course:</span> ${escapeHtml(member.course || 'Undergraduate')}</div>
                            <div><span class="font-bold">Year:</span> ${escapeHtml(member.year || '3rd Year')}</div>
                        </div>
                        <div class="flex flex-wrap gap-1 mb-2">
                            ${(member.skills || []).map(s => `<span class="text-[11px] font-bold px-1.5 py-0.5 bg-cream border border-ink">${escapeHtml(s)}</span>`).join('')}
                        </div>
                    </div>
                    ${isLeader && !member.isLeader ? `
                        <div class="pt-3 border-t-2 border-ink/10 flex justify-end">
                            <button type="button" class="remove-member-btn text-xs font-bold text-tomato hover:underline" data-id="${member.id}" data-name="${escapeHtml(member.displayName)}">
                                Remove Member
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            rosterContainer.querySelectorAll('.remove-member-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mId = e.currentTarget.getAttribute('data-id');
                    const mName = e.currentTarget.getAttribute('data-name');
                    if (confirm(`Are you sure you want to remove ${mName} from the team?`)) {
                        const res = Teams.removeMember(userId, mId);
                        if (res.success) {
                            renderTeam();
                            renderOverview();
                        } else {
                            alert(res.error);
                        }
                    }
                });
            });
        }
    }

    // 4. Problem Statement Selection Tab
    function renderProblemSelection() {
        const userId = getActiveUserId();
        if (!userId || !ProblemSelection) return;

        const selection = ProblemSelection.getSelection(userId);
        const userTeamInfo = Teams ? Teams.getUserTeam(userId) : null;
        const rolePill = document.getElementById('ps-selection-role-pill');
        const activeContainer = document.getElementById('ps-active-selection-container');
        const grid = document.getElementById('ps-dash-grid');

        // Role indicator pill
        if (rolePill) {
            if (userTeamInfo && userTeamInfo.team) {
                if (userTeamInfo.isLeader) {
                    rolePill.innerHTML = '<span class="text-cobalt font-black">👑 Team Leader:</span> Full selection control';
                    rolePill.className = 'text-xs font-bold px-3 py-1 bg-sun/40 border-2 border-ink';
                } else {
                    rolePill.innerHTML = '<span class="text-ink/80 font-bold">👥 Team Member:</span> Viewing team selection';
                    rolePill.className = 'text-xs font-bold px-3 py-1 bg-cream border-2 border-ink';
                }
            } else {
                rolePill.innerHTML = '<span class="text-tomato font-black">Solo / No Team:</span> Team formation required';
                rolePill.className = 'text-xs font-bold px-3 py-1 bg-tomato/20 border-2 border-ink';
            }
        }

        // Active Selection Display
        if (activeContainer) {
            if (selection && selection.problemStatement) {
                const ps = selection.problemStatement;
                const canChange = selection.canChange;

                activeContainer.innerHTML = `
                    <div class="p-6 md:p-8 border-3 border-ink bg-white card-neo relative overflow-hidden">
                        <div class="absolute top-0 right-0 bg-sun border-b-2 border-l-2 border-ink px-4 py-1 text-xs font-black uppercase tracking-wider">
                            ✓ Currently Selected
                        </div>
                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                            <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-ink bg-cobalt text-cream">${escapeHtml(ps.trackId.toUpperCase().replace('-', ' '))}</span>
                            <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-ink bg-cream text-ink">${escapeHtml(ps.difficulty)}</span>
                            <span class="text-xs font-bold text-ink/60">${escapeHtml(ps.domain || '')}</span>
                        </div>
                        <h4 class="font-bricolage font-extrabold text-2xl md:text-3xl text-ink mb-3">${escapeHtml(ps.title)}</h4>
                        <p class="text-sm text-ink/85 leading-relaxed mb-4">${escapeHtml(ps.description)}</p>

                        <!-- Expected Deliverables snippet -->
                        <div class="p-4 border-2 border-ink bg-cream/40 mb-4">
                            <h5 class="font-bricolage font-bold text-xs uppercase tracking-wider text-ink mb-2">Key Expected Deliverables:</h5>
                            <ul class="text-xs space-y-1 list-disc list-inside text-ink/80">
                                ${(ps.expectedDeliverables || []).map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                            </ul>
                        </div>

                        <!-- Selection metadata and action buttons -->
                        <div class="pt-4 border-t-2 border-ink/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div class="text-xs text-ink/70">
                                ${selection.isTeam ? `<span>Selected for team <strong>${escapeHtml(userTeamInfo.team.name)}</strong> on ${new Date(selection.selectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</span>` : `<span>Selected on ${new Date(selection.selectedAt).toLocaleDateString('en-US')}.</span>`}
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" id="ps-open-submission-btn" class="btn-neo px-4 py-2 bg-cobalt text-cream font-bricolage font-bold text-xs border-2 border-ink">
                                    Open Project Submission →
                                </button>
                                ${canChange ? `
                                    <button type="button" id="ps-clear-selection-btn" class="btn-neo px-3 py-2 bg-cream hover:bg-tomato hover:text-white font-bricolage font-bold text-xs border-2 border-ink">
                                        Clear Selection
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;

                const openSubBtn = document.getElementById('ps-open-submission-btn');
                if (openSubBtn) {
                    openSubBtn.addEventListener('click', () => switchTab('project-submission'));
                }

                const clearBtn = document.getElementById('ps-clear-selection-btn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => {
                        if (confirm('Are you sure you want to clear your current problem statement selection?')) {
                            const res = ProblemSelection.clearSelection(userId);
                            if (res.success) {
                                renderProblemSelection();
                                renderProjectSubmission();
                            } else {
                                alert(res.error);
                            }
                        }
                    });
                }
            } else {
                // Empty State
                activeContainer.innerHTML = `
                    <div class="p-8 border-3 border-ink bg-white card-neo text-center">
                        <div class="w-14 h-14 bg-sun border-2 border-ink rounded-full mx-auto flex items-center justify-center text-2xl mb-3 shadow-[2px_2px_0_#111111]">
                            🎯
                        </div>
                        <h4 class="font-bricolage font-extrabold text-2xl text-ink mb-1">No Problem Statement Selected Yet</h4>
                        <p class="text-sm text-ink/70 max-w-md mx-auto mb-4">
                            Choose one official challenge problem below for your hackathon project. Your choice will be linked to your team workspace and project submission form.
                        </p>
                    </div>
                `;
            }
        }

        // Available Problem Statements Grid
        if (grid) {
            const allProblems = ProblemSelection.getAvailableProblemStatements();
            const filtered = psDashFilter === 'all'
                ? allProblems
                : allProblems.filter(p => p.trackId === psDashFilter);

            const currentSelectedId = selection ? selection.problemStatementId : null;
            const isLeaderOrSolo = selection ? selection.canChange : (userTeamInfo ? userTeamInfo.isLeader : false);

            grid.innerHTML = filtered.map(ps => {
                const isSelected = ps.id === currentSelectedId;
                return `
                    <div class="p-5 border-2 border-ink ${isSelected ? 'bg-sun/20 border-3' : 'bg-white'} card-neo flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start gap-2 mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-ink ${isSelected ? 'bg-sun text-ink' : 'bg-cream text-ink'}">
                                    ${escapeHtml(ps.trackId.toUpperCase().replace('-', ' '))}
                                </span>
                                <span class="text-xs font-bold border border-ink px-1.5 py-0.5 bg-white text-ink">
                                    ${escapeHtml(ps.difficulty)}
                                </span>
                            </div>
                            <h4 class="font-bricolage font-bold text-lg text-ink mb-1">${escapeHtml(ps.title)}</h4>
                            <p class="text-xs text-ink/60 mb-3">${escapeHtml(ps.domain || '')}</p>
                            <p class="text-xs text-ink/80 leading-relaxed line-clamp-3 mb-4">${escapeHtml(ps.description)}</p>
                        </div>
                        <div>
                            <div class="flex flex-wrap gap-1 mb-4">
                                ${(ps.tags || []).slice(0, 3).map(t => `<span class="text-[10px] font-bold px-1.5 py-0.5 bg-cream border border-ink">#${escapeHtml(t)}</span>`).join('')}
                            </div>
                            <div class="flex gap-2 pt-3 border-t-2 border-ink/10">
                                <button type="button" class="ps-view-details-btn btn-neo flex-1 px-3 py-2 bg-cream font-bricolage font-bold text-xs border-2 border-ink" data-id="${ps.id}">
                                    View Details
                                </button>
                                ${isSelected ? `
                                    <button type="button" disabled class="btn-neo flex-1 px-3 py-2 bg-green-600 text-white font-bricolage font-bold text-xs border-2 border-ink cursor-default">
                                        Selected ✓
                                    </button>
                                ` : `
                                    <button type="button" class="ps-select-btn btn-neo flex-1 px-3 py-2 bg-cobalt text-cream font-bricolage font-bold text-xs border-2 border-ink ${!isLeaderOrSolo ? 'opacity-60 cursor-not-allowed' : ''}" data-id="${ps.id}" ${!isLeaderOrSolo ? 'title="Only team leader can select"' : ''}>
                                        Select Problem 🎯
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Wire view details buttons
            grid.querySelectorAll('.ps-view-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const psId = e.currentTarget.getAttribute('data-id');
                    openProblemDetailsModal(psId);
                });
            });

            // Wire select problem buttons
            grid.querySelectorAll('.ps-select-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const psId = e.currentTarget.getAttribute('data-id');
                    handleProblemSelect(psId);
                });
            });
        }
    }

    function handleProblemSelect(psId) {
        const userId = getActiveUserId();
        if (!userId || !ProblemSelection) return;

        const currentSel = ProblemSelection.getSelection(userId);
        if (currentSel && currentSel.problemStatementId) {
            if (!confirm('You already have a problem statement selected. Changing your selection will update it for your entire team. Proceed?')) {
                return;
            }
        }

        const res = ProblemSelection.selectProblemStatement(userId, psId);
        if (res.success) {
            renderProblemSelection();
            renderProjectSubmission();
        } else {
            alert(res.error);
        }
    }

    // Modal: Problem Details (for dashboard)
    function setupProblemDetailsModal() {
        const modal = document.getElementById('ps-dash-detail-modal');
        const closeBtn = document.getElementById('ps-modal-close-btn');
        const cancelBtn = document.getElementById('ps-modal-cancel-btn');
        const selectBtn = document.getElementById('ps-modal-select-btn');
        const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;

        function closeModal() {
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
            selectedProblemInModal = null;
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);

        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                if (selectedProblemInModal) {
                    const id = selectedProblemInModal.id;
                    closeModal();
                    handleProblemSelect(id);
                }
            });
        }
    }

    function openProblemDetailsModal(psId) {
        if (!ProblemSelection) return;
        const ps = ProblemSelection.getProblemStatementById(psId);
        if (!ps) return;

        selectedProblemInModal = ps;
        const modal = document.getElementById('ps-dash-detail-modal');
        if (!modal) return;

        document.getElementById('ps-modal-title').textContent = ps.title;
        document.getElementById('ps-modal-track').textContent = ps.trackId.toUpperCase().replace('-', ' ');
        document.getElementById('ps-modal-diff').textContent = ps.difficulty;
        document.getElementById('ps-modal-domain').textContent = ps.domain || '';
        document.getElementById('ps-modal-desc').textContent = ps.description;

        const delList = document.getElementById('ps-modal-deliverables');
        delList.innerHTML = (ps.expectedDeliverables || []).map(d => `<li class="flex items-start gap-2"><span class="font-bold text-cobalt">▸</span> <span>${escapeHtml(d)}</span></li>`).join('');

        const critList = document.getElementById('ps-modal-criteria');
        critList.innerHTML = (ps.evaluationCriteria || []).map(c => `<li class="flex items-start gap-2"><span class="font-bold text-green-700">✓</span> <span>${escapeHtml(c)}</span></li>`).join('');

        const tagsBox = document.getElementById('ps-modal-tags');
        tagsBox.innerHTML = (ps.tags || []).map(t => `<span class="bg-white border border-ink text-[11px] font-bold px-2 py-0.5">#${escapeHtml(t)}</span>`).join('');

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // 5. Project Submission Tab
    function renderProjectSubmission() {
        const userId = getActiveUserId();
        if (!userId || !Submissions) return;

        const sub = Submissions.getSubmission(userId);
        const sel = ProblemSelection ? ProblemSelection.getSelection(userId) : null;
        const perm = Submissions.canEditSubmission(userId);
        const userTeamInfo = Teams ? Teams.getUserTeam(userId) : null;

        // Context Card
        const ctxCard = document.getElementById('submission-context-card');
        if (ctxCard) {
            if (sel && sel.problemStatement) {
                ctxCard.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-sun border-2 border-ink flex items-center justify-center font-bold text-lg shrink-0">
                            🎯
                        </div>
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-cobalt block">Target Problem Statement</span>
                            <h4 class="font-bricolage font-bold text-base text-ink">${escapeHtml(sel.problemStatement.title)}</h4>
                            <p class="text-xs text-ink/70">${escapeHtml(sel.problemStatement.domain || '')} • Track: ${escapeHtml(sel.problemStatement.trackId.toUpperCase())}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" id="sub-change-ps-btn" class="text-xs font-bold text-cobalt underline hover:text-tomato">
                            Change Problem Statement →
                        </button>
                    </div>
                `;
                const changePsBtn = document.getElementById('sub-change-ps-btn');
                if (changePsBtn) {
                    changePsBtn.addEventListener('click', () => switchTab('problem-selection'));
                }
            } else {
                ctxCard.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⚠️</span>
                        <div>
                            <h4 class="font-bricolage font-bold text-base text-tomato">No Problem Statement Selected Yet</h4>
                            <p class="text-xs text-ink/80">You must select a problem statement before submitting your project.</p>
                        </div>
                    </div>
                    <button type="button" id="sub-goto-ps-btn" class="btn-neo px-4 py-2 bg-cobalt text-cream font-bricolage font-bold text-xs border-2 border-ink">
                        Select Problem Statement →
                    </button>
                `;
                const gotoPsBtn = document.getElementById('sub-goto-ps-btn');
                if (gotoPsBtn) {
                    gotoPsBtn.addEventListener('click', () => switchTab('problem-selection'));
                }
            }
        }

        // Status Badge
        const statusBadge = document.getElementById('submission-status-badge');
        const draftStatus = document.getElementById('submission-draft-status');
        const lockedBanner = document.getElementById('submission-locked-banner');

        const currentStatus = sub ? sub.status : 'NOT_STARTED';

        if (statusBadge) {
            statusBadge.textContent = currentStatus;
            if (currentStatus === 'SUBMITTED') {
                statusBadge.className = 'px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-ink bg-green-500 text-white';
            } else if (currentStatus === 'DRAFT') {
                statusBadge.className = 'px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-ink bg-sun text-ink';
            } else {
                statusBadge.className = 'px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-ink bg-cream text-ink';
            }
        }

        if (lockedBanner) {
            if (currentStatus === 'SUBMITTED') {
                lockedBanner.classList.remove('hidden');
                document.getElementById('locked-sub-id').textContent = sub.id;
                document.getElementById('locked-sub-time').textContent = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Confirmed';
            } else {
                lockedBanner.classList.add('hidden');
            }
        }

        // Populate Form Fields
        const titleInput = document.getElementById('sub-project-title');
        const shortDescInput = document.getElementById('sub-short-desc');
        const detailDescInput = document.getElementById('sub-detail-desc');
        const repoInput = document.getElementById('sub-repo-url');
        const demoInput = document.getElementById('sub-demo-url');
        const presInput = document.getElementById('sub-pres-url');

        if (sub) {
            if (titleInput && !titleInput.matches(':focus')) titleInput.value = sub.projectTitle || '';
            if (shortDescInput && !shortDescInput.matches(':focus')) shortDescInput.value = sub.shortDescription || '';
            if (detailDescInput && !detailDescInput.matches(':focus')) detailDescInput.value = sub.detailedDescription || '';
            if (repoInput && !repoInput.matches(':focus')) repoInput.value = sub.repositoryUrl || '';
            if (demoInput && !demoInput.matches(':focus')) demoInput.value = sub.demoUrl || '';
            if (presInput && !presInput.matches(':focus')) presInput.value = sub.presentationUrl || '';
            subTechStack = Array.isArray(sub.techStack) ? sub.techStack.slice() : [];
        } else {
            subTechStack = ['React', 'Node.js', 'PostgreSQL'];
        }

        updateShortDescCounter();
        renderSubTechTags();

        // Permissions & Lockout Handling
        const isLocked = currentStatus === 'SUBMITTED' && (!Config.SUBMISSION_CONFIG || Config.SUBMISSION_CONFIG.allowResubmission !== true);
        const canEdit = perm.canEdit && !isLocked;

        const inputs = [titleInput, shortDescInput, detailDescInput, repoInput, demoInput, presInput, document.getElementById('sub-tech-input')];
        inputs.forEach(input => {
            if (input) {
                input.disabled = !canEdit;
                if (!canEdit) input.classList.add('bg-cream/40', 'cursor-not-allowed');
                else input.classList.remove('bg-cream/40', 'cursor-not-allowed');
            }
        });

        const saveBtn = document.getElementById('sub-save-draft-btn');
        const reviewBtn = document.getElementById('sub-review-btn');
        const addTechBtn = document.getElementById('sub-add-tech-btn');

        if (saveBtn) saveBtn.disabled = !canEdit;
        if (reviewBtn) reviewBtn.disabled = !canEdit;
        if (addTechBtn) addTechBtn.disabled = !canEdit;

        if (isLocked) {
            if (reviewBtn) {
                reviewBtn.textContent = 'Project Submitted ✓';
                reviewBtn.className = 'btn-neo px-7 py-3 border-2 border-ink bg-green-600 text-white font-bricolage font-bold text-base cursor-not-allowed opacity-80';
            }
        } else if (!perm.canEdit) {
            if (reviewBtn) {
                reviewBtn.textContent = 'Team Leader Only';
                reviewBtn.className = 'btn-neo px-7 py-3 border-2 border-ink bg-cream text-ink font-bricolage font-bold text-base cursor-not-allowed opacity-60';
                reviewBtn.title = perm.reason || '';
            }
        } else {
            if (reviewBtn) {
                reviewBtn.textContent = 'Review & Submit Project 🚀';
                reviewBtn.className = 'btn-neo px-7 py-3 border-2 border-ink bg-cobalt text-cream font-bricolage font-bold text-base';
            }
        }
    }

    function updateShortDescCounter() {
        const input = document.getElementById('sub-short-desc');
        const countSpan = document.getElementById('sub-short-desc-count');
        if (input && countSpan) {
            countSpan.textContent = `${input.value.length} / 250`;
        }
    }

    function renderSubTechTags() {
        const container = document.getElementById('sub-tech-tags-container');
        if (!container) return;

        if (subTechStack.length === 0) {
            container.innerHTML = '<span class="text-xs opacity-60 italic">No technologies added yet. Type or click suggestions below.</span>';
            return;
        }

        container.innerHTML = subTechStack.map((tech, idx) => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cream border-2 border-ink text-xs font-bold">
                ${escapeHtml(tech)}
                <button type="button" class="remove-sub-tech-btn hover:text-tomato font-black" data-idx="${idx}" aria-label="Remove ${escapeHtml(tech)}">×</button>
            </span>
        `).join('');

        container.querySelectorAll('.remove-sub-tech-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                subTechStack.splice(idx, 1);
                renderSubTechTags();
                triggerAutoSave();
            });
        });
    }

    function addSubTech(tech) {
        const clean = (tech || '').trim();
        if (!clean) return;
        if (!subTechStack.some(t => t.toLowerCase() === clean.toLowerCase())) {
            subTechStack.push(clean);
            renderSubTechTags();
            triggerAutoSave();
        }
    }

    function collectSubmissionFormData() {
        const titleInput = document.getElementById('sub-project-title');
        const shortDescInput = document.getElementById('sub-short-desc');
        const detailDescInput = document.getElementById('sub-detail-desc');
        const repoInput = document.getElementById('sub-repo-url');
        const demoInput = document.getElementById('sub-demo-url');
        const presInput = document.getElementById('sub-pres-url');

        return {
            projectTitle: titleInput ? titleInput.value.trim() : '',
            shortDescription: shortDescInput ? shortDescInput.value.trim() : '',
            detailedDescription: detailDescInput ? detailDescInput.value.trim() : '',
            repositoryUrl: repoInput ? repoInput.value.trim() : '',
            demoUrl: demoInput ? demoInput.value.trim() : '',
            presentationUrl: presInput ? presInput.value.trim() : '',
            techStack: subTechStack
        };
    }

    function triggerAutoSave() {
        const userId = getActiveUserId();
        if (!userId || !Submissions) return;

        const perm = Submissions.canEditSubmission(userId);
        if (!perm.canEdit) return;

        const statusEl = document.getElementById('submission-draft-status');
        if (statusEl) statusEl.textContent = 'Saving draft...';

        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            const data = collectSubmissionFormData();
            Submissions.createOrUpdateDraft(userId, data);
            if (statusEl) {
                statusEl.textContent = 'Draft auto-saved ✓';
                setTimeout(() => {
                    statusEl.textContent = '';
                }, 3000);
            }
        }, 800);
    }

    // Modal: Review & Confirmation
    function setupSubmissionReviewModal() {
        const modal = document.getElementById('submission-review-modal');
        const closeBtn = document.getElementById('sub-review-close-btn');
        const cancelBtn = document.getElementById('rev-cancel-btn');
        const confirmCheckbox = document.getElementById('rev-confirm-checkbox');
        const submitBtn = document.getElementById('rev-confirm-submit-btn');
        const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;

        function closeModal() {
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);

        if (confirmCheckbox && submitBtn) {
            confirmCheckbox.addEventListener('change', () => {
                submitBtn.disabled = !confirmCheckbox.checked;
                if (confirmCheckbox.checked) {
                    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const userId = getActiveUserId();
                if (!userId || !Submissions) return;

                const data = collectSubmissionFormData();
                const res = Submissions.submitProject(userId, data);
                if (res.success) {
                    closeModal();
                    renderProjectSubmission();
                    renderOverview();
                } else {
                    alert('Submission failed: ' + (res.error || 'Please fix highlighted errors.'));
                }
            });
        }
    }

    function openSubmissionReviewModal() {
        const userId = getActiveUserId();
        if (!userId || !Submissions) return;

        const data = collectSubmissionFormData();

        // Validate first
        const sel = ProblemSelection ? ProblemSelection.getSelection(userId) : null;
        if (!sel || !sel.problemStatementId) {
            alert('Please select a problem statement before submitting your project.');
            switchTab('problem-selection');
            return;
        }

        data.problemStatementId = sel.problemStatementId;
        const val = Submissions.validateSubmission(data);

        // Display/clear error labels
        displayFormErrors(val.errors || {});

        if (!val.isValid) {
            alert('Please fix all highlighted errors in the submission form before proceeding.');
            return;
        }

        // Populate Modal Fields
        document.getElementById('rev-project-title').textContent = data.projectTitle;
        document.getElementById('rev-problem-statement').textContent = sel.problemStatement ? sel.problemStatement.title : data.problemStatementId;

        const userTeamInfo = Teams ? Teams.getUserTeam(userId) : null;
        const profile = Dashboard ? Dashboard.getUserProfile(userId) : null;
        const submitterName = userTeamInfo && userTeamInfo.team ? `Team ${userTeamInfo.team.name}` : (profile ? profile.displayName : 'Hacker');
        document.getElementById('rev-submitter').textContent = submitterName;

        const techBox = document.getElementById('rev-tech-stack');
        techBox.innerHTML = (data.techStack || []).map(t => `<span class="bg-white border border-ink text-[11px] font-bold px-2 py-0.5">${escapeHtml(t)}</span>`).join('');

        const repoLink = document.getElementById('rev-repo-url');
        repoLink.textContent = data.repositoryUrl;
        repoLink.href = data.repositoryUrl;

        const demoSpan = document.getElementById('rev-demo-url');
        demoSpan.textContent = data.demoUrl || 'None provided';

        const checkbox = document.getElementById('rev-confirm-checkbox');
        const submitBtn = document.getElementById('rev-confirm-submit-btn');
        if (checkbox) checkbox.checked = false;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        const modal = document.getElementById('submission-review-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    function displayFormErrors(errors) {
        const fields = ['project-title', 'short-desc', 'detail-desc', 'tech-stack', 'repo-url', 'demo-url', 'pres-url'];
        fields.forEach(f => {
            const errEl = document.getElementById('err-' + f);
            if (errEl) {
                let key = f.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                if (key === 'repoUrl') key = 'repositoryUrl';
                if (key === 'presUrl') key = 'presentationUrl';

                if (errors[key]) {
                    errEl.textContent = errors[key];
                    errEl.classList.remove('hidden');
                } else {
                    errEl.textContent = '';
                    errEl.classList.add('hidden');
                }
            }
        });
    }

    // 6. Announcements Tab
    function renderAnnouncements() {
        const container = document.getElementById('announcements-list-container');
        const unreadBadge = document.getElementById('announcements-unread-badge');
        const filterBtns = document.querySelectorAll('.ann-filter-btn');

        filterBtns.forEach(btn => {
            const f = btn.getAttribute('data-filter');
            if (f === currentAnnFilter) {
                btn.classList.add('bg-cobalt', 'text-cream');
                btn.classList.remove('bg-cream', 'text-ink');
            } else {
                btn.classList.remove('bg-cobalt', 'text-cream');
                btn.classList.add('bg-cream', 'text-ink');
            }
        });

        const data = Dashboard.getAnnouncements(currentAnnFilter);
        if (unreadBadge) {
            unreadBadge.textContent = `${data.unreadCount} Unread`;
            unreadBadge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
        }

        if (!container) return;

        if (data.list.length === 0) {
            container.innerHTML = `
                <div class="p-8 border-2 border-ink bg-white text-center">
                    <p class="font-bricolage font-bold text-lg mb-1">No announcements in this category</p>
                    <p class="text-sm opacity-70">Check back later for updates from the organizing team.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.list.map(ann => `
            <div class="p-5 border-2 border-ink ${ann.isRead ? 'bg-white' : 'bg-sun/25'} card-neo flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-ink ${ann.priority === 'high' ? 'bg-tomato text-white' : 'bg-cobalt text-cream'}">
                            ${ann.priority}
                        </span>
                        <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-ink bg-cream text-ink">
                            ${ann.category}
                        </span>
                        <span class="text-xs font-bold opacity-60">
                            ${new Date(ann.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        ${!ann.isRead ? '<span class="w-2.5 h-2.5 rounded-full bg-tomato border border-ink" title="Unread"></span>' : ''}
                    </div>
                    <h4 class="font-bricolage font-bold text-lg text-ink mb-1">${escapeHtml(ann.title)}</h4>
                    <p class="text-sm text-ink/80 leading-relaxed">${escapeHtml(ann.message)}</p>
                </div>
                <div class="flex items-center gap-2 self-end md:self-center">
                    <button type="button" class="toggle-read-btn btn-neo text-xs font-bold px-3 py-1.5 border-2 border-ink bg-cream hover:bg-sun" data-id="${ann.id}">
                        ${ann.isRead ? 'Mark as Unread' : 'Mark as Read ✓'}
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.toggle-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const aId = e.currentTarget.getAttribute('data-id');
                Dashboard.toggleAnnouncementRead(aId);
                renderAnnouncements();
                renderOverview();
            });
        });
    }

    // --- Modal: Ticket Digital Pass ---

    function setupTicketModal() {
        const modal = document.getElementById('ticket-pass-modal');
        const openBtn = document.getElementById('open-ticket-pass-btn');
        const closeBtn = document.getElementById('ticket-pass-close-btn');
        const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;

        function openModal() {
            const userId = getActiveUserId();
            if (!userId) return;
            const profile = Dashboard.getUserProfile(userId);
            if (!profile) return;

            const nameEl = document.getElementById('modal-ticket-name');
            const collegeEl = document.getElementById('modal-ticket-college');
            const trackEl = document.getElementById('modal-ticket-track');
            const regIdEl = document.getElementById('modal-ticket-regid');
            const codeEl = document.getElementById('modal-ticket-code');
            const dateEl = document.getElementById('modal-ticket-date');

            if (nameEl) nameEl.textContent = profile.displayName;
            if (collegeEl) collegeEl.textContent = profile.college;
            if (trackEl) trackEl.textContent = profile.trackTitle;
            if (regIdEl) regIdEl.textContent = profile.registrationId;
            if (codeEl) codeEl.textContent = profile.ticketCode;
            if (dateEl) dateEl.textContent = new Date(profile.registeredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeModal() {
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        if (openBtn) openBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);
    }

    // --- Utilities ---

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- Wire Event Handlers ---

    function wireHandlers() {
        // Tab buttons
        document.querySelectorAll('.dash-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab');
                switchTab(target);
            });
        });

        // Quick action: Manage team
        const manageTeamQuickBtn = document.getElementById('quick-manage-team-btn');
        if (manageTeamQuickBtn) {
            manageTeamQuickBtn.addEventListener('click', () => switchTab('team'));
        }

        // Quick action: View all announcements
        const viewAllAnnBtn = document.getElementById('quick-view-all-ann-btn');
        if (viewAllAnnBtn) {
            viewAllAnnBtn.addEventListener('click', () => switchTab('announcements'));
        }

        // Profile: Add skill button
        const addSkillBtn = document.getElementById('profile-add-skill-btn');
        const skillInput = document.getElementById('profile-skill-input');
        if (addSkillBtn && skillInput) {
            addSkillBtn.addEventListener('click', () => {
                addSkill(skillInput.value);
                skillInput.value = '';
            });
            skillInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill(skillInput.value);
                    skillInput.value = '';
                }
            });
        }

        // Profile: Skill suggestion chips
        document.querySelectorAll('.skill-suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                addSkill(chip.getAttribute('data-skill'));
            });
        });

        // Profile: Save Changes
        const saveProfileBtn = document.getElementById('profile-save-btn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', handleProfileSave);
        }

        // Team: Create Team Form
        const createTeamForm = document.getElementById('team-create-form');
        const createTeamError = document.getElementById('team-create-error');
        if (createTeamForm) {
            createTeamForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const userId = getActiveUserId();
                if (!userId) return;

                const name = document.getElementById('team-create-name').value;
                const trackId = document.getElementById('team-create-track').value;

                const res = Teams.createTeam(userId, { name, trackId });
                if (res.success) {
                    if (createTeamError) createTeamError.classList.add('hidden');
                    renderTeam();
                    renderOverview();
                } else {
                    if (createTeamError) {
                        createTeamError.textContent = res.error;
                        createTeamError.classList.remove('hidden');
                    }
                }
            });
        }

        // Team: Join Team Form
        const joinTeamForm = document.getElementById('team-join-form');
        const joinTeamError = document.getElementById('team-join-error');
        if (joinTeamForm) {
            joinTeamForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const userId = getActiveUserId();
                if (!userId) return;

                const code = document.getElementById('team-join-code-input').value;
                const res = Teams.joinTeam(userId, code);
                if (res.success) {
                    if (joinTeamError) joinTeamError.classList.add('hidden');
                    renderTeam();
                    renderOverview();
                } else {
                    if (joinTeamError) {
                        joinTeamError.textContent = res.error;
                        joinTeamError.classList.remove('hidden');
                    }
                }
            });
        }

        // Team: Copy Join Code
        const copyCodeBtn = document.getElementById('team-copy-code-btn');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                const codeEl = document.getElementById('team-join-code-display');
                if (codeEl) {
                    const text = codeEl.textContent.trim();
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(text);
                    }
                    const oldText = copyCodeBtn.textContent;
                    copyCodeBtn.textContent = 'Copied! ✓';
                    setTimeout(() => {
                        copyCodeBtn.textContent = oldText;
                    }, 2000);
                }
            });
        }

        // Team: Regenerate Join Code
        const regenCodeBtn = document.getElementById('team-regen-code-btn');
        if (regenCodeBtn) {
            regenCodeBtn.addEventListener('click', () => {
                const userId = getActiveUserId();
                if (!userId) return;
                if (confirm('Regenerating your team invite code will immediately invalidate the previous code. Are you sure?')) {
                    const res = Teams.regenerateJoinCode(userId);
                    if (res.success) {
                        renderTeam();
                    } else {
                        alert(res.error);
                    }
                }
            });
        }

        // Team: Rename Team
        const renameBtn = document.getElementById('team-rename-btn');
        if (renameBtn) {
            renameBtn.addEventListener('click', () => {
                const userId = getActiveUserId();
                if (!userId) return;
                const currentName = document.getElementById('team-display-name').textContent;
                const newName = prompt('Enter new team name:', currentName);
                if (newName && newName.trim().length >= 3) {
                    const res = Teams.updateTeamName(userId, newName.trim());
                    if (res.success) {
                        renderTeam();
                        renderOverview();
                    } else {
                        alert(res.error);
                    }
                }
            });
        }

        // Team: Disband Team
        const disbandBtn = document.getElementById('team-disband-btn');
        if (disbandBtn) {
            disbandBtn.addEventListener('click', () => {
                const userId = getActiveUserId();
                if (!userId) return;
                if (confirm('Are you sure you want to DISBAND this team? All members will be removed and the join code will be permanently deleted.')) {
                    const res = Teams.disbandTeam(userId);
                    if (res.success) {
                        renderTeam();
                        renderOverview();
                    } else {
                        alert(res.error);
                    }
                }
            });
        }

        // Team: Leave Team
        const leaveBtn = document.getElementById('team-leave-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                const userId = getActiveUserId();
                if (!userId) return;
                if (confirm('Are you sure you want to leave your team? You will need an invite code to rejoin or join another team.')) {
                    const res = Teams.leaveTeam(userId);
                    if (res.success) {
                        renderTeam();
                        renderOverview();
                    } else {
                        alert(res.error);
                    }
                }
            });
        }

        // Problem Selection: Track Filter buttons
        document.querySelectorAll('.ps-dash-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                psDashFilter = btn.getAttribute('data-track') || 'all';
                document.querySelectorAll('.ps-dash-filter-btn').forEach(b => {
                    if (b === btn) {
                        b.classList.add('bg-cobalt', 'text-cream');
                        b.classList.remove('bg-cream', 'text-ink');
                    } else {
                        b.classList.remove('bg-cobalt', 'text-cream');
                        b.classList.add('bg-cream', 'text-ink');
                    }
                });
                renderProblemSelection();
            });
        });

        // Submission: Auto-save on form inputs
        const subInputs = ['sub-project-title', 'sub-short-desc', 'sub-detail-desc', 'sub-repo-url', 'sub-demo-url', 'sub-pres-url'];
        subInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    if (id === 'sub-short-desc') updateShortDescCounter();
                    triggerAutoSave();
                });
            }
        });

        // Submission: Tech stack add button
        const addTechBtn = document.getElementById('sub-add-tech-btn');
        const techInput = document.getElementById('sub-tech-input');
        if (addTechBtn && techInput) {
            addTechBtn.addEventListener('click', () => {
                addSubTech(techInput.value);
                techInput.value = '';
            });
            techInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubTech(techInput.value);
                    techInput.value = '';
                }
            });
        }

        // Submission: Tech stack suggestions
        document.querySelectorAll('.sub-tech-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                addSubTech(chip.getAttribute('data-tech'));
            });
        });

        // Submission: Manual Save Draft
        const manualSaveBtn = document.getElementById('sub-save-draft-btn');
        const manualSaveMsg = document.getElementById('sub-manual-save-msg');
        if (manualSaveBtn) {
            manualSaveBtn.addEventListener('click', () => {
                const userId = getActiveUserId();
                if (!userId || !Submissions) return;
                const data = collectSubmissionFormData();
                const res = Submissions.createOrUpdateDraft(userId, data);
                if (res.success) {
                    if (manualSaveMsg) {
                        manualSaveMsg.textContent = 'Draft saved successfully! ✓';
                        manualSaveMsg.className = 'text-xs font-bold text-green-700';
                        setTimeout(() => { manualSaveMsg.textContent = ''; }, 3000);
                    }
                    renderProjectSubmission();
                } else {
                    if (manualSaveMsg) {
                        manualSaveMsg.textContent = res.error || 'Error saving draft';
                        manualSaveMsg.className = 'text-xs font-bold text-tomato';
                    }
                }
            });
        }

        // Submission: Review & Submit
        const reviewBtn = document.getElementById('sub-review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', openSubmissionReviewModal);
        }

        // Announcements: Filter buttons
        document.querySelectorAll('.ann-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentAnnFilter = btn.getAttribute('data-filter') || 'all';
                renderAnnouncements();
            });
        });

        // Announcements: Mark all read
        const markAllReadBtn = document.getElementById('ann-mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                Dashboard.markAllAnnouncementsRead();
                renderAnnouncements();
                renderOverview();
            });
        }

        // Auth Guard Buttons
        const guardSignInBtn = document.getElementById('guard-signin-btn');
        const guardSignUpBtn = document.getElementById('guard-signup-btn');
        const guardCompleteRegBtn = document.getElementById('guard-complete-reg-btn');

        if (guardSignInBtn && global.CampusSprint.AuthModal) {
            guardSignInBtn.addEventListener('click', () => global.CampusSprint.AuthModal.open('login'));
        }
        if (guardSignUpBtn && global.CampusSprint.AuthModal) {
            guardSignUpBtn.addEventListener('click', () => global.CampusSprint.AuthModal.open('signup'));
        }
        if (guardCompleteRegBtn && global.CampusSprint.RegistrationStepper) {
            guardCompleteRegBtn.addEventListener('click', () => global.CampusSprint.RegistrationStepper.open());
        }

        setupTicketModal();
        setupProblemDetailsModal();
        setupSubmissionReviewModal();
    }

    // --- Initialization ---

    function init() {
        wireHandlers();

        // Check hash
        const initialHash = window.location.hash.replace('#', '');
        const validTabs = ['overview', 'profile', 'team', 'problem-selection', 'project-submission', 'announcements', 'event-info'];
        if (validTabs.includes(initialHash)) {
            currentTab = initialHash;
        }

        // Check query param e.g. ?select=ps-ft-01
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const selectId = urlParams.get('select');
            if (selectId) {
                currentTab = 'problem-selection';
                setTimeout(() => {
                    const userId = getActiveUserId();
                    if (userId && ProblemSelection) {
                        const targetPs = ProblemSelection.getProblemStatementById(selectId);
                        if (targetPs) {
                            openProblemDetailsModal(selectId);
                        }
                    }
                }, 300);
            }
        } catch (e) {}

        // Subscribe to State Manager updates
        if (SM) {
            SM.subscribe(() => {
                const ok = checkAuthGuard();
                if (ok) {
                    renderOverview();
                    renderProfile();
                    renderTeam();
                    renderProblemSelection();
                    renderProjectSubmission();
                    renderAnnouncements();
                }
            });
        }

        // Initial check and render
        const ok = checkAuthGuard();
        if (ok) {
            switchTab(currentTab);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
