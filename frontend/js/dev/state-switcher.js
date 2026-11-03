/* ==========================================================================
   CampusSprint Developer State Switcher
   DEVELOPMENT ONLY. Only visible when ?dev=1 is in the URL.
   Not a user-facing feature.
   ========================================================================== */
(function(global) {
    'use strict';

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') !== '1') return; // hidden unless ?dev=1

    const SM     = global.CampusSprint && global.CampusSprint.stateManager;
    const Config = global.CampusSprint && global.CampusSprint.Config;
    if (!SM || !Config) {
        console.warn('[CampusSprint DevSwitcher] stateManager or Config not available');
        return;
    }

    const ES     = Config.EVENT_STATES;
    const VS     = Config.VISITOR_STATES;
    const META   = Config.EVENT_STATE_META;
    const VMETA  = Config.VISITOR_STATE_META;

    function createSwitcher() {
        // Inject minimal CSS
        const style = document.createElement('style');
        style.textContent = `
            #cs-dev-switcher {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
            }
            #cs-dev-toggle {
                background: #111111;
                color: #FFC83D;
                border: 2px solid #FFC83D;
                padding: 8px 14px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 3px 3px 0 #FFC83D;
                font-family: inherit;
                font-size: 12px;
                transition: transform 0.1s ease, box-shadow 0.1s ease;
            }
            #cs-dev-toggle:hover {
                transform: translate(1px, 1px);
                box-shadow: 2px 2px 0 #FFC83D;
            }
            #cs-dev-panel {
                display: none;
                background: #111111;
                border: 2px solid #FFC83D;
                box-shadow: 6px 6px 0 #FFC83D;
                padding: 16px;
                margin-top: 8px;
                min-width: 280px;
                max-width: 340px;
                color: #FFF8EB;
            }
            #cs-dev-panel.open { display: block; }
            .cs-dev-section { margin-bottom: 14px; }
            .cs-dev-label {
                color: #FFC83D;
                font-weight: 700;
                margin-bottom: 6px;
                display: block;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .cs-dev-btn-group {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }
            .cs-dev-state-btn {
                background: #222222;
                color: #FFF8EB;
                border: 1px solid #444444;
                padding: 4px 8px;
                cursor: pointer;
                font-family: inherit;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.15s ease;
            }
            .cs-dev-state-btn:hover { background: #333333; }
            .cs-dev-state-btn.active {
                background: #2B50FF;
                border-color: #FFC83D;
                color: #FFFFFF;
                box-shadow: 2px 2px 0 #FFC83D;
            }
            .cs-dev-reset {
                background: #FF5A3C;
                color: #FFFFFF;
                border: 1px solid #FF5A3C;
                padding: 6px 10px;
                cursor: pointer;
                font-family: inherit;
                font-size: 11px;
                font-weight: 700;
                margin-top: 6px;
                width: 100%;
                text-transform: uppercase;
                letter-spacing: 0.03em;
            }
            .cs-dev-reset:hover {
                background: #E0482B;
            }
            .cs-dev-status {
                font-size: 10px;
                color: #FFC83D;
                margin-top: 10px;
                border-top: 1px solid #333333;
                padding-top: 8px;
                line-height: 1.6;
                white-space: pre-line;
            }
        `;
        document.head.appendChild(style);

        // Build HTML
        const container = document.createElement('div');
        container.id = 'cs-dev-switcher';

        const toggle = document.createElement('button');
        toggle.id = 'cs-dev-toggle';
        toggle.textContent = '⚙ DEV SWITCHER';
        toggle.title = 'CampusSprint Developer State Switcher';

        const panel = document.createElement('div');
        panel.id = 'cs-dev-panel';

        // Event state section
        const esSection = document.createElement('div');
        esSection.className = 'cs-dev-section';
        const esLabel = document.createElement('span');
        esLabel.className = 'cs-dev-label';
        esLabel.textContent = 'Event State (8 States)';
        esSection.appendChild(esLabel);

        const esBtnGroup = document.createElement('div');
        esBtnGroup.className = 'cs-dev-btn-group';
        esBtnGroup.id = 'cs-dev-es-btns';
        Object.values(ES).forEach(stateVal => {
            const btn = document.createElement('button');
            btn.className = 'cs-dev-state-btn';
            btn.dataset.state = stateVal;
            btn.dataset.type = 'event';
            btn.textContent = META[stateVal] ? META[stateVal].label : stateVal;
            btn.title = META[stateVal] ? META[stateVal].description : '';
            esBtnGroup.appendChild(btn);
        });
        esSection.appendChild(esBtnGroup);
        panel.appendChild(esSection);

        // Visitor state section
        const vsSection = document.createElement('div');
        vsSection.className = 'cs-dev-section';
        const vsLabel = document.createElement('span');
        vsLabel.className = 'cs-dev-label';
        vsLabel.textContent = 'Visitor State (3 States)';
        vsSection.appendChild(vsLabel);

        const vsBtnGroup = document.createElement('div');
        vsBtnGroup.className = 'cs-dev-btn-group';
        vsBtnGroup.id = 'cs-dev-vs-btns';
        Object.values(VS).forEach(stateVal => {
            const btn = document.createElement('button');
            btn.className = 'cs-dev-state-btn';
            btn.dataset.state = stateVal;
            btn.dataset.type = 'visitor';
            btn.textContent = VMETA[stateVal] ? VMETA[stateVal].label : stateVal;
            btn.title = VMETA[stateVal] ? VMETA[stateVal].description : '';
            vsBtnGroup.appendChild(btn);
        });
        vsSection.appendChild(vsBtnGroup);
        panel.appendChild(vsSection);

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'cs-dev-reset';
        resetBtn.textContent = '↺ Reset to Defaults';
        resetBtn.id = 'cs-dev-reset';
        panel.appendChild(resetBtn);

        // Status display
        const status = document.createElement('div');
        status.className = 'cs-dev-status';
        status.id = 'cs-dev-status';
        panel.appendChild(status);

        container.appendChild(toggle);
        container.appendChild(panel);
        document.body.appendChild(container);

        // --- Event handlers ---

        toggle.addEventListener('click', () => panel.classList.toggle('open'));

        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('.cs-dev-state-btn');
            if (!btn) return;
            const type  = btn.dataset.type;
            const state = btn.dataset.state;
            const Auth  = global.CampusSprint.Auth;
            const RegService = global.CampusSprint.Registration;

            if (type === 'event') {
                SM.setEventState(state);
            }
            if (type === 'visitor') {
                if (state === VS.LOGGED_OUT) {
                    if (Auth) Auth.logout();
                } else if (state === VS.LOGGED_IN_UNREGISTERED) {
                    // Seed with an unregistered user session
                    const unregUser = {
                        id: 'u-demo-unreg',
                        displayName: 'Ravi Kumar',
                        email: 'ravi.k@student.example.edu',
                        college: 'Apex Institute of Technology',
                        course: 'B.Tech Data Science',
                        year: '2nd Year',
                        phone: '+91 91234 56789'
                    };
                    if (Auth) Auth.setCurrentUser(unregUser);
                    SM.setVisitorState(VS.LOGGED_IN_UNREGISTERED);
                } else if (state === VS.REGISTERED) {
                    // Ensure a demo registered user exists in storage
                    const regUser = {
                        id: 'p-001',
                        displayName: 'Arjun Mehta',
                        email: 'arjun.m@student.example.edu',
                        college: 'Apex Institute of Technology',
                        course: 'B.Tech Computer Science',
                        year: '3rd Year',
                        phone: '+91 98765 43210'
                    };
                    if (Auth) Auth.setCurrentUser(regUser);
                    if (RegService && !RegService.hasRegistrationForEmail(regUser.email)) {
                        const mockReg = {
                            id: 'REG-2026-ARJUN',
                            userId: regUser.id,
                            fullName: regUser.displayName,
                            email: regUser.email,
                            college: regUser.college,
                            course: regUser.course,
                            year: regUser.year,
                            phone: regUser.phone,
                            skills: ['React', 'Node.js', 'PostgreSQL'],
                            interests: ['FinTech & Payments'],
                            bio: 'Fullstack developer passionate about fintech.',
                            experience: 'intermediate',
                            trackId: 'fintech',
                            rulesAccepted: true,
                            status: 'confirmed',
                            ticketCode: 'CS26-ARJN-9921',
                            registeredAt: new Date().toISOString()
                        };
                        const existing = RegService.getRegistrations();
                        existing.push(mockReg);
                        global.CampusSprint.Storage.set(Config.STORAGE_KEYS.REGISTRATIONS, JSON.stringify(existing));
                    }
                    SM.setVisitorState(VS.REGISTERED);
                }
            }
        });

        resetBtn.addEventListener('click', () => {
            const Storage = global.CampusSprint.Storage;
            const Auth = global.CampusSprint.Auth;
            // Clear test registrations and custom accounts
            Storage.remove(Config.STORAGE_KEYS.REGISTRATIONS);
            Storage.remove(Config.STORAGE_KEYS.ACCOUNTS);
            Storage.remove(Config.STORAGE_KEYS.WAITLIST);
            if (Auth) Auth.logout();
            SM.reset();
        });

        // --- Sync UI with state ---
        function syncUI(snapshot) {
            // Event state buttons
            document.querySelectorAll('#cs-dev-es-btns .cs-dev-state-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.state === snapshot.eventState);
            });
            // Visitor state buttons
            document.querySelectorAll('#cs-dev-vs-btns .cs-dev-state-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.state === snapshot.visitorState);
            });
            // Status text
            const eMeta = META[snapshot.eventState];
            const vMeta = VMETA[snapshot.visitorState];
            status.textContent =
                'Event: ' + (eMeta ? eMeta.label : snapshot.eventState) + '\n' +
                'Visitor: ' + (vMeta ? vMeta.label : snapshot.visitorState);
        }

        SM.subscribe(syncUI);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSwitcher);
    } else {
        createSwitcher();
    }

})(window);

