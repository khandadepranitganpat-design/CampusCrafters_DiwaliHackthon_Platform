/* ==========================================================================
   CampusSprint Storage Utility
   Centralised localStorage wrapper with safe fallbacks.
   ========================================================================== */
(function(global) {
    'use strict';

    function isStorageAvailable() {
        try {
            const key = '__cs26_test__';
            localStorage.setItem(key, '1');
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    const _available = isStorageAvailable();
    const _memoryFallback = {};

    function get(key, defaultValue) {
        try {
            if (!_available) return _memoryFallback[key] !== undefined ? _memoryFallback[key] : defaultValue;
            const raw = localStorage.getItem(key);
            return raw !== null ? raw : defaultValue;
        } catch (e) {
            console.warn('[CampusSprint Storage] get failed for key:', key, e);
            return defaultValue;
        }
    }

    function set(key, value) {
        try {
            if (!_available) { _memoryFallback[key] = value; return; }
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('[CampusSprint Storage] set failed for key:', key, e);
            _memoryFallback[key] = value;
        }
    }

    function remove(key) {
        try {
            if (!_available) { delete _memoryFallback[key]; return; }
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('[CampusSprint Storage] remove failed for key:', key, e);
        }
    }

    global.CampusSprint = global.CampusSprint || {};
    global.CampusSprint.Storage = { get, set, remove, isAvailable: () => _available };

})(window);

