/* ==========================================================================
   CampusSprint Neo-Brutalist Authentication Modal
   Supports Login, Signup, and Forgot Password with accessible UI & validation.
   ========================================================================== */
(function(global) {
    'use strict';

    const Auth = global.CampusSprint.Auth;
    const SM   = global.CampusSprint.stateManager;

    let modalEl = null;
    let activeTab = 'login'; // 'login' | 'signup' | 'forgot'
    let lastActiveElement = null;

    // Inject Neo-Brutalist CSS for Modal
    function injectStyles() {
        if (document.getElementById('cs-auth-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'cs-auth-modal-styles';
        style.textContent = `
            .cs-modal-backdrop {
                position: fixed;
                inset: 0;
                background-color: rgba(17, 17, 17, 0.65);
                backdrop-filter: blur(2px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .cs-modal-backdrop.open {
                opacity: 1;
                pointer-events: auto;
            }
            .cs-modal-card {
                background: #FFF8EB;
                border: 4px solid #111111;
                box-shadow: 8px 8px 0px #111111;
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                transform: translateY(20px) scale(0.97);
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
            }
            .cs-modal-backdrop.open .cs-modal-card {
                transform: translateY(0) scale(1);
            }
            .cs-modal-header {
                background: #FFC83D;
                border-b: 4px solid #111111;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .cs-modal-tabs {
                display: flex;
                border-bottom: 3px solid #111111;
                background: #FFF8EB;
            }
            .cs-modal-tab-btn {
                flex: 1;
                padding: 12px;
                font-family: 'Bricolage Grotesque', sans-serif;
                font-weight: 700;
                font-size: 15px;
                background: transparent;
                border: none;
                border-right: 2px solid #111111;
                cursor: pointer;
                transition: background 0.15s ease;
                color: #111111;
                text-align: center;
            }
            .cs-modal-tab-btn:last-child {
                border-right: none;
            }
            .cs-modal-tab-btn.active {
                background: #2B50FF;
                color: #FFF8EB;
            }
            .cs-modal-tab-btn:hover:not(.active) {
                background: rgba(43, 80, 255, 0.1);
            }
            .cs-form-group {
                margin-bottom: 16px;
            }
            .cs-form-label {
                display: block;
                font-family: 'Bricolage Grotesque', sans-serif;
                font-weight: 700;
                font-size: 14px;
                margin-bottom: 6px;
                color: #111111;
            }
            .cs-form-input {
                width: 100%;
                padding: 10px 12px;
                font-family: 'DM Sans', sans-serif;
                font-size: 15px;
                border: 2px solid #111111;
                background: #FFFFFF;
                color: #111111;
                box-shadow: 2px 2px 0px #111111;
                transition: transform 0.1s ease, box-shadow 0.1s ease;
                box-sizing: border-box;
            }
            .cs-form-input:focus {
                outline: none;
                background: #FFFDF7;
                border-color: #2B50FF;
                box-shadow: 3px 3px 0px #2B50FF;
            }
            .cs-form-input.error {
                border-color: #FF5A3C;
                background: #FFF5F5;
            }
            .cs-form-error {
                color: #FF5A3C;
                font-size: 12px;
                font-weight: 700;
                margin-top: 4px;
                display: block;
            }
            .cs-form-hint {
                color: #555555;
                font-size: 12px;
                margin-top: 4px;
                display: block;
            }
            .cs-pw-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }
            .cs-pw-toggle {
                position: absolute;
                right: 10px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                font-weight: 700;
                color: #111111;
                font-family: 'DM Sans', sans-serif;
                padding: 4px 6px;
            }
            .cs-pw-toggle:hover {
                color: #2B50FF;
            }
            .cs-alert-box {
                padding: 10px 14px;
                border: 2px solid #111111;
                margin-bottom: 16px;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 3px 3px 0px #111111;
            }
            .cs-alert-box.info {
                background: #FFC83D;
                color: #111111;
            }
            .cs-alert-box.error {
                background: #FF5A3C;
                color: #FFF8EB;
            }
            .cs-alert-box.success {
                background: #4EBA6F;
                color: #FFFFFF;
            }
            @media (prefers-reduced-motion: reduce) {
                .cs-modal-backdrop, .cs-modal-card {
                    transition: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Build Modal DOM
    function createModalDOM() {
        if (modalEl) return modalEl;

        injectStyles();

        const backdrop = document.createElement('div');
        backdrop.id = 'cs-auth-modal';
        backdrop.className = 'cs-modal-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-labelledby', 'cs-auth-title');

        backdrop.innerHTML = `
            <div class="cs-modal-card" id="cs-auth-card">
                <!-- Header -->
                <div class="cs-modal-header">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 bg-white border-2 border-ink rounded-full flex items-center justify-center">
                            <div class="w-3 h-3 bg-cobalt rounded-full"></div>
                        </div>
                        <h2 id="cs-auth-title" class="font-bricolage font-extrabold text-xl text-ink">CampusCrafters Account</h2>
                    </div>
                    <button id="cs-auth-close-btn" class="w-8 h-8 bg-white border-2 border-ink card-neo flex items-center justify-center font-bold text-lg hover:bg-cream active:translate-x-0.5 active:translate-y-0.5" aria-label="Close authentication modal">
                        ✕
                    </button>
                </div>

                <!-- Tabs -->
                <div class="cs-modal-tabs" id="cs-auth-tabs">
                    <button class="cs-modal-tab-btn active" data-tab="login" id="cs-tab-login">Sign In</button>
                    <button class="cs-modal-tab-btn" data-tab="signup" id="cs-tab-signup">Create Account</button>
                </div>

                <div class="p-6">
                    <!-- Notification box -->
                    <div id="cs-auth-alert" style="display:none;" class="cs-alert-box"></div>

                    <!-- LOGIN PANEL -->
                    <div id="cs-panel-login">
                        <div class="cs-alert-box info mb-4">
                            <strong>💡 Demo Credentials:</strong><br>
                            Email: <code class="bg-white px-1 border border-ink">arjun.m@student.example.edu</code><br>
                            Password: <code class="bg-white px-1 border border-ink">Hackathon2026!</code>
                        </div>

                        <form id="cs-form-login" onsubmit="return false;" novalidate>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-login-email">Student Email</label>
                                <input type="email" id="cs-login-email" class="cs-form-input" placeholder="you@student.example.edu" required autocomplete="email">
                                <span class="cs-form-error" id="cs-login-email-err" style="display:none;"></span>
                            </div>

                            <div class="cs-form-group">
                                <div class="flex justify-between items-center mb-1">
                                    <label class="cs-form-label mb-0" for="cs-login-password">Password</label>
                                    <button type="button" id="cs-btn-forgot-pw" class="text-xs font-bold text-cobalt underline hover:text-ink">Forgot password?</button>
                                </div>
                                <div class="cs-pw-wrapper">
                                    <input type="password" id="cs-login-password" class="cs-form-input" placeholder="••••••••" required autocomplete="current-password">
                                    <button type="button" class="cs-pw-toggle" data-target="cs-login-password">Show</button>
                                </div>
                                <span class="cs-form-error" id="cs-login-password-err" style="display:none;"></span>
                            </div>

                            <button type="submit" id="cs-login-submit-btn" class="btn-neo w-full bg-cobalt text-cream font-bricolage font-bold text-lg py-3 border-2 border-ink mt-2">
                                Sign In &amp; Continue
                            </button>
                        </form>
                    </div>

                    <!-- SIGNUP PANEL -->
                    <div id="cs-panel-signup" style="display:none;">
                        <form id="cs-form-signup" onsubmit="return false;" novalidate>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-signup-name">Full Name *</label>
                                <input type="text" id="cs-signup-name" class="cs-form-input" placeholder="e.g. Alex Johnson" required autocomplete="name">
                                <span class="cs-form-error" id="cs-signup-name-err" style="display:none;"></span>
                            </div>

                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-signup-email">Student Email *</label>
                                <input type="email" id="cs-signup-email" class="cs-form-input" placeholder="alex@student.example.edu" required autocomplete="email">
                                <span class="cs-form-error" id="cs-signup-email-err" style="display:none;"></span>
                            </div>

                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-signup-college">College / Institution *</label>
                                <input type="text" id="cs-signup-college" class="cs-form-input" placeholder="e.g. Apex Institute of Technology" required>
                                <span class="cs-form-error" id="cs-signup-college-err" style="display:none;"></span>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div class="cs-form-group">
                                    <label class="cs-form-label" for="cs-signup-password">Password *</label>
                                    <div class="cs-pw-wrapper">
                                        <input type="password" id="cs-signup-password" class="cs-form-input" placeholder="Min. 6 chars" required autocomplete="new-password">
                                        <button type="button" class="cs-pw-toggle" data-target="cs-signup-password">Show</button>
                                    </div>
                                    <span class="cs-form-error" id="cs-signup-password-err" style="display:none;"></span>
                                </div>
                                <div class="cs-form-group">
                                    <label class="cs-form-label" for="cs-signup-confirm">Confirm Password *</label>
                                    <div class="cs-pw-wrapper">
                                        <input type="password" id="cs-signup-confirm" class="cs-form-input" placeholder="Re-enter" required autocomplete="new-password">
                                        <button type="button" class="cs-pw-toggle" data-target="cs-signup-confirm">Show</button>
                                    </div>
                                    <span class="cs-form-error" id="cs-signup-confirm-err" style="display:none;"></span>
                                </div>
                            </div>

                            <span class="cs-form-hint mb-4">By creating an account, you agree to CampusCrafters Terms of Service for this hackathon.</span>

                            <button type="submit" id="cs-signup-submit-btn" class="btn-neo w-full bg-sun text-ink font-bricolage font-bold text-lg py-3 border-2 border-ink mt-2">
                                Create Account &amp; Continue
                            </button>
                        </form>
                    </div>

                    <!-- FORGOT PASSWORD PANEL -->
                    <div id="cs-panel-forgot" style="display:none;">
                        <h3 class="font-bricolage font-bold text-lg mb-2">Reset Password</h3>
                        <p class="text-sm text-ink/80 mb-4 font-medium">Enter your student email and we'll dispatch simulated instructions to restore your account access.</p>

                        <form id="cs-form-forgot" onsubmit="return false;" novalidate>
                            <div class="cs-form-group">
                                <label class="cs-form-label" for="cs-forgot-email">Email Address</label>
                                <input type="email" id="cs-forgot-email" class="cs-form-input" placeholder="you@student.example.edu" required>
                                <span class="cs-form-error" id="cs-forgot-email-err" style="display:none;"></span>
                            </div>

                            <button type="submit" id="cs-forgot-submit-btn" class="btn-neo w-full bg-cobalt text-cream font-bricolage font-bold text-lg py-3 border-2 border-ink">
                                Send Reset Link
                            </button>

                            <button type="button" id="cs-btn-back-to-login" class="w-full text-center mt-3 text-sm font-bold text-ink underline hover:text-cobalt">
                                ← Back to Sign In
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        modalEl = backdrop;

        attachEventListeners(backdrop);
        return backdrop;
    }

    // Attach Event Listeners
    function attachEventListeners(modal) {
        const closeBtn = modal.querySelector('#cs-auth-close-btn');
        const loginTabBtn = modal.querySelector('#cs-tab-login');
        const signupTabBtn = modal.querySelector('#cs-tab-signup');
        const forgotPwBtn = modal.querySelector('#cs-btn-forgot-pw');
        const backToLoginBtn = modal.querySelector('#cs-btn-back-to-login');

        const loginForm = modal.querySelector('#cs-form-login');
        const signupForm = modal.querySelector('#cs-form-signup');
        const forgotForm = modal.querySelector('#cs-form-forgot');

        // Close handlers
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Tab Switching
        loginTabBtn.addEventListener('click', () => switchTab('login'));
        signupTabBtn.addEventListener('click', () => switchTab('signup'));
        if (forgotPwBtn) forgotPwBtn.addEventListener('click', () => switchTab('forgot'));
        if (backToLoginBtn) backToLoginBtn.addEventListener('click', () => switchTab('login'));

        // Password Show/Hide Toggle
        modal.querySelectorAll('.cs-pw-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = modal.querySelector('#' + targetId);
                if (!input) return;
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = 'Hide';
                } else {
                    input.type = 'password';
                    btn.textContent = 'Show';
                }
            });
        });

        // Form Submit: Login
        loginForm.addEventListener('submit', handleLogin);

        // Form Submit: Signup
        signupForm.addEventListener('submit', handleSignup);

        // Form Submit: Forgot Password
        forgotForm.addEventListener('submit', handleForgotPassword);

        // Escape Key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalEl && modalEl.classList.contains('open')) {
                closeModal();
            }
        });
    }

    // Tab switcher
    function switchTab(tab) {
        activeTab = tab;
        clearAlert();

        const loginTab = modalEl.querySelector('#cs-tab-login');
        const signupTab = modalEl.querySelector('#cs-tab-signup');
        const panelLogin = modalEl.querySelector('#cs-panel-login');
        const panelSignup = modalEl.querySelector('#cs-panel-signup');
        const panelForgot = modalEl.querySelector('#cs-panel-forgot');

        loginTab.classList.toggle('active', tab === 'login');
        signupTab.classList.toggle('active', tab === 'signup');

        panelLogin.style.display  = tab === 'login' ? 'block' : 'none';
        panelSignup.style.display = tab === 'signup' ? 'block' : 'none';
        panelForgot.style.display = tab === 'forgot' ? 'block' : 'none';

        // Focus first input of the active tab
        setTimeout(() => {
            const firstInput = modalEl.querySelector(`#cs-panel-${tab} input:not([type="hidden"])`);
            if (firstInput) firstInput.focus();
        }, 50);
    }

    function showAlert(msg, type = 'error') {
        const box = modalEl.querySelector('#cs-auth-alert');
        box.className = 'cs-alert-box ' + type;
        box.textContent = msg;
        box.style.display = 'block';
    }

    function clearAlert() {
        const box = modalEl.querySelector('#cs-auth-alert');
        if (box) {
            box.style.display = 'none';
            box.textContent = '';
        }
    }

    function setFieldError(fieldId, errorMsg) {
        const errEl = modalEl.querySelector('#' + fieldId + '-err');
        const inputEl = modalEl.querySelector('#' + fieldId);
        if (errEl) {
            errEl.textContent = errorMsg;
            errEl.style.display = errorMsg ? 'block' : 'none';
        }
        if (inputEl) {
            inputEl.classList.toggle('error', !!errorMsg);
        }
    }

    function clearAllErrors() {
        modalEl.querySelectorAll('.cs-form-error').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        modalEl.querySelectorAll('.cs-form-input').forEach(el => {
            el.classList.remove('error');
        });
    }

    // Submit: Login
    function handleLogin(e) {
        e.preventDefault();
        clearAlert();
        clearAllErrors();

        const email = modalEl.querySelector('#cs-login-email').value;
        const password = modalEl.querySelector('#cs-login-password').value;
        const submitBtn = modalEl.querySelector('#cs-login-submit-btn');

        // Inline validation
        if (!email.trim()) {
            setFieldError('cs-login-email', 'Please enter your student email.');
            return;
        }
        if (!password.trim()) {
            setFieldError('cs-login-password', 'Please enter your password.');
            return;
        }

        // Loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing In...';

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            const res = Auth.login(email, password);
            if (!res.success) {
                showAlert(res.error, 'error');
                return;
            }

            // Success
            showAlert('Signed in successfully! Redirecting...', 'success');
            setTimeout(() => {
                closeModal();
                // If user is not yet registered for this event, open the registration stepper
                if (!res.isRegistered) {
                    if (global.CampusSprint.RegistrationStepper) {
                        global.CampusSprint.RegistrationStepper.open();
                    }
                }
            }, 500);
        }, 350);
    }

    // Submit: Signup
    function handleSignup(e) {
        e.preventDefault();
        clearAlert();
        clearAllErrors();

        const fullName = modalEl.querySelector('#cs-signup-name').value;
        const email = modalEl.querySelector('#cs-signup-email').value;
        const college = modalEl.querySelector('#cs-signup-college').value;
        const password = modalEl.querySelector('#cs-signup-password').value;
        const confirmPassword = modalEl.querySelector('#cs-signup-confirm').value;
        const submitBtn = modalEl.querySelector('#cs-signup-submit-btn');

        // Validation
        let hasError = false;
        if (!fullName.trim()) {
            setFieldError('cs-signup-name', 'Full name is required.');
            hasError = true;
        }
        if (!email.trim()) {
            setFieldError('cs-signup-email', 'Student email is required.');
            hasError = true;
        } else if (!Auth.isValidEmail(email)) {
            setFieldError('cs-signup-email', 'Please enter a valid email address format.');
            hasError = true;
        }
        if (!college.trim()) {
            setFieldError('cs-signup-college', 'College name is required.');
            hasError = true;
        }
        if (!password) {
            setFieldError('cs-signup-password', 'Password is required.');
            hasError = true;
        } else if (password.length < 6) {
            setFieldError('cs-signup-password', 'Password must be at least 6 characters.');
            hasError = true;
        }
        if (password !== confirmPassword) {
            setFieldError('cs-signup-confirm', 'Passwords do not match.');
            hasError = true;
        }

        if (hasError) return;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            const res = Auth.signup({
                fullName,
                email,
                college,
                password,
                confirmPassword
            });

            if (!res.success) {
                if (res.field) {
                    setFieldError('cs-signup-' + res.field, res.error);
                } else {
                    showAlert(res.error, 'error');
                }
                return;
            }

            showAlert('Account created! Welcome to CampusCrafters.', 'success');
            setTimeout(() => {
                closeModal();
                // Open registration stepper for the newly signed-up user
                if (global.CampusSprint.RegistrationStepper) {
                    global.CampusSprint.RegistrationStepper.open();
                }
            }, 500);
        }, 400);
    }

    // Submit: Forgot Password
    function handleForgotPassword(e) {
        e.preventDefault();
        clearAlert();
        clearAllErrors();

        const email = modalEl.querySelector('#cs-forgot-email').value;
        const submitBtn = modalEl.querySelector('#cs-forgot-submit-btn');

        if (!email.trim()) {
            setFieldError('cs-forgot-email', 'Please enter your student email.');
            return;
        }
        if (!Auth.isValidEmail(email)) {
            setFieldError('cs-forgot-email', 'Please enter a valid email format.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
            const res = Auth.forgotPassword(email);
            showAlert(res.message, 'info');
        }, 300);
    }

    // Public API: Open Modal
    function openModal(initialTab = 'login') {
        const dom = createModalDOM();
        lastActiveElement = document.activeElement;
        switchTab(initialTab);
        dom.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // Public API: Close Modal
    function closeModal() {
        if (!modalEl) return;
        modalEl.classList.remove('open');
        document.body.style.overflow = '';
        clearAlert();
        clearAllErrors();
        if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
        }
    }

    // Expose API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.AuthModal = {
        open: openModal,
        close: closeModal
    };

})(window);

