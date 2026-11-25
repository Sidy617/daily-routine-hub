# Cyber Ops & Dev Daily Routine Hub

A structured, self-contained daily routine tracker, weekly/monthly performance compiler, and automated end-of-day standup report generator built for university studies, software/AI engineering, and cybersecurity labs.

## Overview

This web application organizes a high-intensity daily schedule into dedicated time blocks, logs progress and blockers, and automatically compiles daily data into weekly and monthly analytics—complete with shareable visual report cards for teammates.

### Daily Schedule Structure
- **06:00 – 06:15 | Morning Reflection & Mindset:** Daily intention setting and mental clarity.
- **07:00 – 16:00 | University Studies & Growth:** Assignments, exam preparation, reading books, communication/life speeches, and researching emerging trends.
- **16:00 – 20:00 | Engineering & AI Innovation:** Full-stack web development, AI projects, coding tasks, and feature commits.
- **20:00 – 23:30 | Cybersecurity & Pentesting:** PortSwigger Web Security Academy reading and labs, offensive security practice, and technical skill building.
- **23:30 – 00:00 | End-of-Day Review & Planning:** Evaluating completed goals, documenting blockers/reasons, defining corrective actions, and setting next-day priorities.

## Key Features

- **Interactive Daily Feeder:** Add, edit, and track tasks across each time block with status toggles (`TODO`, `IN PROGRESS`, `DONE`) and technical notes/commit references.
- **Automated End-of-Day Visual Report Card:** Generates an executive summary card with completion rates, block breakdowns, blockers, and next-day priorities.
- **Team Sharing & Exports:**
  - **Compact Shareable Link:** Encodes the daily report into a URL hash (`#r=...`) so teammates can open a clean, read-only view of your report card directly in their browser.
  - **High-DPI PNG Export:** Download a crisp `.png` image of the visual report card for easy sharing on WhatsApp, Slack, or Discord.
  - **Print / Save as PDF:** Formatted print stylesheet for clean single-page PDF exports.
- **Sunday Recovery & Strategic Planning:** Automatically switches Sundays into a rest and reflection mode with a dedicated **Next Week Main Goals** planner.
- **Weekly & Monthly Rollups:** Compiles daily logs into 7-day and full-month views with completion heatmaps, category breakdowns, and automated performance feedback (congratulations, alerts, reminders, and strategic advice).
- **Offline-First & Zero Backend:** Runs as a single `index.html` file using browser `localStorage`—no database or external server setup required.

## Tech Stack

- **Frontend:** HTML5, Tailwind CSS (CDN), Vanilla JavaScript (ES6+)
- **Storage & Sharing:** Browser `localStorage` + Base64URL hash state serialization
- **Export Engine:** Native HTML5 Canvas / SVG rendering + CSS `@media print`
- **Hosting:** Static deployment on Vercel (auto-synced with GitHub)

## Project Structure

```text
daily-routine-hub/
├── index.html      # Complete single-file application (UI, logic, and export engine)
└── README.md       # Project documentation
