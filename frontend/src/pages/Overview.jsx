// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Plus,
//   PhoneCall,
//   AlertTriangle,
//   Activity,
//   ShieldCheck,
//   ArrowUpRight,
// } from "lucide-react";

// import { Shell, PageTitle, SectionTitle } from "../components/Layout";
// import StatCard from "../components/StatCard";
// import RiskChart from "../components/RiskChart";
// import StatusList from "../components/StatusList";
// import IncidentTable from "../components/IncidentTable";

// export default function Overview() {
//   const navigate = useNavigate();

//   const [overview, setOverview] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);


//   // 1. BACKEND FETCH
//   useEffect(() => {

//     let mounted = true;

//     const loadOverview = async () => {
//       try {

//         const response = await fetch(
//           "http://127.0.0.1:8000/api/overview"
//         );

//         if (!response.ok) {
//           throw new Error("Failed to load overview");
//         }

//         const data = await response.json();

//         if (mounted) {
//           setOverview(data);
//           setError(null);
//         }

//       } catch (err) {

//         if (mounted) {
//           setError(err.message);
//         }

//       } finally {

//         if (mounted) {
//           setLoading(false);
//         }

//       }
//     };

//     loadOverview();

//     const interval = setInterval(loadOverview, 3000);

//     return () => {
//       mounted = false;
//       clearInterval(interval);
//     };

//   }, []);


//   // 2. LOADING UI
//   if (loading) {
//     return (
//       <Shell>
//         <div className="overview-page">
//           <div className="overview-content">
//             Loading security overview...
//           </div>
//         </div>
//       </Shell>
//     );
//   }


//   // 3. ERROR UI
//   if (error) {
//     return (
//       <Shell>
//         <div className="overview-page">
//           <div className="overview-content">
//             Backend unavailable: {error}
//           </div>
//         </div>
//       </Shell>
//     );
//   }





//   return (
//     <>
//       <style>{`
//         /* ================================
//            VOXTRACE OVERVIEW
//            Soft Glassmorphism Theme
//         ================================= */

//         .overview-page {
//           position: relative;
//           min-height: 100%;
//           padding-bottom: 40px;
//           color: #e8f3f4;
//         }

//         /* Ambient background glow */
//         .overview-page::before {
//           content: "";
//           position: fixed;
//           width: 520px;
//           height: 520px;
//           top: 60px;
//           right: 8%;
//           border-radius: 50%;
//           background: rgba(0, 220, 190, 0.035);
//           filter: blur(100px);
//           pointer-events: none;
//           z-index: 0;
//         }

//         .overview-page::after {
//           content: "";
//           position: fixed;
//           width: 420px;
//           height: 420px;
//           bottom: 0;
//           left: 20%;
//           border-radius: 50%;
//           background: rgba(0, 130, 255, 0.025);
//           filter: blur(100px);
//           pointer-events: none;
//           z-index: 0;
//         }

//         .overview-content {
//           position: relative;
//           z-index: 1;
//           max-width: 1180px;
//           margin: 0 auto;
//         }

//         /* -------------------------------
//            Header
//         -------------------------------- */

//         .overview-page .page-head {
//           position: relative;
//           z-index: 2;
//           margin-bottom: 22px;
//         }

//         .overview-page .page-head h1 {
//           letter-spacing: 0.08em;
//           font-weight: 650;
//         }

//         .overview-page .eyebrow {
//           color: rgba(143, 177, 182, 0.75);
//           letter-spacing: 0.02em;
//         }

//         /* -------------------------------
//            Analyze button
//         -------------------------------- */

//         .overview-analyze-btn {
//           display: inline-flex;
//           align-items: center;
//           gap: 8px;

//           border: 1px solid rgba(42, 220, 203, 0.35);
//           border-radius: 10px;

//           padding: 9px 15px;

//           color: #061414;
//           background: linear-gradient(
//             135deg,
//             #20d6c5,
//             #35e1c9
//           );

//           box-shadow:
//             0 8px 30px rgba(20, 210, 190, 0.12),
//             inset 0 1px 0 rgba(255,255,255,0.28);

//           transition:
//             transform 180ms ease,
//             box-shadow 180ms ease,
//             filter 180ms ease;
//         }

//         .overview-analyze-btn:hover {
//           transform: translateY(-1px);
//           filter: brightness(1.04);

//           box-shadow:
//             0 12px 35px rgba(20, 210, 190, 0.2),
//             inset 0 1px 0 rgba(255,255,255,0.3);
//         }

