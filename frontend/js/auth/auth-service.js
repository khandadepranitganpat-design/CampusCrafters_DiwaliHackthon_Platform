/* ==========================================================================
   CampusSprint Mock Authentication Service (Frontend-Only)
   Provides simulated login, signup, password reset, and session management.
   NOTE: This is a prototype mock service for demonstration purposes only.
         No plaintext passwords are saved to permanent storage.
   ========================================================================== */
(function(global) {
    'use strict';

    const Config  = global.CampusSprint.Config;
    const Storage = global.CampusSprint.Storage;
    const SM      = global.CampusSprint.stateManager;

    // Default mock accounts seeded from participants
    const SEED_ACCOUNTS = [
        {
            id: 'p-001',
            displayName: 'Arjun Mehta',
            email: 'arjun.m@student.example.edu',
            college: 'Apex Institute of Technology',
            course: 'B.Tech Computer Science',
            year: '3rd Year',
            phone: '+91 98765 43210',
            passwordHash: 'bW9ja19oYXNoX0hhY2thdGhvbjIwMjYh', // simulated hash for 'Hackathon2026!'
            createdAt: '2026-10-15T09:00:00Z'
        },
        {
            id: 'p-002',
            displayName: 'Priya Sharma',
            email: 'priya.s@student.example.edu',
            college: 'Apex Institute of Technology',
            course: 'B.Tech Information Technology',
            year: '4th Year',
            phone: '+91 98765 12345',
            passwordHash: 'bW9ja19oYXNoX0hhY2thdGhvbjIwMjYh',
            createdAt: '2026-10-16T10:00:00Z'
        },
        {
            id: 'u-demo-unreg',
            displayName: 'Ravi Kumar',
            email: 'ravi.k@student.example.edu',
            college: 'Apex Institute of Technology',
            course: 'B.Tech Data Science',
            year: '2nd Year',
            phone: '+91 91234 56789',
            passwordHash: 'bW9ja19oYXNoX0hhY2thdGhvbjIwMjYh',
            createdAt: '2026-10-25T11:00:00Z'
        }
    ];

    // Helper: Simulated non-plaintext password hashing for mock storage
    function mockHash(password) {
        return btoa('mock_hash_' + password);
    }

    // Helper: Email format validation
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // Load stored accounts or initialize with seeds
    function getStoredAccounts() {
        const raw = Storage.get(Config.STORAGE_KEYS.ACCOUNTS, null);
        if (!raw) {
            Storage.set(Config.STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
            return SEED_ACCOUNTS;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[CampusSprint Auth] Failed to parse stored accounts, resetting to seeds', e);
            Storage.set(Config.STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
            return SEED_ACCOUNTS;
        }
    }

    function saveAccounts(accounts) {
        Storage.set(Config.STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    }

    // Current User Session
    function getCurrentUser() {
        const raw = Storage.get(Config.STORAGE_KEYS.CURRENT_USER, null);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function setCurrentUser(user) {
        if (!user) {
            Storage.remove(Config.STORAGE_KEYS.CURRENT_USER);
        } else {
            // Never persist password hash in active session object
            const safeUser = Object.assign({}, user);
            delete safeUser.passwordHash;
            Storage.set(Config.STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
        }
    }

    // Check if an email is already taken
    function findAccountByEmail(email) {
        if (!email) return null;
        const accounts = getStoredAccounts();
        const norm = email.trim().toLowerCase();
        return accounts.find(a => a.email.toLowerCase() === norm) || null;
    }

    // Check if user has a registered record in storage
    function isUserRegistered(userEmail) {
        if (!userEmail) return false;
        const RegService = global.CampusSprint.Registration;
        if (RegService && typeof RegService.hasRegistrationForEmail === 'function') {
            return RegService.hasRegistrationForEmail(userEmail);
        }
        const raw = Storage.get(Config.STORAGE_KEYS.REGISTRATIONS, '[]');
        try {
            const regs = JSON.parse(raw);
            return Array.isArray(regs) && regs.some(r => (r.email || '').toLowerCase() === userEmail.toLowerCase());
        } catch (e) {
            return false;
        }
    }

    // Public API: Login
    function login(email, password) {
        if (!email || !email.trim()) {
            return { success: false, error: 'Email address is required.' };
        }
        if (!isValidEmail(email.trim())) {
            return { success: false, error: 'Please enter a valid email address.' };
        }
        if (!password || !password.trim()) {
            return { success: false, error: 'Password is required.' };
        }

        const account = findAccountByEmail(email.trim());
        if (!account) {
            return { success: false, error: 'No account found with this email. Try "arjun.m@student.example.edu" or sign up.' };
        }

        const expectedHash = mockHash(password.trim());
        if (account.passwordHash !== expectedHash) {
            return { success: false, error: 'Incorrect password. (Demo password: Hackathon2026!)' };
        }

        // Login successful
        setCurrentUser(account);

        // Update Visitor State based on registration status
        const registered = isUserRegistered(account.email);
        if (registered) {
            SM.setVisitorState(Config.VISITOR_STATES.REGISTERED);
        } else {
            SM.setVisitorState(Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED);
        }

        return {
            success: true,
            user: getCurrentUser(),
            isRegistered: registered
        };
    }

    // Public API: Signup
    function signup(data) {
        const fullName = (data.fullName || '').trim();
        const email = (data.email || '').trim();
        const college = (data.college || '').trim();
        const password = (data.password || '').trim();
        const confirmPassword = (data.confirmPassword || '').trim();

        if (!fullName) {
            return { success: false, field: 'fullName', error: 'Full name is required.' };
        }
        if (!email) {
            return { success: false, field: 'email', error: 'Email address is required.' };
        }
        if (!isValidEmail(email)) {
            return { success: false, field: 'email', error: 'Please enter a valid email format.' };
        }
        if (findAccountByEmail(email)) {
            return { success: false, field: 'email', error: 'An account with this email already exists. Please log in.' };
        }
        if (!college) {
            return { success: false, field: 'college', error: 'College or institution name is required.' };
        }
        if (!password) {
            return { success: false, field: 'password', error: 'Password is required.' };
        }
        if (password.length < 6) {
            return { success: false, field: 'password', error: 'Password must be at least 6 characters long.' };
        }
        if (password !== confirmPassword) {
            return { success: false, field: 'confirmPassword', error: 'Passwords do not match.' };
        }

        const newAccount = {
            id: 'u-' + Date.now().toString(36),
            displayName: fullName,
            email: email,
            college: college,
            course: data.course ? data.course.trim() : 'Undergraduate',
            year: data.year ? data.year.trim() : '1st Year',
            phone: data.phone ? data.phone.trim() : '',
            passwordHash: mockHash(password),
            createdAt: new Date().toISOString()
        };

        const accounts = getStoredAccounts();
        accounts.push(newAccount);
        saveAccounts(accounts);

        // Auto login on successful signup
        setCurrentUser(newAccount);
        SM.setVisitorState(Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED);

        return {
            success: true,
            user: getCurrentUser(),
            isRegistered: false
        };
    }

    // Public API: Logout
    function logout() {
        setCurrentUser(null);
        SM.setVisitorState(Config.VISITOR_STATES.LOGGED_OUT);
        return { success: true };
    }

    // Public API: Forgot Password
    function forgotPassword(email) {
        if (!email || !email.trim()) {
            return { success: false, error: 'Email address is required.' };
        }
        if (!isValidEmail(email.trim())) {
            return { success: false, error: 'Please enter a valid email format.' };
        }
        // Generic response to avoid account enumeration
        return {
            success: true,
            message: 'If an account exists with this email, simulated reset instructions have been dispatched.'
        };
    }

    // Startup check: sync visitor state with stored session
    function syncSession() {
        const user = getCurrentUser();
        if (user) {
            const registered = isUserRegistered(user.email);
            if (registered && SM.getVisitorState() !== Config.VISITOR_STATES.REGISTERED) {
                SM.setVisitorState(Config.VISITOR_STATES.REGISTERED);
            } else if (!registered && SM.getVisitorState() !== Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED) {
                SM.setVisitorState(Config.VISITOR_STATES.LOGGED_IN_UNREGISTERED);
            }
        } else {
            if (SM.getVisitorState() !== Config.VISITOR_STATES.LOGGED_OUT) {
                SM.setVisitorState(Config.VISITOR_STATES.LOGGED_OUT);
            }
        }
    }

    // Expose API
    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Auth = {
        login,
        signup,
        logout,
        forgotPassword,
        getCurrentUser,
        setCurrentUser,
        isValidEmail,
        syncSession,
        SEED_ACCOUNTS
    };

    // Run initial sync
    syncSession();

})(window);

