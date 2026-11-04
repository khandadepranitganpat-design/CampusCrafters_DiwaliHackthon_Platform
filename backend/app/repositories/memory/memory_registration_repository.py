"""CampusCrafters Thread-safe In-Memory Registration Repository."""

import threading
from typing import Any, Dict, List, Optional
from app.repositories.interfaces.registration_repository import IRegistrationRepository
from app.repositories.memory.seed_data import DEV_REGISTRATIONS
from app.utils.helpers import utc_now, generate_id, generate_ticket_code


class MemoryRegistrationRepository(IRegistrationRepository):
    """Thread-safe in-memory adapter for registrations and waitlist."""

    def __init__(self, seed: bool = True):
        self._lock = threading.RLock()
        self._registrations: Dict[str, Dict[str, Any]] = {}
        self._user_to_reg: Dict[str, str] = {}
        self._ticket_to_reg: Dict[str, str] = {}
        self._waitlist: Dict[str, Dict[str, Any]] = {}

        if seed:
            for r in DEV_REGISTRATIONS:
                record = dict(r)
                reg_id = record["id"]
                self._registrations[reg_id] = record
                self._user_to_reg[record["user_id"]] = reg_id
                self._ticket_to_reg[record["ticket_code"]] = reg_id

    def create_registration(self, reg_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            record = dict(reg_data)
            reg_id = record.get("id") or generate_id("REG-2026-")
            ticket_code = record.get("ticket_code") or generate_ticket_code()
            record["id"] = reg_id
            record["ticket_code"] = ticket_code
            record.setdefault("status", "confirmed")
            record.setdefault("registered_at", utc_now())

            self._registrations[reg_id] = record
            self._user_to_reg[record["user_id"]] = reg_id
            self._ticket_to_reg[ticket_code] = reg_id
            return dict(record)

    def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            reg_id = self._user_to_reg.get(user_id)
            if reg_id and reg_id in self._registrations:
                return dict(self._registrations[reg_id])
            return None

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            # Need to match through user data or stored email if present
            target = email.strip().lower()
            for r in self._registrations.values():
                if r.get("email", "").strip().lower() == target:
                    return dict(r)
            return None

    def get_by_ticket_code(self, ticket_code: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            reg_id = self._ticket_to_reg.get(ticket_code.strip())
            if reg_id and reg_id in self._registrations:
                return dict(self._registrations[reg_id])
            return None

    def create_waitlist_entry(self, waitlist_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            entry = dict(waitlist_data)
            wl_id = entry.get("id") or generate_id("WL-")
            entry["id"] = wl_id
            entry.setdefault("status", "waitlisted")
            entry.setdefault("submitted_at", utc_now())
            self._waitlist[wl_id] = entry
            return dict(entry)