//         .overview-analyze-btn:active {
//           transform: translateY(0);
//         }

//         /* -------------------------------
//            Intro
//         -------------------------------- */

//         .overview-intro {
//           max-width: 900px;
//           margin: 0 0 22px 2px;

//           color: rgba(165, 191, 194, 0.72);
//           font-size: 12px;
//           line-height: 1.75;
//         }

//         /* -------------------------------
//            Glass base
//         -------------------------------- */

//         .overview-page .panel,
//         .overview-page .stat-card {
//           position: relative;

//           background:
//             linear-gradient(
//               135deg,
//               rgba(16, 31, 35, 0.72),
//               rgba(8, 18, 22, 0.58)
//             );

//           backdrop-filter: blur(18px);
//           -webkit-backdrop-filter: blur(18px);

//           border: 1px solid rgba(150, 190, 193, 0.10);
//           border-radius: 16px;

//           box-shadow:
//             0 18px 50px rgba(0, 0, 0, 0.18),
//             inset 0 1px 0 rgba(255,255,255,0.035);

//           overflow: hidden;
//         }

//         /*
//           Very subtle top reflection.
//           This removes the "hard box" feeling.
//         */
//         .overview-page .panel::before,
//         .overview-page .stat-card::before {
//           content: "";
//           position: absolute;
//           left: 10%;
//           right: 10%;
//           top: 0;

//           height: 1px;

//           background: linear-gradient(
//             90deg,
//             transparent,
//             rgba(255,255,255,0.09),
//             transparent
//           );

//           pointer-events: none;
//         }

//         /* -------------------------------
//            Stats
//         -------------------------------- */

//         .overview-page .stats-grid {
//           gap: 14px;
//           margin-bottom: 14px;
//         }

//         .overview-page .stat-card {
//           min-height: 116px;
//           padding: 17px 18px;

//           transition:
//             transform 180ms ease,
//             border-color 180ms ease,
//             background 180ms ease;
//         }

//         .overview-page .stat-card:hover {
//           transform: translateY(-2px);

//           border-color: rgba(47, 213, 199, 0.18);

//           background:
//             linear-gradient(
//               135deg,
//               rgba(18, 40, 43, 0.76),
//               rgba(9, 20, 24, 0.66)
//             );
//         }

//         .overview-page .stat-icon {
//           border-radius: 10px;
//           background: rgba(25, 210, 194, 0.06);
//           border: 1px solid rgba(25, 210, 194, 0.10);
//           box-shadow: 0 0 20px rgba(25, 210, 194, 0.04);
//         }

//         /* -------------------------------
//            Main grid
//         -------------------------------- */

//         .overview-page .two-col {
//           gap: 14px;
//           margin-bottom: 14px;
//         }

//         .overview-page .two-col > .panel:first-child {
//           flex: 1.7;
//         }

//         .overview-page .two-col > .panel:last-child {
//           flex: 0.9;
//         }

//         /* -------------------------------
//            Section headers
//         -------------------------------- */

//         .overview-page .section-title {
//           padding-bottom: 13px;
//           margin-bottom: 0;

//           border-bottom: 1px solid rgba(150,190,193,0.055);
//         }

//         .overview-page .section-icon {
//           border-radius: 9px;
//           background: rgba(26, 211, 196, 0.055);
//           border: 1px solid rgba(26, 211, 196, 0.10);
//           box-shadow: 0 0 18px rgba(26,211,196,0.035);
//         }

//         .overview-page .section-title h2 {
//           font-size: 20px;
//           font-weight: 600;
//         }

//         .overview-page .section-title p {
//           color: rgba(148,176,180,0.58);
//         }

//         /* -------------------------------
//            Risk chart
//         -------------------------------- */

//         .overview-page .chart-panel {
//           min-height: 300px;
//         }

//         .overview-page .chart {
//           margin-top: 8px;
//           opacity: 0.92;
//         }

//         /* -------------------------------
//            System status
//         -------------------------------- */

//         .overview-page .status-list {
//           padding-top: 4px;
//         }

//         .overview-page .status-row {
//           padding: 16px 3px;

//           border-bottom: 1px solid rgba(150,190,193,0.055);

//           transition: background 160ms ease;
//         }

//         .overview-page .status-row:last-child {
//           border-bottom: none;
//         }

//         .overview-page .status-row:hover {
//           background: rgba(255,255,255,0.018);
//           border-radius: 8px;
//         }

