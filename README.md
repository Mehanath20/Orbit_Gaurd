# OrbitGuard 🛰️

> **Space Debris Collision Risk Estimator** — SprintStack Hackathon · PS09

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r163-black?logo=threedotjs)](https://threejs.org)
[![satellite.js](https://img.shields.io/badge/satellite.js-5.0-orange)](https://github.com/shashwatak/satellite-js)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

---

## 🔗 Live Demo

**[YOUR_VERCEL_URL]** ← Replace with your Vercel deployment URL

---

## 📸 Preview

> _Screenshot placeholder — add after first deployment_

---

## 🎯 What is OrbitGuard?

OrbitGuard is a real-time space debris collision risk estimator for low Earth orbit (LEO). It tracks **ISRO-SAT1** against 15 simulated debris objects and computes closest approach events using SGP4 orbital propagation, rendering everything in an interactive 3D visualization.

Built for the **SprintStack Hackathon (PS09)** — Department of Space / ISRO challenge track.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| 3D Rendering | Three.js + @react-three/fiber + @react-three/drei |
| Orbit Math | satellite.js (SGP4/SDP4 propagation) |
| Charts | Recharts |
| Animations | Framer Motion |
| Styling | Tailwind CSS + Custom CSS (Blackmorphism design) |
| Deploy | Vercel (static export) |

---

## ⚙️ Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_TEAM/orbitguard
cd orbitguard

# Install dependencies
npm install

# Start dev server
npm run dev

# Open in browser
open http://localhost:3000
```

Build for production:
```bash
npm run build
npm run start
```

---

## 🔭 How It Works

**Orbit Propagation**: OrbitGuard uses the SGP4 (Simplified General Perturbations 4) model implemented in `satellite.js` to propagate Two-Line Element (TLE) sets. For each object, it steps through time at 1-minute intervals over the selected analysis window (6–48 hours), computing the ECI (Earth-Centered Inertial) position vector `(x, y, z)` in kilometers at each timestep. These position vectors form the orbital paths rendered as 3D curves in the visualization.

**Collision Risk Estimation**: For each debris object, the engine computes the Euclidean distance from ISRO-SAT1's position at every shared timestep. The minimum value across all timesteps is the "closest approach distance." Risk is classified as CRITICAL (< 1 km), HIGH (1–5 km), MODERATE (5–20 km), or LOW (≥ 20 km). The time index at which minimum distance occurs becomes the "Time of Closest Approach" (TCA). All computations run client-side using Web Workers conceptually (synchronous in this implementation for simplicity), completing in under 3 seconds on modern hardware.

---

## 📊 Dataset

16 objects total:

| Object | Count | Risk Level |
|---|---|---|
| ISRO-SAT1 | 1 | Primary (ISS-like, ~408 km, 51.6° incl.) |
| DEBRIS-001–002 | 2 | CRITICAL (< 1 km) |
| DEBRIS-003–005 | 3 | HIGH (1–5 km) |
| DEBRIS-006–010 | 5 | MODERATE (5–20 km) |
| DEBRIS-011–015 | 5 | LOW (≥ 20 km) |

TLEs are synthetic but syntactically valid. Object types include Rocket Bodies, Dead Satellites, and Fragments.

---

## ⚠️ Disclaimer

All collision risk outputs are **approximate** and generated from synthetic TLE data. Full perturbation modeling (atmospheric drag, solar radiation pressure, lunar/solar gravity, etc.) is **not implemented**. OrbitGuard is a hackathon prototype — **not for operational use in real satellite operations**.

---

## 👥 Team

**Team Name**: [YOUR_TEAM_NAME]

Built with ❤️ for SprintStack Hackathon PS09 · Department of Space · ISRO

---

## 📄 License

MIT — See [LICENSE](./LICENSE) for details.
