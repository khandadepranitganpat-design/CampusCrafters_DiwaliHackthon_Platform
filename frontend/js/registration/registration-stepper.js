/* ==========================================================================
   CampusSprint Neo-Brutalist Registration Stepper Modal (5 Steps)
   Interactive multi-step wizard integrated with CampusSprint state & storage.
   ========================================================================== */
(function(global) {
    'use strict';

    const Auth = global.CampusSprint.Auth;
    const RegService = global.CampusSprint.Registration;
    const SM = global.CampusSprint.stateManager;
    const Config = global.CampusSprint.Config;

    let stepperModalEl = null;
    let currentStep = 1;
    let lastActiveElement = null;

    // Default form state
    let formData = {
        fullName: '',
        email: '',
        college: '',
        course: '',
        year: '2nd Year',
        phone: '',
        skills: ['React', 'Node.js'],
        interests: ['FinTech & Payments'],
        bio: '',
        experience: 'first_time',
        trackId: 'fintech',
        rulesAccepted: false
    };

    // Predefined skill & interest chip suggestions
    const AVAILABLE_SKILLS = [
        'React', 'Node.js', 'Python', 'Flutter', 'Machine Learning',
        'Solidity', 'UI/UX Design', 'SQL', 'FastAPI', 'TailwindCSS',
        'Java', 'Go', 'Docker', 'Next.js', 'Cybersecurity'
    ];

    const AVAILABLE_INTERESTS = [
        'FinTech & Payments', 'AI & Automation', 'Social Impact & Civic Tech',
        'Web3 & Decentralization', 'Education & EdTech', 'Sustainability & Climate', 'HealthTech'
    ];

    function injectStepperStyles() {
        if (document.getElementById('cs-stepper-styles')) return;
        const style = document.createElement('style');
        style.id = 'cs-stepper-styles';
        style.textContent = `
            .cs-step-indicator-wrapper {
                background: #FFF8EB;
                border-bottom: 3px solid #111111;
                padding: 12px 16px;
            }
            .cs-step-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                margin-bottom: 8px;
            }
            .cs-step-bar-line {
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 3px;
                background: #111111;
                z-index: 1;
                transform: translateY(-50%);
            }
            .cs-step-circle {
                width: 32px;
                height: 32px;
                border-radius: 9999px;
                border: 2px solid #111111;
                background: #FFFFFF;
                color: #111111;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Bricolage Grotesque', sans-serif;
                font-weight: 800;
                font-size: 13px;
                position: relative;
                z-index: 2;
                box-shadow: 2px 2px 0px #111111;
                transition: all 0.2s ease;
            }
            .cs-step-circle.active {
                background: #2B50FF;
                color: #FFFFFF;
                border-color: #111111;
                box-shadow: 3px 3px 0px #111111;
                transform: scale(1.1);
            }
            .cs-step-circle.completed {
                background: #FFC83D;
                color: #111111;
            }
            .cs-chip-group {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .cs-chip {
                background: #FFFFFF;
                border: 2px solid #111111;
                padding: 6px 12px;
                font-family: 'DM Sans', sans-serif;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                box-shadow: 2px 2px 0px #111111;
                transition: all 0.1s ease;
                user-select: none;
            }
            .cs-chip:hover {
                transform: translate(1px, 1px);
                box-shadow: 1px 1px 0px #111111;
            }
            .cs-chip.selected {
                background: #2B50FF;
                color: #FFFFFF;
                box-shadow: 3px 3px 0px #111111;
            }
            .cs-track-card-select {
                border: 3px solid #111111;
                padding: 16px;
                cursor: pointer;
                box-shadow: 4px 4px 0px #111111;
                transition: all 0.15s ease;
                background: #FFFFFF;
            }
            .cs-track-card-select:hover {
                transform: translate(2px, 2px);
                box-shadow: 2px 2px 0px #111111;
            }
            .cs-track-card-select.selected {
                border-color: #111111;
                background: #FFC83D;
                box-shadow: 6px 6px 0px #111111;
                transform: translate(-1px, -1px);
            }
            .cs-review-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 10px 0;
                border-bottom: 1px dashed #111111;
            }
            .cs-review-row:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);
    }

    function createStepperDOM() {
        if (stepperModalEl) return stepperModalEl;

        injectStepperStyles();

        const backdrop = document.createElement('div');
        backdrop.id = 'cs-reg-modal';
        backdrop.className = 'cs-modal-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-labelledby', 'cs-stepper-title');

        backdrop.innerHTML = `
            <div class="cs-modal-card" style="max-width: 640px;">
                <!-- Header -->
                <div class="cs-modal-header" style="background:#2B50FF; color:#FFF8EB;">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 bg-sun rounded-full"></span>
                        <h2 id="cs-stepper-title" class="font-bricolage font-extrabold text-xl text-cream">Campus Sprint Registration</h2>
                    </div>
                    <button id="cs-stepper-close-btn" class="w-8 h-8 bg-white text-ink border-2 border-ink card-neo flex items-center justify-center font-bold text-lg hover:bg-cream active:translate-x-0.5 active:translate-y-0.5" aria-label="Close registration stepper">
                        ✕
                    </button>
                </div>

                <!-- Step Indicator -->
                <div class="cs-step-indicator-wrapper">
                    <div class="cs-step-bar">
                        <div class="cs-step-bar-line"></div>
                        <div class="cs-step-circle active" data-step-circle="1">1</div>
                        <div class="cs-step-circle" data-step-circle="2">2</div>
                        <div class="cs-step-circle" data-step-circle="3">3</div>
                        <div class="cs-step-circle" data-step-circle="4">4</div>
                        <div class="cs-step-circle" data-step-circle="5">5</div>
                    </div>
                    <div class="flex justify-between items-center text-xs font-bold text-ink">
                        <span id="cs-step-name-display">Step 1 of 5: Personal Details</span>
                        <span class="bg-sun px-2 py-0.5 border border-ink text-[11px]" id="cs-step-pct">20%</span>
                    </div>
                </div>

                <!-- Body / Panels -->
                <div class="p-6">
                    <div id="cs-stepper-alert" style="display:none;" class="cs-alert-box error mb-4"></div>

                    <!-- STEP 1: Personal Info -->
                    <div id="cs-step-panel-1" class="cs-step-panel">
                        <h3 class="font-bricolage font-extrabold text-2xl mb-2 text-ink">1. Verified Student Profile</h3>
                        <p class="text-sm text-ink/80 mb-6 font-medium">Confirm your details. These will appear on your hackathon badge and team certificate.</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-reg-fullname">Full Name *</label>
                                <input type="text" id="cs-reg-fullname" class="cs-form-input" placeholder="e.g. Arjun Mehta" required>
                                <span class="cs-form-error" id="cs-err-fullname" style="display:none;"></span>
                            </div>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-reg-email">Student Email *</label>
                                <input type="email" id="cs-reg-email" class="cs-form-input" placeholder="arjun@student.example.edu" required>
                                <span class="cs-form-error" id="cs-err-email" style="display:none;"></span>
                            </div>
                        </div>

                        <div class="cs-form-group">
                            <label class="cs-form-label" for="cs-reg-college">College / Institution *</label>
                            <input type="text" id="cs-reg-college" class="cs-form-input" placeholder="e.g. Apex Institute of Technology" required>
                            <span class="cs-form-error" id="cs-err-college" style="display:none;"></span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-reg-course">Course / Degree *</label>
                                <input type="text" id="cs-reg-course" class="cs-form-input" placeholder="e.g. B.Tech CSE" required>
                                <span class="cs-form-error" id="cs-err-course" style="display:none;"></span>
                            </div>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-reg-year">Academic Year *</label>
                                <select id="cs-reg-year" class="cs-form-input font-medium">
                                    <option value="1st Year">1st Year</option>
                                    <option value="2nd Year" selected>2nd Year</option>
                                    <option value="3rd Year">3rd Year</option>
                                    <option value="4th Year">4th Year</option>
                                    <option value="Postgraduate">Postgraduate</option>
                                </select>
                            </div>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-reg-phone">Phone Number *</label>
                                <input type="tel" id="cs-reg-phone" class="cs-form-input" placeholder="+91 98765 43210" required>
                                <span class="cs-form-error" id="cs-err-phone" style="display:none;"></span>
                            </div>
                        </div>

                        <div class="flex justify-end mt-6">
                            <button type="button" class="btn-neo bg-cobalt text-cream font-bricolage font-bold text-lg px-8 py-3 border-2 border-ink cs-btn-next" data-next="2">
                                Next: Skills &amp; Profile →
                            </button>
                        </div>
                    </div>

                    <!-- STEP 2: Profile & Skills -->
                    <div id="cs-step-panel-2" class="cs-step-panel" style="display:none;">
                        <h3 class="font-bricolage font-extrabold text-2xl mb-2 text-ink">2. Skills &amp; Interests</h3>
                        <p class="text-sm text-ink/80 mb-6 font-medium">Help organizers and potential teammates understand what you bring to the table.</p>

                        <!-- Skills -->
                        <div class="cs-form-group mb-6">
                            <label class="cs-form-label">Primary Technical Skills * (Select at least one)</label>
                            <div class="cs-chip-group mb-3" id="cs-skills-chips"></div>
                            <span class="cs-form-error" id="cs-err-skills" style="display:none;"></span>

                            <!-- Custom skill adder -->
                            <div class="flex gap-2 mt-2">
                                <input type="text" id="cs-custom-skill-input" class="cs-form-input py-1 text-sm max-w-xs" placeholder="Add custom skill...">
                                <button type="button" id="cs-add-skill-btn" class="btn-neo bg-sun text-ink font-bold px-3 py-1 text-sm border-2 border-ink">Add</button>
                            </div>
                        </div>

                        <!-- Areas of interest -->
                        <div class="cs-form-group mb-6">
                            <label class="cs-form-label">Areas of Interest</label>
                            <div class="cs-chip-group" id="cs-interests-chips"></div>
                        </div>

                        <!-- Hackathon experience -->
                        <div class="cs-form-group mb-6">
                            <label class="cs-form-label">Previous Hackathon Experience *</label>
                            <div class="space-y-2 font-medium text-sm">
                                <label class="flex items-center gap-3 p-3 border-2 border-ink bg-white card-neo cursor-pointer">
                                    <input type="radio" name="cs_reg_exp" value="first_time" checked>
                                    <div>
                                        <strong class="block text-ink">First-time hacker</strong>
                                        <span class="text-xs text-ink/70">Excited to build my very first hackathon project!</span>
                                    </div>
                                </label>
                                <label class="flex items-center gap-3 p-3 border-2 border-ink bg-white card-neo cursor-pointer">
                                    <input type="radio" name="cs_reg_exp" value="intermediate">
                                    <div>
                                        <strong class="block text-ink">1–2 Hackathons</strong>
                                        <span class="text-xs text-ink/70">I've participated before and know the ropes.</span>
                                    </div>
                                </label>
                                <label class="flex items-center gap-3 p-3 border-2 border-ink bg-white card-neo cursor-pointer">
                                    <input type="radio" name="cs_reg_exp" value="veteran">
                                    <div>
                                        <strong class="block text-ink">Veteran (3+ Hackathons)</strong>
                                        <span class="text-xs text-ink/70">Seasoned competitive builder ready for a fast sprint.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Bio -->
                        <div class="cs-form-group">
                            <label class="cs-form-label" for="cs-reg-bio">Short Bio (Optional)</label>
                            <textarea id="cs-reg-bio" rows="2" class="cs-form-input" placeholder="A sentence or two about your background or what you want to build..."></textarea>
                        </div>

                        <div class="flex justify-between mt-6">
                            <button type="button" class="btn-neo bg-cream text-ink font-bricolage font-bold text-lg px-6 py-3 border-2 border-ink cs-btn-back" data-back="1">
                                ← Back
                            </button>
                            <button type="button" class="btn-neo bg-cobalt text-cream font-bricolage font-bold text-lg px-8 py-3 border-2 border-ink cs-btn-next" data-next="3">
                                Next: Track Selection →
                            </button>
                        </div>
                    </div>

                    <!-- STEP 3: Track Selection -->
                    <div id="cs-step-panel-3" class="cs-step-panel" style="display:none;">
                        <h3 class="font-bricolage font-extrabold text-2xl mb-2 text-ink">3. Preferred Track</h3>
                        <p class="text-sm text-ink/80 mb-6 font-medium">Select your primary track focus. Your team can still refine this at kickoff.</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" id="cs-track-selection-grid"></div>
                        <span class="cs-form-error mt-3" id="cs-err-track" style="display:none;"></span>

                        <div class="flex justify-between mt-6">
                            <button type="button" class="btn-neo bg-cream text-ink font-bricolage font-bold text-lg px-6 py-3 border-2 border-ink cs-btn-back" data-back="2">
                                ← Back
                            </button>
                            <button type="button" class="btn-neo bg-cobalt text-cream font-bricolage font-bold text-lg px-8 py-3 border-2 border-ink cs-btn-next" data-next="4">
                                Next: Rules &amp; Conduct →
                            </button>
                        </div>
                    </div>

                    <!-- STEP 4: Rules & Code of Conduct -->
                    <div id="cs-step-panel-4" class="cs-step-panel" style="display:none;">
                        <h3 class="font-bricolage font-extrabold text-2xl mb-2 text-ink">4. Rules &amp; Participation Agreement</h3>
                        <p class="text-sm text-ink/80 mb-6 font-medium">Please review the 24-hour online sprint commitments.</p>

                        <div class="border-2 border-ink bg-white p-5 card-neo space-y-4 text-sm font-medium text-ink/90 max-h-60 overflow-y-auto mb-6">
                            <div class="flex items-start gap-3">
                                <span class="bg-cobalt text-cream w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">1</span>
                                <div>
                                    <strong class="text-ink font-bold block">100% Online Format</strong>
                                    All activities, mentor calls, and presentations take place on our Discord and the web platform. No physical venue attendance is needed.
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-cobalt text-cream w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">2</span>
                                <div>
                                    <strong class="text-ink font-bold block">Original &amp; Fresh Code</strong>
                                    Projects must be built during the 24 hours starting at Nov 15, 10:00 AM IST. Using existing libraries and public APIs is encouraged, but pre-built applications will be disqualified.
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-cobalt text-cream w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">3</span>
                                <div>
                                    <strong class="text-ink font-bold block">Team Sizing (2 to 5 Members)</strong>
                                    All submissions require a team of 2 to 5 verified students. You can create or join a team with a join code on Discord before submissions close.
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-cobalt text-cream w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">4</span>
                                <div>
                                    <strong class="text-ink font-bold block">Inclusive Code of Conduct</strong>
                                    We foster an open, welcoming, and harassment-free environment for every builder, regardless of background or skill level.
                                </div>
                            </div>
                        </div>

                        <div class="cs-form-group">
                            <label class="flex items-start gap-3 p-4 border-2 border-ink bg-sun/20 card-neo cursor-pointer">
                                <input type="checkbox" id="cs-reg-rules-check" class="w-5 h-5 mt-0.5 border-2 border-ink rounded">
                                <span class="text-sm font-bold text-ink">
                                    I have read, understood, and accept the Campus Sprint 2026 Rules &amp; Code of Conduct. *
                                </span>
                            </label>
                            <span class="cs-form-error" id="cs-err-rules" style="display:none;"></span>
                        </div>

                        <div class="flex justify-between mt-6">
                            <button type="button" class="btn-neo bg-cream text-ink font-bricolage font-bold text-lg px-6 py-3 border-2 border-ink cs-btn-back" data-back="3">
                                ← Back
                            </button>
                            <button type="button" class="btn-neo bg-cobalt text-cream font-bricolage font-bold text-lg px-8 py-3 border-2 border-ink cs-btn-next" data-next="5">
                                Next: Review Details →
                            </button>
                        </div>
                    </div>

                    <!-- STEP 5: Review & Submit -->
                    <div id="cs-step-panel-5" class="cs-step-panel" style="display:none;">
                        <h3 class="font-bricolage font-extrabold text-2xl mb-2 text-ink">5. Review Your Registration</h3>
                        <p class="text-sm text-ink/80 mb-6 font-medium">Verify your registration details before confirming your spot.</p>

                        <div class="border-3 border-ink bg-white p-5 card-neo mb-6">
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">Full Name</span>
                                <span class="font-bold text-ink" id="cs-rev-name">-</span>
                            </div>
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">Email</span>
                                <span class="font-bold text-ink" id="cs-rev-email">-</span>
                            </div>
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">College &amp; Degree</span>
                                <span class="font-bold text-ink" id="cs-rev-college">-</span>
                            </div>
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">Phone</span>
                                <span class="font-bold text-ink" id="cs-rev-phone">-</span>
                            </div>
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">Skills</span>
                                <span class="font-bold text-cobalt" id="cs-rev-skills">-</span>
                            </div>
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">Track Focus</span>
                                <span class="bg-sun px-2 py-0.5 border border-ink font-bold text-xs" id="cs-rev-track">-</span>
                            </div>
                            <div class="cs-review-row">
                                <span class="font-bold text-xs uppercase text-ink/60">Rules Accepted</span>
                                <span class="text-green-700 font-bold">✓ Confirmed</span>
                            </div>
                        </div>

                        <div class="flex justify-between items-center mt-6">
                            <button type="button" class="btn-neo bg-cream text-ink font-bricolage font-bold text-lg px-6 py-3 border-2 border-ink cs-btn-back" data-back="4">
                                ← Edit Info
                            </button>
                            <button type="button" id="cs-btn-submit-registration" class="btn-neo bg-sun text-ink font-bricolage font-extrabold text-lg px-8 py-4 border-2 border-ink">
                                Complete Registration 🚀
                            </button>
                        </div>
                    </div>

                    <!-- CONFIRMATION / SUCCESS VIEW -->
                    <div id="cs-step-panel-success" class="cs-step-panel" style="display:none;">
                        <div class="text-center py-4">
                            <div class="w-16 h-16 bg-sun border-3 border-ink rounded-full card-neo mx-auto flex items-center justify-center text-3xl mb-4">
                                🎟️
                            </div>
                            <h3 class="font-bricolage font-extrabold text-3xl mb-1 text-ink">You're Registered!</h3>
                            <p class="font-bold text-cobalt text-lg mb-4">Campus Sprint 2026 • Nov 15–16</p>

                            <!-- Ticket Card -->
                            <div class="border-4 border-ink bg-white p-6 card-neo text-left max-w-md mx-auto mb-6 relative overflow-hidden">
                                <div class="flex justify-between items-start border-b-2 border-ink pb-3 mb-3">
                                    <div>
                                        <span class="text-[10px] uppercase font-bold tracking-wider text-ink/60">Participant Badge</span>
                                        <h4 class="font-bricolage font-extrabold text-xl text-ink" id="cs-ticket-name">Participant</h4>
                                        <p class="text-xs font-medium text-ink/70" id="cs-ticket-college">Apex Institute</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="bg-cobalt text-cream text-xs font-bold px-2 py-1 border border-ink" id="cs-ticket-track">FINTECH</span>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2 text-xs font-medium">
                                    <div>
                                        <span class="text-ink/60 block text-[10px] uppercase">Registration ID</span>
                                        <strong class="font-mono text-ink text-sm" id="cs-ticket-id">REG-2026-XXXX</strong>
                                    </div>
                                    <div>
                                        <span class="text-ink/60 block text-[10px] uppercase">Ticket Pass</span>
                                        <strong class="font-mono text-ink text-sm" id="cs-ticket-code">CS26-XXXX-XXXX</strong>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-cream border-2 border-ink p-4 card-neo max-w-md mx-auto text-left text-xs space-y-2 mb-6">
                                <h5 class="font-bricolage font-bold text-sm text-ink">Next Steps for Online Sprint:</h5>
                                <p>• <strong>Discord:</strong> Join the participant Discord server to find teammates or form your team.</p>
                                <p>• <strong>Kickoff:</strong> Problem statements unlock Nov 15 at 10:00 AM IST.</p>
                                <p>• <strong>Dashboard:</strong> Your registration has been saved to your browser session.</p>
                            </div>

                            <button type="button" id="cs-btn-close-success" class="btn-neo bg-cobalt text-cream font-bricolage font-bold text-lg px-10 py-3 border-2 border-ink">
                                Done &amp; Return to Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        stepperModalEl = backdrop;

        attachStepperListeners(backdrop);
        renderSkillsChips(backdrop);
        renderInterestsChips(backdrop);
        renderTrackOptions(backdrop);

        return backdrop;
    }

    // Populate skill chips
    function renderSkillsChips(modal) {
        const container = modal.querySelector('#cs-skills-chips');
        if (!container) return;
        container.innerHTML = '';
        AVAILABLE_SKILLS.forEach(skill => {
            const chip = document.createElement('div');
            chip.className = 'cs-chip' + (formData.skills.includes(skill) ? ' selected' : '');
            chip.textContent = skill;
            chip.addEventListener('click', () => {
                if (formData.skills.includes(skill)) {
                    formData.skills = formData.skills.filter(s => s !== skill);
                    chip.classList.remove('selected');
                } else {
                    formData.skills.push(skill);
                    chip.classList.add('selected');
                }
            });
            container.appendChild(chip);
        });
    }

    // Populate interest chips
    function renderInterestsChips(modal) {
        const container = modal.querySelector('#cs-interests-chips');
        if (!container) return;
        container.innerHTML = '';
        AVAILABLE_INTERESTS.forEach(interest => {
            const chip = document.createElement('div');
            chip.className = 'cs-chip' + (formData.interests.includes(interest) ? ' selected' : '');
            chip.textContent = interest;
            chip.addEventListener('click', () => {
                if (formData.interests.includes(interest)) {
                    formData.interests = formData.interests.filter(i => i !== interest);
                    chip.classList.remove('selected');
                } else {
                    formData.interests.push(interest);
                    chip.classList.add('selected');
                }
            });
            container.appendChild(chip);
        });
    }

    // Populate tracks from CampusSprint.Data.tracks
    function renderTrackOptions(modal) {
        const container = modal.querySelector('#cs-track-selection-grid');
        if (!container) return;
        container.innerHTML = '';

        const tracks = (global.CampusSprint.Data && global.CampusSprint.Data.tracks) || [];
        tracks.forEach(t => {
            const card = document.createElement('div');
            card.className = 'cs-track-card-select' + (formData.trackId === t.id ? ' selected' : '');
            card.dataset.trackId = t.id;

            card.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-bricolage font-bold text-xl text-ink">${t.name}</h4>
                    <span class="w-6 h-6 border-2 border-ink rounded-full flex items-center justify-center font-bold text-xs ${formData.trackId === t.id ? 'bg-cobalt text-cream' : 'bg-white text-transparent'}">✓</span>
                </div>
                <p class="text-xs font-medium text-ink/80 mb-3">${t.shortDescription}</p>
                <div class="flex flex-wrap gap-1">
                    ${(t.tags || []).slice(0, 3).map(tag => `<span class="bg-white border border-ink text-[10px] font-bold px-1.5 py-0.5">${tag}</span>`).join('')}
                </div>
            `;

            card.addEventListener('click', () => {
                formData.trackId = t.id;
                modal.querySelectorAll('.cs-track-card-select').forEach(c => {
                    const isCur = c.dataset.trackId === t.id;
                    c.classList.toggle('selected', isCur);
                    const check = c.querySelector('span');
                    if (check) {
                        check.className = 'w-6 h-6 border-2 border-ink rounded-full flex items-center justify-center font-bold text-xs ' + (isCur ? 'bg-cobalt text-cream' : 'bg-white text-transparent');
                    }
                });
            });

            container.appendChild(card);
        });
    }

    // Attach listeners
    function attachStepperListeners(modal) {
        const closeBtn = modal.querySelector('#cs-stepper-close-btn');
        const closeSuccessBtn = modal.querySelector('#cs-btn-close-success');

        closeBtn.addEventListener('click', closeModal);
        if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Navigation forward
        modal.querySelectorAll('.cs-btn-next').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStep = parseInt(btn.dataset.next, 10);
                if (validateAndSaveStep(currentStep)) {
                    goToStep(targetStep);
                }
            });
        });

        // Navigation back
        modal.querySelectorAll('.cs-btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStep = parseInt(btn.dataset.back, 10);
                saveCurrentStepData(currentStep);
                goToStep(targetStep);
            });
        });

        // Custom skill adder
        const addSkillBtn = modal.querySelector('#cs-add-skill-btn');
        const customSkillInput = modal.querySelector('#cs-custom-skill-input');
        if (addSkillBtn && customSkillInput) {
            addSkillBtn.addEventListener('click', () => {
                const val = customSkillInput.value.trim();
                if (val && !formData.skills.includes(val)) {
                    formData.skills.push(val);
                    AVAILABLE_SKILLS.push(val);
                    renderSkillsChips(modal);
                    customSkillInput.value = '';
                }
            });
        }

        // Final Submit Button
        const submitBtn = modal.querySelector('#cs-btn-submit-registration');
        if (submitBtn) {
            submitBtn.addEventListener('click', handleRegistrationSubmit);
        }

        // Escape Key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && stepperModalEl && stepperModalEl.classList.contains('open')) {
                closeModal();
            }
        });
    }

    // Save step data to memory without validating
    function saveCurrentStepData(step) {
        if (step === 1) {
            formData.fullName = stepperModalEl.querySelector('#cs-reg-fullname').value;
            formData.email = stepperModalEl.querySelector('#cs-reg-email').value;
            formData.college = stepperModalEl.querySelector('#cs-reg-college').value;
            formData.course = stepperModalEl.querySelector('#cs-reg-course').value;
            formData.year = stepperModalEl.querySelector('#cs-reg-year').value;
            formData.phone = stepperModalEl.querySelector('#cs-reg-phone').value;
        } else if (step === 2) {
            formData.bio = stepperModalEl.querySelector('#cs-reg-bio').value;
            const expRadio = stepperModalEl.querySelector('input[name="cs_reg_exp"]:checked');
            if (expRadio) formData.experience = expRadio.value;
        } else if (step === 4) {
            formData.rulesAccepted = stepperModalEl.querySelector('#cs-reg-rules-check').checked;
        }
    }

    // Validate current step
    function validateAndSaveStep(step) {
        clearStepErrors();
        saveCurrentStepData(step);

        if (step === 1) {
            const val = RegService.validatePersonalInfo(formData);
            if (!val.isValid) {
                if (val.errors.fullName) showFieldError('fullname', val.errors.fullName);
                if (val.errors.email)    showFieldError('email', val.errors.email);
                if (val.errors.college)  showFieldError('college', val.errors.college);
                if (val.errors.course)   showFieldError('course', val.errors.course);
                if (val.errors.phone)    showFieldError('phone', val.errors.phone);
                return false;
            }
            return true;
        }

        if (step === 2) {
            const val = RegService.validateProfileInfo(formData);
            if (!val.isValid) {
                if (val.errors.skills) showFieldError('skills', val.errors.skills);
                return false;
            }
            return true;
        }

        if (step === 3) {
            const val = RegService.validateTrackSelection(formData.trackId);
            if (!val.isValid) {
                showFieldError('track', val.errors.track);
                return false;
            }
            return true;
        }

        if (step === 4) {
            const val = RegService.validateRulesAgreement(formData.rulesAccepted);
            if (!val.isValid) {
                showFieldError('rules', val.errors.rules);
                return false;
            }
            return true;
        }

        return true;
    }

    function showFieldError(field, msg) {
        const errEl = stepperModalEl.querySelector('#cs-err-' + field);
        if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }
    }

    function clearStepErrors() {
        if (!stepperModalEl) return;
        stepperModalEl.querySelectorAll('.cs-form-error').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        const alertBox = stepperModalEl.querySelector('#cs-stepper-alert');
        if (alertBox) {
            alertBox.style.display = 'none';
            alertBox.textContent = '';
        }
    }

    // Step Transition
    function goToStep(step) {
        currentStep = step;
        clearStepErrors();

        // Update step panels visibility
        for (let i = 1; i <= 5; i++) {
            const panel = stepperModalEl.querySelector('#cs-step-panel-' + i);
            if (panel) panel.style.display = (i === step) ? 'block' : 'none';
        }

        const successPanel = stepperModalEl.querySelector('#cs-step-panel-success');
        if (successPanel) successPanel.style.display = 'none';

        // Update Step circles
        stepperModalEl.querySelectorAll('[data-step-circle]').forEach(circle => {
            const cStep = parseInt(circle.dataset.stepCircle, 10);
            circle.classList.toggle('active', cStep === step);
            circle.classList.toggle('completed', cStep < step);
        });

        // Update step name display & percent
        const names = [
            'Step 1 of 5: Personal Details',
            'Step 2 of 5: Skills & Profile',
            'Step 3 of 5: Track Selection',
            'Step 4 of 5: Rules & Conduct',
            'Step 5 of 5: Review & Submit'
        ];
        stepperModalEl.querySelector('#cs-step-name-display').textContent = names[step - 1] || '';
        stepperModalEl.querySelector('#cs-step-pct').textContent = (step * 20) + '%';

        // If step 5, populate review details
        if (step === 5) {
            populateReview();
        }

        // Scroll modal card to top on step transition
        const card = stepperModalEl.querySelector('.cs-modal-card');
        if (card) card.scrollTop = 0;
    }

    function populateReview() {
        stepperModalEl.querySelector('#cs-rev-name').textContent = formData.fullName;
        stepperModalEl.querySelector('#cs-rev-email').textContent = formData.email;
        stepperModalEl.querySelector('#cs-rev-college').textContent = `${formData.college} (${formData.course}, ${formData.year})`;
        stepperModalEl.querySelector('#cs-rev-phone').textContent = formData.phone;
        stepperModalEl.querySelector('#cs-rev-skills').textContent = formData.skills.join(', ');

        const trackObj = (global.CampusSprint.Data && global.CampusSprint.Data.getTrackById)
            ? global.CampusSprint.Data.getTrackById(formData.trackId)
            : null;
        stepperModalEl.querySelector('#cs-rev-track').textContent = trackObj ? trackObj.name : formData.trackId;
    }

    // Submit Final Registration
    function handleRegistrationSubmit() {
        const alertBox = stepperModalEl.querySelector('#cs-stepper-alert');
        const submitBtn = stepperModalEl.querySelector('#cs-btn-submit-registration');

        alertBox.style.display = 'none';
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting Registration...';

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            // Associate current user ID if logged in
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                formData.userId = currentUser.id;
            }

            const res = RegService.submitRegistration(formData);
            if (!res.success) {
                alertBox.textContent = res.error || 'Failed to submit registration. Please check fields.';
                alertBox.style.display = 'block';
                return;
            }

            // Registration Successful: Show Confirmation View
            const reg = res.registration;
            for (let i = 1; i <= 5; i++) {
                const panel = stepperModalEl.querySelector('#cs-step-panel-' + i);
                if (panel) panel.style.display = 'none';
            }

            const successPanel = stepperModalEl.querySelector('#cs-step-panel-success');
            if (successPanel) successPanel.style.display = 'block';

            stepperModalEl.querySelector('#cs-ticket-name').textContent = reg.fullName;
            stepperModalEl.querySelector('#cs-ticket-college').textContent = `${reg.college} • ${reg.course}`;
            stepperModalEl.querySelector('#cs-ticket-track').textContent = (reg.trackId || '').toUpperCase();
            stepperModalEl.querySelector('#cs-ticket-id').textContent = reg.id;
            stepperModalEl.querySelector('#cs-ticket-code').textContent = reg.ticketCode;

            // Update step indicator to 100%
            stepperModalEl.querySelector('#cs-step-name-display').textContent = 'Registration Confirmed!';
            stepperModalEl.querySelector('#cs-step-pct').textContent = '100%';
        }, 500);
    }

    // Public API: Open Stepper
    function openStepper() {
        const dom = createStepperDOM();
        lastActiveElement = document.activeElement;

        // Pre-fill user data from auth if logged in
        const user = Auth.getCurrentUser();
        if (user) {
            formData.fullName = user.displayName || formData.fullName;
            formData.email = user.email || formData.email;
            formData.college = user.college || formData.college;
            formData.course = user.course || formData.course;
            formData.year = user.year || formData.year;
            formData.phone = user.phone || formData.phone;
        }

        // Check if user is already registered
        if (user && RegService.hasRegistrationForEmail(user.email)) {
            const existing = RegService.getRegistrationByEmail(user.email);
            // Go straight to confirmation view
            for (let i = 1; i <= 5; i++) {
                dom.querySelector('#cs-step-panel-' + i).style.display = 'none';
            }
            const successPanel = dom.querySelector('#cs-step-panel-success');
            if (successPanel) successPanel.style.display = 'block';

            dom.querySelector('#cs-ticket-name').textContent = existing.fullName;
            dom.querySelector('#cs-ticket-college').textContent = `${existing.college} • ${existing.course}`;
            dom.querySelector('#cs-ticket-track').textContent = (existing.trackId || '').toUpperCase();
            dom.querySelector('#cs-ticket-id').textContent = existing.id;
            dom.querySelector('#cs-ticket-code').textContent = existing.ticketCode;
        } else {
            // Fill inputs with current formData
            const nameInp = dom.querySelector('#cs-reg-fullname');
            if (nameInp) nameInp.value = formData.fullName;
            const emailInp = dom.querySelector('#cs-reg-email');
            if (emailInp) emailInp.value = formData.email;
            const collegeInp = dom.querySelector('#cs-reg-college');
            if (collegeInp) collegeInp.value = formData.college;
            const courseInp = dom.querySelector('#cs-reg-course');
            if (courseInp) courseInp.value = formData.course;
            const yearInp = dom.querySelector('#cs-reg-year');
            if (yearInp) yearInp.value = formData.year;
            const phoneInp = dom.querySelector('#cs-reg-phone');
            if (phoneInp) phoneInp.value = formData.phone;

            goToStep(1);
        }

        dom.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // Public API: Close Stepper
    function closeModal() {
        if (!stepperModalEl) return;
        stepperModalEl.classList.remove('open');
        document.body.style.overflow = '';
        if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
        }
    }

    // Expose API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.RegistrationStepper = {
        open: openStepper,
        close: closeModal
    };

})(window);

