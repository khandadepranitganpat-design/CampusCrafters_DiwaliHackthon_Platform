# CampusCrafter: Diwali Hackathon Portal 🚀
*A live 24-hour hackathon management ecosystem under Campus Crafter.*

CrafterSpark is a comprehensive platform designed to handle the entire lifecycle of a hackathon. From participant authentication and team matchmaking to live event countdowns, server-side locked submissions, and evaluator scoring, this portal ensures a seamless experience for participants, administrators, and judges.

## 🛠 Tech Stack (Unified Ground-Truth)
- **Frontend:** Responsive HTML5, Modern CSS (Tailwind/Custom), Vanilla/Modular JavaScript
- **Backend:** Python Flask API
- **Database (Development):** SQLite
- **Database (Production):** PostgreSQL (Supabase)
- **Integrations:** Campus Crafter SSO, Discord (Matchmaking)

## 🏗 System Architecture & Workflows
The platform is strictly divided into four operational phases with isolated permissions:

1. **Access & Gateway:** Users authenticate via Campus Crafter SSO. Unauthenticated users are redirected for a handshake and returned with a session token.
2. **Public Portal (Landing Hub):** Features the event timeline, rules, sponsor ribbons, a teaser countdown, and locked problem statements. Solo participants are routed to Discord to find a team.
3. **Live Hackathon Workspace:** 
   - **Team Registration:** Strict 1-team-per-user rule enforced via unique Email & Phone Number validation.
   - **Dashboard:** Synced 24-hour countdown, broadcast alerts, and dynamic problem statement unlocking.
   - **Submissions:** Accepts Abstract, Tech Stack, Drive/Canva Deck URL, GitHub Repo URL, and Live Demo link. Fully editable until the server-side timer expires.
4. **Operations & Evaluator Hub (Separated Lifecycles):**
   - **Admin Command Console:** Elevated Read/Write access to push flash announcements, toggle problem statements, and override global timers.
   - **Evaluator Review Portal:** Isolated Read-Only access to review team submissions, inspect repositories, and submit scores.

## 🗄️ Database Entities (Overview)
- **Teams & Members:** Tracks team composition (2-4 members). Enforces global uniqueness on contact details to prevent duplicate participation.
- **Problem Statements:** Stores challenges, unlocked globally by Admin command.
- **Submissions:** Stores project links and abstracts. Tied strictly to the system timer for lock-out.
- **Announcements:** System-wide flash messages (Info vs. Critical).

## 🚀 Local Setup & Development

### 1. Clone the Repository
```bash
git clone https://github.com/khandadepranitganpat-design/crafterspark.git
cd crafterspark
```

### 2. Backend Environment (Python Flask)
```bash
# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory. *(Contact the Tech Lead for production Supabase keys).*
```env
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///local_dev.db
# SUPABASE_URL=your_production_url
# SUPABASE_KEY=your_production_key
```

### 4. Run the Application
```bash
flask run
```

---
*Maintained by the Campus Crafter Tech Team.*


## 👥 Core Engineering Team

* **Atharva Kharat** – *Database Engineer*
  * Leads database architecture, Supabase integration, and all data connectivity operations.

* **Atharv Sherkar** – *DevOps & Community Integration*
  * Manages cloud hosting environments, Git version control workflows, and Discord server infrastructure.

* **Ayush Jain** – *Frontend Developer & UI/UX Designer*
  * Drives the complete frontend development, user interface design, and user experience optimization.

* **Mangesh Mahajan** – *Backend Developer*
  * Handles core server-side logic, data processing, and backend system implementation.

* **Pranit Khandade** – *Project Lead & System Architect*
  * Directs base operations, product ideation, workflow design, overall system architecture, and frontend collaboration.

* **Vaibhav Patil Dhumal** – *API Engineer & Architecture Support*
  * Develops and manages RESTful APIs, handles client-server requests, and assists in system architecture planning.