//         .overview-page .status-row b {
//           color: rgba(80, 225, 165, 0.88);
//           font-size: 12px;
//           letter-spacing: 0.05em;
//         }

//         .overview-page .status-row b i {
//           box-shadow: 0 0 8px rgba(70,230,160,0.8);
//         }

//         /* -------------------------------
//            Recent incidents
//         -------------------------------- */

//         .overview-page .incidents-panel {
//           margin-bottom: 14px;
//         }

//         .overview-page .incidents-panel .table-wrap {
//           border: 0;
//           border-radius: 0 0 16px 16px;
//           overflow-x: auto;
//         }

//         .overview-page table {
//           border-collapse: separate;
//           border-spacing: 0;
//         }

//         .overview-page th {
//           background: rgba(255,255,255,0.012);
//           color: rgba(137,166,170,0.58);
//           border-bottom: 1px solid rgba(150,190,193,0.055);
//         }

//         .overview-page td {
//           border-bottom: 1px solid rgba(150,190,193,0.045);
//           color: rgba(207,224,226,0.76);
//         }

//         .overview-page tbody tr {
//           transition: background 150ms ease;
//         }

//         .overview-page tbody tr:hover {
//           background: rgba(33, 210, 195, 0.025);
//         }

//         /* -------------------------------
//            Bottom cards
//         -------------------------------- */

//         .overview-page .bottom-grid {
//           gap: 14px;
//         }

//         .overview-page .bottom-grid .stat-card {
//           min-height: 108px;
//         }

//         /* -------------------------------
//            Footer strip
//         -------------------------------- */

//         .overview-footer {
//           margin-top: 14px;

//           padding: 12px 16px;

//           text-align: center;

//           border: 1px solid rgba(150,190,193,0.07);
//           border-radius: 12px;

//           background: rgba(12, 23, 27, 0.38);

//           backdrop-filter: blur(14px);
//           -webkit-backdrop-filter: blur(14px);

//           color: rgba(110, 178, 179, 0.5);

//           font-size: 15px;
//           letter-spacing: 0.16em;
//         }

//         /* -------------------------------
//            Responsive
//         -------------------------------- */

//         @media (max-width: 900px) {
//           .overview-content {
//             padding: 0 14px;
//           }

//           .overview-page .two-col {
//             flex-direction: column;
//           }

//           .overview-page .two-col > .panel:first-child,
//           .overview-page .two-col > .panel:last-child {
//             width: 100%;
//           }
//         }

//         @media (max-width: 620px) {
//           .overview-page .stats-grid,
//           .overview-page .bottom-grid {
//             grid-template-columns: 1fr;
//           }

//           .overview-analyze-btn {
//             padding: 8px 11px;
//           }

//           .overview-intro {
//             font-size: 12px;
//           }
//         }
//       `}</style>

//       <Shell>
//         <div className="overview-page">

//           <PageTitle
//             eyebrow="Real-time voice integrity and impersonation risk monitoring"
//             title="SECURITY OVERVIEW"
//           >
//             <button
//               className="overview-analyze-btn"
//               onClick={() => navigate("/analyze")}
//             >
//               <Plus size={14} />
//               Analyze Audio
//               <ArrowUpRight size={13} />
//             </button>
//           </PageTitle>

//           <div className="overview-content">

//             <p className="overview-intro">
//               VoxTrace is a voice fraud prevention and decision-support layer.
//               It combines voice integrity, speaker consistency, behavioural
//               signals and transaction context to determine when a sensitive
//               action requires additional verification.
//             </p>

//             {/* TOP STATS */}

//             <div className="stats-grid">

//               <StatCard
//                 icon={<PhoneCall size={16} />}
//                 value={overview.active_calls}
//                 label="Active Calls"
//                 meta={overview.active_calls_delta}
//               />

//               <StatCard
//                 icon={<AlertTriangle size={16} />}
//                 value={overview.high_risk_calls}
//                 label="High Risk Calls"
//                 tone="red"
//                 meta="Needs action"
//               />

//               <StatCard
//                 icon={<Activity size={16} />}
//                 value={overview.calls_analysed_today}
//                 label="Calls Analysed Today"
//                 tone="green"
//                 meta="+15%"
//               />

//             </div>

//             {/* CHART + SYSTEM STATUS */}

//             <div className="two-col">

//               <section className="panel chart-panel">

//                 <SectionTitle
//                   icon={<Activity size={16} />}
//                   title="Risk Activity"
//                   subtitle="Risk-classified calls · Last 6 hours"
//                 />

//                 <RiskChart />

//               </section>

