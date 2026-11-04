/* ==========================================================================
   CampusSprint Shared Navigation & CTA Controller
   Handles mobile drawer toggling, active page links, and state reactivity across all pages.
   ========================================================================== */
(function(global) {
    'use strict';

    function initNav() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileDrawer = document.getElementById('mobile-drawer');
        const drawerBackdrop = mobileDrawer ? mobileDrawer.querySelector('.drawer-backdrop') : null;
        const drawerClose = document.getElementById('drawer-close-btn');
        const drawerLinks = mobileDrawer ? mobileDrawer.querySelectorAll('a') : [];

        function openDrawer() {
            if (!mobileDrawer) return;
            mobileDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
            if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
        }

        function closeDrawer() {
            if (!mobileDrawer) return;
            mobileDrawer.classList.remove('open');
            document.body.style.overflow = '';
            if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }

        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
        if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
        if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                // If it's an anchor on the same page, close drawer
                if (link.getAttribute('href').startsWith('#') || link.getAttribute('href').includes(window.location.pathname)) {
                    closeDrawer();
                }
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeDrawer();
        });

        // Wire CTA buttons to CampusSprint.handleCtaAction if available
        const heroBtn = document.getElementById('hero-cta-btn');
        const navBtn = document.getElementById('nav-cta-btn');
        const drawerBtn = document.getElementById('drawer-cta-btn');
        const finalBtn = document.getElementById('final-cta-btn');
        const navLoginBtn = document.getElementById('nav-login-btn');
        const drawerLoginBtn = document.getElementById('drawer-login-btn');
        const navLogoutBtn = document.getElementById('nav-logout-btn');
        const drawerLogoutBtn = document.getElementById('drawer-logout-btn');

        function triggerAction(action) {
            if (global.CampusSprint && typeof global.CampusSprint.handleCtaAction === 'function') {
                global.CampusSprint.handleCtaAction(action);
            } else if (global.CampusSprint) {
                // Shared Fallback CTA Action
                const SM = global.CampusSprint.stateManager;
                const Config = global.CampusSprint.Config;
                const Auth = global.CampusSprint.Auth;
                const AuthModal = global.CampusSprint.AuthModal;
                const Stepper = global.CampusSprint.RegistrationStepper;
                const Waitlist = global.CampusSprint.WaitlistModal;

                if (action === 'login') {
                    if (AuthModal) AuthModal.open('login');
                    return;
                }
                if (action === 'logout') {
                    if (Auth) Auth.logout();
                    if (window.location.pathname.includes('dashboard.html')) {
                        window.location.href = 'campus_sprint_hackathon.html';
                    }
                    return;
                }
                if (action === 'register') {
                    if (!SM) return;
                    const snapshot = SM.getSnapshot();
                    const eventState = snapshot.eventState;
                    const visitorState = snapshot.visitorState;

                    if (eventState === Config.EVENT_STATES.FULL) {
                        if (Waitlist) Waitlist.open();
                        return;
                    }
                    if (visitorState === Config.VISITOR_STATES.LOGGED_OUT) {
                        if (AuthModal) AuthModal.open('signup');
                    } else if (visitorState === Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED) {
                        if (Stepper) Stepper.open();
                    } else if (visitorState === Config.VISITOR_STATES.REGISTERED) {
                        if (window.location.pathname.includes('dashboard.html')) {
                            const openBtn = document.getElementById('open-ticket-pass-btn');
                            if (openBtn) openBtn.click();
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }
                }
            }
        }

        if (heroBtn) heroBtn.addEventListener('click', () => triggerAction('register'));
        if (navBtn) navBtn.addEventListener('click', () => triggerAction('register'));
        if (drawerBtn) drawerBtn.addEventListener('click', () => triggerAction('register'));
        if (finalBtn) finalBtn.addEventListener('click', () => triggerAction('register'));

        if (navLoginBtn) navLoginBtn.addEventListener('click', () => triggerAction('login'));
        if (drawerLoginBtn) drawerLoginBtn.addEventListener('click', () => triggerAction('login'));
        if (navLogoutBtn) navLogoutBtn.addEventListener('click', () => triggerAction('logout'));
        if (drawerLogoutBtn) drawerLogoutBtn.addEventListener('click', () => triggerAction('logout'));

        // Subscribe to State Manager if available to keep CTAs and Dashboard visibility synchronized
        if (global.CampusSprint && global.CampusSprint.stateManager) {
            const SM = global.CampusSprint.stateManager;
            const Config = global.CampusSprint.Config;
            const META = Config.EVENT_STATE_META;

            function updateNavState(snapshot) {
                if (!snapshot) return;
                const eMeta = META[snapshot.eventState];
                if (!eMeta) return;

                const isLoggedIn = snapshot.visitorState !== Config.VISITOR_STATES.LOGGED_OUT;
                const isRegistered = snapshot.visitorState === Config.VISITOR_STATES.REGISTERED;

                if (navLoginBtn) navLoginBtn.style.display = isLoggedIn ? 'none' : 'block';
                if (navLogoutBtn) navLogoutBtn.style.display = isLoggedIn ? 'inline' : 'none';
                if (drawerLoginBtn) drawerLoginBtn.style.display = isLoggedIn ? 'none' : 'block';
                if (drawerLogoutBtn) drawerLogoutBtn.style.display = isLoggedIn ? 'block' : 'none';

                // Dashboard link is visible ONLY when logged in
                const dashLinks = document.querySelectorAll('.nav-dashboard-link, a[href*="dashboard.html"]');
                dashLinks.forEach(link => {
                    if (link.closest('nav') || link.closest('#mobile-drawer') || link.closest('.drawer-panel') || link.classList.contains('nav-dashboard-link')) {
                        link.style.display = isLoggedIn ? '' : 'none';
                    }
                });

                let heroText = eMeta.ctaLabel;
                let navText = 'Register';
                let isEnabled = eMeta.ctaEnabled;

                if (snapshot.eventState === Config.EVENT_STATES.FULL) {
                    heroText = 'Join Priority Waitlist';
                    navText = 'Waitlist';
                    isEnabled = true;
                } else if (snapshot.eventState === Config.EVENT_STATES.REG_OPEN || snapshot.eventState === Config.EVENT_STATES.ALMOST_FULL) {
                    if (snapshot.visitorState === Config.VISITOR_STATES.LOGGED_OUT) {
                        heroText = 'Register with CampusCrafters';
                        navText = 'Register';
                        isEnabled = true;
                    } else if (snapshot.visitorState === Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED) {
                        heroText = 'Complete Your Registration';
                        navText = 'Complete Reg';
                        isEnabled = true;
                    } else if (snapshot.visitorState === Config.VISITOR_STATES.REGISTERED) {
                        heroText = 'View Registration Pass 🎟️';
                        navText = '✓ Registered';
                        isEnabled = true;
                    }
                } else if (snapshot.eventState === Config.EVENT_STATES.EVENT_LIVE) {
                    if (isRegistered) {
                        heroText = 'Open Live Event Discord';
                        navText = 'Discord';
                        isEnabled = true;
                    } else {
                        heroText = 'Registration Closed (Live)';
                        navText = 'Closed';
                        isEnabled = false;
                    }
                }

                if (heroBtn) {
                    heroBtn.textContent = heroText;
                    heroBtn.disabled = !isEnabled;
                    heroBtn.style.opacity = isEnabled ? '1' : '0.6';
                    heroBtn.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
                }
                if (finalBtn) {
                    finalBtn.textContent = heroText;
                    finalBtn.disabled = !isEnabled;
                    finalBtn.style.opacity = isEnabled ? '1' : '0.6';
                    finalBtn.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
                }
                if (navBtn) {
                    navBtn.textContent = navText;
                    navBtn.disabled = !isEnabled;
                    navBtn.style.opacity = isEnabled ? '1' : '0.6';
                    navBtn.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
                }
                if (drawerBtn) {
                    drawerBtn.textContent = navText;
                    drawerBtn.disabled = !isEnabled;
                    drawerBtn.style.opacity = isEnabled ? '1' : '0.6';
                    drawerBtn.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
                }
            }

            // Initial render
            updateNavState(SM.getSnapshot());

            // Reactive subscription
            SM.subscribe(updateNavState);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }

})(window);

