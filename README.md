# 🌐 Personal Portfolio

A sleek, high-performance personal website designed with a focus on user experience and fluid motion.

### 🛠️ Tech Stack
- **Frontend:** React.js
- **Styling:** CSS3
- **Hosting:** Firebase (frontend), Render (Express API)
- **Database:** PostgreSQL (Neon)
- **Speed:** Optimized for near-instant load times

### 🚀 Key Features
- **Smooth Animations:** Integrated transitions for a premium feel.
- **Fast Performance:** Blazing fast delivery via Firebase Hosting.
- **Responsive:** Fully optimized for all screen sizes.

---
## Local development

```bash
npm install
npm start            # frontend on http://localhost:3000
cd server && npm install && npm run dev   # API on http://localhost:5000
```

Copy `server/.env.example` to `server/.env` and fill in your own values. Never commit `.env` files.

## Deploy

Pushing to `main` deploys the frontend to Firebase Hosting through GitHub Actions. The API runs on Render.

[Visit my site](https://aranyaportfolio.web.app/)