//               <section className="panel">

//                 <SectionTitle
//                   icon={<ShieldCheck size={16} />}
//                   title="System Status"
//                   subtitle="Demo configuration"
//                 />

//                 <StatusList />

//               </section>

//             </div>

//             {/* INCIDENTS */}

//             <section className="panel incidents-panel">

//               <SectionTitle
//                 icon={<AlertTriangle size={16} />}
//                 title="Recent Incidents"
//               />

//               <IncidentTable compact />

//             </section>

//             {/* BOTTOM STATS */}

//             <div className="bottom-grid">

//               <StatCard
//                 icon={<ShieldCheck size={16} />}
//                 value="0"
//                 label="Verification Pending"
//                 meta="Cases awaiting independent verification."
//               />

//               <StatCard
//                 icon={<ShieldCheck size={16} />}
//                 value="0"
//                 label="Actions Paused"
//                 tone="red"
//                 meta="Sensitive actions held for human review."
//               />

//               <StatCard
//                 icon={<Activity size={16} />}
//                 value="5"
//                 label="Analysis Sources"
//                 meta="Live call 5 · Uploaded audio 0"
//               />

//             </div>

//             <div className="overview-footer">
//               CALL • VOICE • IDENTITY • BEHAVIOUR • CONTEXT • CONTINUOUS TRUST • VERIFICATION • PREVENTION
//             </div>

//           </div>
//         </div>
//       </Shell>
//     </>
//   );
// }

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  PhoneCall,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

import { Shell, PageTitle, SectionTitle } from "../components/Layout";
import StatCard from "../components/StatCard";
import RiskChart from "../components/RiskChart";
import StatusList from "../components/StatusList";
import IncidentTable from "../components/IncidentTable";

