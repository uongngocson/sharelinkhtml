# HTML Share Hub (LAN Drop & Share)

A sleek, self-hosted web panel to drag & drop HTML files, instantly host them, and share direct links with team members across the local network (LAN / Wi-Fi).

## ✨ Features
- 🚀 **Drag & Drop:** Drop any `.html` file and it is immediately uploaded and published.
- 🔗 **Instant LAN URL:** Automatically detects machine IP and generates shareable local network links.
- 📋 **1-Click Copy:** Fast clipboard copy for sharing links over Slack, Teams, Telegram, etc.
- 📱 **QR Code Generation:** Pure client-side QR codes for opening wireframes on mobile devices connected to the same Wi-Fi.
- 🖥️ **Live In-Panel Preview:** Responsive preview with Desktop, Tablet, and Mobile viewports.
- ⚡ **Zero External Dependencies:** Built with pure Node.js HTTP server. No `npm install` needed.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Running the Server
Double-click `start.bat` or run:
```bash
node server.js
```

### Background Mode (Windows)
Double-click `start-hidden.vbs` to run silently without terminal window.
To stop the server, double-click `stop.bat`.

### Default Ports & Access
- Dashboard: `http://localhost:3000` or `http://<YOUR_LAN_IP>:3000`
- Direct File View: `http://<YOUR_LAN_IP>:3000/view/<filename>`
