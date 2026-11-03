/* ==========================================================================
   CampusSprint Waitlist Modal (When Event State is FULL)
   Allows participants to register for the priority waitlist without
   creating a full hackathon registration record.
   ========================================================================== */
(function(global) {
    'use strict';

    const RegService = global.CampusSprint.Registration;
    let modalEl = null;
    let lastActiveElement = null;

    function createModalDOM() {
        if (modalEl) return modalEl;

        const backdrop = document.createElement('div');
        backdrop.id = 'cs-waitlist-modal';
        backdrop.className = 'cs-modal-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-labelledby', 'cs-waitlist-title');

        backdrop.innerHTML = `
            <div class="cs-modal-card" style="max-width:480px;">
                <div class="cs-modal-header" style="background:#FF5A3C; color:#FFF8EB;">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">⚠️</span>
                        <h2 id="cs-waitlist-title" class="font-bricolage font-extrabold text-xl text-cream">Registration Capacity Reached</h2>
                    </div>
                    <button id="cs-waitlist-close-btn" class="w-8 h-8 bg-white text-ink border-2 border-ink card-neo flex items-center justify-center font-bold text-lg hover:bg-cream active:translate-x-0.5 active:translate-y-0.5" aria-label="Close waitlist modal">
                        ✕
                    </button>
                </div>

                <div class="p-6">
                    <div id="cs-waitlist-content">
                        <p class="font-medium text-ink/80 text-sm mb-4 leading-relaxed">
                            Campus Sprint 2026 has filled its 150 team slots. Enter your details to join the verified waitlist. If an admitted team withdraws, spots are released on a first-come, first-served basis.
                        </p>

                        <div id="cs-waitlist-alert" style="display:none;" class="cs-alert-box error mb-4"></div>

                        <form id="cs-waitlist-form" onsubmit="return false;">
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-wl-name">Full Name *</label>
                                <input type="text" id="cs-wl-name" class="cs-form-input" placeholder="Your Name" required>
                            </div>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-wl-email">Student Email *</label>
                                <input type="email" id="cs-wl-email" class="cs-form-input" placeholder="you@student.example.edu" required>
                            </div>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-wl-college">College / Institution</label>
                                <input type="text" id="cs-wl-college" class="cs-form-input" placeholder="College name">
                            </div>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-wl-track">Preferred Track</label>
                                <select id="cs-wl-track" class="cs-form-input font-medium">
                                    <option value="any">Any Track</option>
                                    <option value="fintech">FinTech</option>
                                    <option value="social-good">Social Good</option>
                                    <option value="web3">Web3</option>
                                    <option value="beginner">Beginner</option>
                                </select>
                            </div>

                            <button type="submit" id="cs-wl-submit-btn" class="btn-neo w-full bg-sun text-ink font-bricolage font-bold text-lg py-3 border-2 border-ink mt-2">
                                Join Priority Waitlist
                            </button>
                        </form>
                    </div>

                    <!-- Success State -->
                    <div id="cs-waitlist-success" style="display:none;" class="text-center py-6">
                        <div class="w-16 h-16 bg-sun border-3 border-ink rounded-full card-neo mx-auto flex items-center justify-center text-3xl mb-4">
                            ✓
                        </div>
                        <h3 class="font-bricolage font-extrabold text-2xl mb-2 text-ink">You're on the Waitlist!</h3>
                        <p class="font-medium text-ink/80 text-sm mb-6 leading-relaxed">
                            We have recorded your details. If a spot opens up before kickoff on Nov 15, we will notify your college email immediately.
                        </p>
                        <button type="button" id="cs-wl-done-btn" class="btn-neo bg-cobalt text-cream font-bricolage font-bold text-lg px-8 py-3 border-2 border-ink">
                            Back to Event Page
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        modalEl = backdrop;

        // Attach listeners
        const closeBtn = backdrop.querySelector('#cs-waitlist-close-btn');
        const form = backdrop.querySelector('#cs-waitlist-form');
        const doneBtn = backdrop.querySelector('#cs-wl-done-btn');

        closeBtn.addEventListener('click', closeModal);
        doneBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const alertBox = backdrop.querySelector('#cs-waitlist-alert');
            alertBox.style.display = 'none';

            const fullName = backdrop.querySelector('#cs-wl-name').value;
            const email = backdrop.querySelector('#cs-wl-email').value;
            const college = backdrop.querySelector('#cs-wl-college').value;
            const track = backdrop.querySelector('#cs-wl-track').value;
            const submitBtn = backdrop.querySelector('#cs-wl-submit-btn');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Join Priority Waitlist';

                const res = RegService.submitWaitlist({
                    fullName,
                    email,
                    college,
                    trackInterest: track
                });

                if (!res.success) {
                    alertBox.textContent = res.error;
                    alertBox.style.display = 'block';
                    return;
                }

                // Show success view
                backdrop.querySelector('#cs-waitlist-content').style.display = 'none';
                backdrop.querySelector('#cs-waitlist-success').style.display = 'block';
            }, 300);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalEl && modalEl.classList.contains('open')) {
                closeModal();
            }
        });

        return backdrop;
    }

    function openModal() {
        const dom = createModalDOM();
        lastActiveElement = document.activeElement;

        // Reset view
        dom.querySelector('#cs-waitlist-content').style.display = 'block';
        dom.querySelector('#cs-waitlist-success').style.display = 'none';
        const form = dom.querySelector('#cs-waitlist-form');
        if (form) form.reset();

        // Pre-fill if auth user exists
        const user = global.CampusSprint.Auth && global.CampusSprint.Auth.getCurrentUser();
        if (user) {
            dom.querySelector('#cs-wl-name').value = user.displayName || '';
            dom.querySelector('#cs-wl-email').value = user.email || '';
            dom.querySelector('#cs-wl-college').value = user.college || '';
        }

        dom.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modalEl) return;
        modalEl.classList.remove('open');
        document.body.style.overflow = '';
        if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
        }
    }

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.WaitlistModal = {
        open: openModal,
        close: closeModal
    };

})(window);

