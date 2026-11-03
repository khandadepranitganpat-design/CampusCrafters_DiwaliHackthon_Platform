/* ==========================================================================
   CampusSprint State Manager
   Pub-sub state management for event and visitor states.
   Depends on: state-config.js, utils/storage.js
   ========================================================================== */
(function(global) {
    'use strict';

    const Config  = global.CampusSprint.Config;
    const Storage = global.CampusSprint.Storage;

    const VALID_EVENT_STATES   = Object.values(Config.EVENT_STATES);
    const VALID_VISITOR_STATES = Object.values(Config.VISITOR_STATES);

    class StateManager {
        constructor() {
            this._listeners = [];
            this._state = this._loadState();
        }

        _loadState() {
            const rawEvent   = Storage.get(Config.STORAGE_KEYS.EVENT_STATE,   Config.DEFAULT_EVENT_STATE);
            const rawVisitor = Storage.get(Config.STORAGE_KEYS.VISITOR_STATE, Config.DEFAULT_VISITOR_STATE);
            return {
                eventState:   VALID_EVENT_STATES.includes(rawEvent)     ? rawEvent   : Config.DEFAULT_EVENT_STATE,
                visitorState: VALID_VISITOR_STATES.includes(rawVisitor) ? rawVisitor : Config.DEFAULT_VISITOR_STATE
            };
        }

        _saveState() {
            Storage.set(Config.STORAGE_KEYS.EVENT_STATE,   this._state.eventState);
            Storage.set(Config.STORAGE_KEYS.VISITOR_STATE, this._state.visitorState);
        }

        _notify(prevState) {
            const snapshot = this.getSnapshot();
            this._listeners.forEach(fn => {
                try { fn(snapshot, prevState); } catch (e) { console.error('[CampusSprint StateManager] Listener error:', e); }
            });
        }

        // --- Public API ---

        getSnapshot() {
            return Object.assign({}, this._state);
        }

        getEventState()   { return this._state.eventState;   }
        getVisitorState() { return this._state.visitorState; }

        setEventState(newState) {
            if (!VALID_EVENT_STATES.includes(newState)) {
                console.warn('[CampusSprint StateManager] Invalid event state:', newState);
                return false;
            }
            if (this._state.eventState === newState) return true; // no-op, no notification
            const prev = this.getSnapshot();
            this._state.eventState = newState;
            this._saveState();
            this._notify(prev);
            return true;
        }

        setVisitorState(newState) {
            if (!VALID_VISITOR_STATES.includes(newState)) {
                console.warn('[CampusSprint StateManager] Invalid visitor state:', newState);
                return false;
            }
            if (this._state.visitorState === newState) return true;
            const prev = this.getSnapshot();
            this._state.visitorState = newState;
            this._saveState();
            this._notify(prev);
            return true;
        }

        subscribe(fn) {
            if (typeof fn !== 'function') return () => {};
            if (this._listeners.includes(fn)) return () => { this._listeners = this._listeners.filter(l => l !== fn); };
            this._listeners.push(fn);
            // Immediately call with current state
            try { fn(this.getSnapshot(), null); } catch (e) { console.error('[CampusSprint StateManager] Initial listener error:', e); }
            return () => { this._listeners = this._listeners.filter(l => l !== fn); };
        }

        reset() {
            const prev = this.getSnapshot();
            this._state.eventState   = Config.DEFAULT_EVENT_STATE;
            this._state.visitorState = Config.DEFAULT_VISITOR_STATE;
            this._saveState();
            this._notify(prev);
        }
    }

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.stateManager = new StateManager();

})(window);

