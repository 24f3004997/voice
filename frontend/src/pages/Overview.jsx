
import { API_BASE_URL } from "./config";
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
        //const response = await fetch("http://127.0.0.1:8000/api/overview");
        const response = await fetch(`${API_BASE_URL}/api/overview`);
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
           Modern Dark Glassmorphism Theme
        ================================= */

        .overview-page {
          position: relative;
          min-height: 100%;
          padding-bottom: 40px;
          color: #f8fafc;
        }

        /* Ambient background glow - Cyan */
        .overview-page::before {
          content: "";
          position: fixed;
          width: 600px;
          height: 600px;
          top: 60px;
          right: -100px;
          border-radius: 50%;
          background: rgba(34, 211, 238, 0.12); /* Cyan Glow */
          filter: blur(150px);
          pointer-events: none;
          z-index: 0;
        }

        /* Ambient background glow - Purple */
        .overview-page::after {
          content: "";
          position: fixed;
          width: 600px;
          height: 600px;
          bottom: -100px;
          left: -100px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.12); /* Purple Glow */
          filter: blur(150px);
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
          margin-bottom: 24px;
        }

        .overview-page .page-head h1 {
          letter-spacing: 0.05em;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .overview-page .eyebrow {
          color: #94a3b8;
          letter-spacing: 0.1em;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        /* -------------------------------
           Analyze button
        -------------------------------- */

        .overview-analyze-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;

          border: none;
          border-radius: 8px;

          padding: 10px 18px;

          color: #020617;
          background: #22d3ee;

          box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);

          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 11px;
          cursor: pointer;

          transition: all 0.2s ease;
        }

        .overview-analyze-btn:hover {
          transform: translateY(-2px);
          background: #06b6d4;
          box-shadow: 0 10px 25px rgba(34, 211, 238, 0.5);
        }

        .overview-analyze-btn:active {
          transform: translateY(0);
        }

        /* -------------------------------
           Intro
        -------------------------------- */

        .overview-intro {
          max-width: 900px;
          margin: 0 0 24px 2px;

          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        /* -------------------------------
           Glass base (Panels & Cards)
        -------------------------------- */

        .overview-page .panel,
        .overview-page .stat-card {
          position: relative;

          background: rgba(15, 23, 42, 0.6); /* Deep Slate */

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);

          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;

          box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);

          overflow: hidden;
        }

        /* Subtle top reflection */
        .overview-page .panel::before,
        .overview-page .stat-card::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;

          height: 1px;

          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );

          pointer-events: none;
        }

        /* -------------------------------
           Stats
        -------------------------------- */

        .overview-page .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr); /* 3 cards perfectly aligned */
          gap: 16px;
          margin-bottom: 16px;
        }

        .overview-page .stat-card {
          min-height: 120px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;

          transition: all 0.25s ease;
        }

        .overview-page .stat-card:hover {
          transform: translateY(-4px);

          border-color: rgba(34, 211, 238, 0.3);

          background: rgba(30, 41, 59, 0.8);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 211, 238, 0.1);
        }

        .overview-page .stat-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(34, 211, 238, 0.1);
          border: 1px solid rgba(34, 211, 238, 0.2);
          color: #22d3ee;
        }

        .overview-page .stat-card h3 {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 14px 0 6px;
        }

        .overview-page .stat-card .value {
          font-size: 28px;
          font-weight: 700;
          color: #f8fafc;
        }

        /* -------------------------------
           Main grid
        -------------------------------- */

        .overview-page .two-col {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .overview-page .two-col > .panel:first-child {
          flex: 1.7;
          padding: 24px;
        }

        .overview-page .two-col > .panel:last-child {
          flex: 0.9;
          padding: 24px;
        }

        /* -------------------------------
           Section headers
        -------------------------------- */

        .overview-page .section-title {
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .overview-page .section-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(34, 211, 238, 0.1);
          color: #22d3ee;
        }

        .overview-page .section-title h2 {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
          margin: 0;
        }

        .overview-page .section-title p {
          color: #64748b;
          font-size: 12px;
          margin: 4px 0 0;
        }

        /* -------------------------------
           Risk chart
        -------------------------------- */

        .overview-page .chart-panel {
          min-height: 300px;
        }

        .overview-page .chart {
          margin-top: 16px;
          opacity: 0.95;
        }

        /* -------------------------------
           System status
        -------------------------------- */

        .overview-page .status-list {
          padding-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .overview-page .status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;

          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          color: #cbd5e1;
          font-size: 13px;

          transition: background 0.2s ease;
        }

        .overview-page .status-row:last-child {
          border-bottom: none;
        }

        .overview-page .status-row:hover {
          background: rgba(30, 41, 59, 0.6);
        }

        .overview-page .status-row b {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #10b981; /* Bright Green */
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .overview-page .status-row b i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        /* -------------------------------
           Recent incidents (Table)
        -------------------------------- */

        .overview-page .incidents-panel {
          margin-bottom: 16px;
          padding: 24px;
        }

        .overview-page .incidents-panel .table-wrap {
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow-x: auto;
          background: rgba(15, 23, 42, 0.4);
        }

        .overview-page table {
          width: 100%;
          border-collapse: collapse;
        }

        .overview-page th {
          text-align: left;
          padding: 14px 16px;
          background: rgba(30, 41, 59, 0.4);
          color: #64748b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .overview-page td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #cbd5e1;
          font-size: 12px;
        }

        .overview-page tbody tr {
          transition: background 0.2s ease;
        }

        .overview-page tbody tr:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        
        .overview-page tbody tr:last-child td {
          border-bottom: none;
        }

        /* -------------------------------
           Bottom cards
        -------------------------------- */

        .overview-page .bottom-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .overview-page .bottom-grid .stat-card {
          min-height: 120px;
        }

        /* -------------------------------
           Footer strip
        -------------------------------- */

        .overview-footer {
          margin-top: 24px;
          padding: 16px;
          text-align: center;

          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;

          background: rgba(15, 23, 42, 0.6);

          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);

          color: #64748b;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 600;
        }

        /* -------------------------------
           Responsive
        -------------------------------- */

        @media (max-width: 900px) {
          .overview-content {
            padding: 0 16px;
          }

          .overview-page .two-col {
            flex-direction: column;
          }

          .overview-page .two-col > .panel:first-child,
          .overview-page .two-col > .panel:last-child {
            width: 100%;
          }

          .overview-page .stats-grid,
          .overview-page .bottom-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 620px) {
          .overview-page .stats-grid,
          .overview-page .bottom-grid {
            grid-template-columns: 1fr;
          }

          .overview-analyze-btn {
            padding: 12px 14px;
            width: 100%;
            justify-content: center;
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