export default function Overview() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/overview");
        if (!response.ok) throw new Error("Failed to load overview");
        const data = await response.json();
        if (mounted) {
          setOverview(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOverview();
    const interval = setInterval(loadOverview, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <Shell>
        <div className="overview-page">
          <div className="overview-content">Loading security overview...</div>
        </div>
      </Shell>
    );
  }

  if (error || !overview) {
    return (
      <Shell>
        <div className="overview-page">
          <div className="overview-content">
            Backend unavailable: {error || "No overview data"}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <>
      <style>{`
        /* ================================
           VOXTRACE OVERVIEW
           Soft Glassmorphism Theme
        ================================= */

        .overview-page {
          position: relative;
          min-height: 100%;
          padding-bottom: 40px;
          color: #e8f3f4;
        }

        /* Ambient background glow */
        .overview-page::before {
          content: "";
          position: fixed;
          width: 520px;
          height: 520px;
          top: 60px;
          right: 8%;
          border-radius: 50%;
          background: rgba(0, 220, 190, 0.035);
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }

        .overview-page::after {
          content: "";
          position: fixed;
          width: 420px;
          height: 420px;
          bottom: 0;
          left: 20%;
          border-radius: 50%;
          background: rgba(0, 130, 255, 0.025);
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }

        .overview-content {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
        }

        /* -------------------------------
           Header
        -------------------------------- */

        .overview-page .page-head {
          position: relative;
          z-index: 2;
          margin-bottom: 22px;
        }

        .overview-page .page-head h1 {
          letter-spacing: 0.08em;
          font-weight: 650;
        }

        .overview-page .eyebrow {
          color: rgba(143, 177, 182, 0.75);
          letter-spacing: 0.02em;
        }

        /* -------------------------------
           Analyze button
        -------------------------------- */

        .overview-analyze-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          border: 1px solid rgba(42, 220, 203, 0.35);
          border-radius: 10px;

          padding: 9px 15px;

          color: #061414;
          background: linear-gradient(
            135deg,
            #20d6c5,
            #35e1c9
          );

          box-shadow:
            0 8px 30px rgba(20, 210, 190, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.28);

          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            filter 180ms ease;
        }

        .overview-analyze-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);

          box-shadow:
            0 12px 35px rgba(20, 210, 190, 0.2),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .overview-analyze-btn:active {
          transform: translateY(0);
        }

        /* -------------------------------
           Intro
        -------------------------------- */

        .overview-intro {
          max-width: 900px;
          margin: 0 0 22px 2px;

          color: rgba(165, 191, 194, 0.72);
          font-size: 12px;
          line-height: 1.75;
        }

        /* -------------------------------
           Glass base
        -------------------------------- */

        .overview-page .panel,
        .overview-page .stat-card {
          position: relative;

          background:
            linear-gradient(
              135deg,
              rgba(16, 31, 35, 0.72),
              rgba(8, 18, 22, 0.58)
            );

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          border: 1px solid rgba(150, 190, 193, 0.10);
          border-radius: 16px;

          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255,255,255,0.035);

          overflow: hidden;
        }

        /*
          Very subtle top reflection.
          This removes the "hard box" feeling.
        */
        .overview-page .panel::before,
        .overview-page .stat-card::before {
          content: "";
          position: absolute;
          left: 10%;
          right: 10%;
          top: 0;

          height: 1px;

          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.09),
            transparent
          );

          pointer-events: none;
        }

        /* -------------------------------
           Stats
        -------------------------------- */

        .overview-page .stats-grid {
          gap: 14px;
          margin-bottom: 14px;
        }

        .overview-page .stat-card {
          min-height: 116px;
          padding: 17px 18px;

          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease;
        }

        .overview-page .stat-card:hover {
          transform: translateY(-2px);

          border-color: rgba(47, 213, 199, 0.18);

          background:
            linear-gradient(
              135deg,
              rgba(18, 40, 43, 0.76),
              rgba(9, 20, 24, 0.66)
            );
        }

        .overview-page .stat-icon {
          border-radius: 10px;
          background: rgba(25, 210, 194, 0.06);
          border: 1px solid rgba(25, 210, 194, 0.10);
          box-shadow: 0 0 20px rgba(25, 210, 194, 0.04);
        }

        /* -------------------------------
           Main grid
        -------------------------------- */

        .overview-page .two-col {
          gap: 14px;
          margin-bottom: 14px;
        }

        .overview-page .two-col > .panel:first-child {
          flex: 1.7;
        }

        .overview-page .two-col > .panel:last-child {
          flex: 0.9;
        }

        /* -------------------------------
           Section headers
        -------------------------------- */

        .overview-page .section-title {
          padding-bottom: 13px;
          margin-bottom: 0;

          border-bottom: 1px solid rgba(150,190,193,0.055);
        }

        .overview-page .section-icon {
          border-radius: 9px;
          background: rgba(26, 211, 196, 0.055);
          border: 1px solid rgba(26, 211, 196, 0.10);
          box-shadow: 0 0 18px rgba(26,211,196,0.035);
        }

        .overview-page .section-title h2 {
          font-size: 20px;
          font-weight: 600;
        }

        .overview-page .section-title p {
          color: rgba(148,176,180,0.58);
        }

        /* -------------------------------
           Risk chart
        -------------------------------- */

        .overview-page .chart-panel {
          min-height: 300px;
        }

        .overview-page .chart {
          margin-top: 8px;
          opacity: 0.92;
        }

        /* -------------------------------
           System status
        -------------------------------- */

        .overview-page .status-list {
          padding-top: 4px;
        }

        .overview-page .status-row {
          padding: 16px 3px;

          border-bottom: 1px solid rgba(150,190,193,0.055);

          transition: background 160ms ease;
        }

        .overview-page .status-row:last-child {
          border-bottom: none;
        }

        .overview-page .status-row:hover {
          background: rgba(255,255,255,0.018);
          border-radius: 8px;
        }

        .overview-page .status-row b {
          color: rgba(80, 225, 165, 0.88);
          font-size: 12px;
          letter-spacing: 0.05em;
        }

        .overview-page .status-row b i {
          box-shadow: 0 0 8px rgba(70,230,160,0.8);
        }

        /* -------------------------------
           Recent incidents
        -------------------------------- */

        .overview-page .incidents-panel {
          margin-bottom: 14px;
        }

        .overview-page .incidents-panel .table-wrap {
          border: 0;
          border-radius: 0 0 16px 16px;
          overflow-x: auto;
        }

        .overview-page table {
          border-collapse: separate;
          border-spacing: 0;
        }

        .overview-page th {
          background: rgba(255,255,255,0.012);
          color: rgba(137,166,170,0.58);
          border-bottom: 1px solid rgba(150,190,193,0.055);
        }

        .overview-page td {
          border-bottom: 1px solid rgba(150,190,193,0.045);
          color: rgba(207,224,226,0.76);
        }

        .overview-page tbody tr {
          transition: background 150ms ease;
        }

        .overview-page tbody tr:hover {
          background: rgba(33, 210, 195, 0.025);
        }

        /* -------------------------------
           Bottom cards
        -------------------------------- */

        .overview-page .bottom-grid {
          gap: 14px;
        }

        .overview-page .bottom-grid .stat-card {
          min-height: 108px;
        }

        /* -------------------------------
           Footer strip
        -------------------------------- */

        .overview-footer {
          margin-top: 14px;

          padding: 12px 16px;

          text-align: center;

          border: 1px solid rgba(150,190,193,0.07);
          border-radius: 12px;

          background: rgba(12, 23, 27, 0.38);

          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);

          color: rgba(110, 178, 179, 0.5);

          font-size: 15px;
          letter-spacing: 0.16em;
        }

        /* -------------------------------
           Responsive
        -------------------------------- */

        @media (max-width: 900px) {
          .overview-content {
            padding: 0 14px;
          }

          .overview-page .two-col {
            flex-direction: column;
          }

          .overview-page .two-col > .panel:first-child,
          .overview-page .two-col > .panel:last-child {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .overview-page .stats-grid,
          .overview-page .bottom-grid {
            grid-template-columns: 1fr;
          }

          .overview-analyze-btn {
            padding: 8px 11px;
          }

          .overview-intro {
            font-size: 12px;
          }
        }
      `}</style>

      <Shell>
        <div className="overview-page">

          <PageTitle
            eyebrow="Real-time voice integrity and impersonation risk monitoring"
            title="SECURITY OVERVIEW"
          >
            <button
              className="overview-analyze-btn"
              onClick={() => navigate("/analyze")}
            >
              <Plus size={14} />
              Analyze Audio
              <ArrowUpRight size={13} />
            </button>
          </PageTitle>

          <div className="overview-content">

            <p className="overview-intro">
              VoxTrace is a voice fraud prevention and decision-support layer.
              It combines voice integrity, speaker consistency, behavioural
              signals and transaction context to determine when a sensitive
              action requires additional verification.
            </p>

            {/* TOP STATS */}

            <div className="stats-grid">

              <StatCard
                icon={<PhoneCall size={16} />}
                value={overview.active_calls}
                label="Active Calls"
                meta={overview.active_calls_delta || "Live"}
              />

              <StatCard
                icon={<AlertTriangle size={16} />}
                value={overview.high_risk_calls}
                label="High Risk Calls"
                tone="red"
                meta="Needs action"
              />

              <StatCard
                icon={<Activity size={16} />}
                value={overview.calls_analyzed_today ?? overview.calls_analysed_today ?? 0}
                label="Calls Analysed Today"
                tone="green"
                meta={overview.calls_analyzed_delta || "Live"}
              />

            </div>

            {/* CHART + SYSTEM STATUS */}

            <div className="two-col">

              <section className="panel chart-panel">

                <SectionTitle
                  icon={<Activity size={16} />}
                  title="Risk Activity"
                  subtitle="Risk-classified calls · Last 6 hours"
                />

                <RiskChart data={overview.risk_activity || []} />

              </section>

              <section className="panel">

                <SectionTitle
                  icon={<ShieldCheck size={16} />}
                  title="System Status"
                  subtitle={overview.system_status_label || "Live configuration"}
                />

                <StatusList status={overview.system_status || {}} />

              </section>

            </div>

            {/* INCIDENTS */}

            <section className="panel incidents-panel">

              <SectionTitle
                icon={<AlertTriangle size={16} />}
                title="Recent Incidents"
              />

              <IncidentTable compact rows={overview.recent_incidents || []} />

            </section>

            {/* BOTTOM STATS */}

            <div className="bottom-grid">

              <StatCard
                icon={<ShieldCheck size={16} />}
                value={overview.verification_pending ?? 0}
                label="Verification Pending"
                meta="Cases awaiting independent verification."
              />

              <StatCard
                icon={<ShieldCheck size={16} />}
                value={overview.actions_paused ?? 0}
                label="Actions Paused"
                tone="red"
                meta="Sensitive actions held for human review."
              />

              <StatCard
                icon={<Activity size={16} />}
                value={(overview.analysis_sources?.live_calls || 0) + (overview.analysis_sources?.uploaded_audio || 0)}
                label="Analysis Sources"
                meta={`Live call ${overview.analysis_sources?.live_calls || 0} · Uploaded audio ${overview.analysis_sources?.uploaded_audio || 0}`}
              />

            </div>

            <div className="overview-footer">
              CALL • VOICE • IDENTITY • BEHAVIOUR • CONTEXT • CONTINUOUS TRUST • VERIFICATION • PREVENTION
            </div>

          </div>
        </div>
      </Shell>
    </>
  );
}