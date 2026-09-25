// import React,{useState} from "react";
// import { FileAudio } from "lucide-react";
// import { Shell, PageTitle, SectionTitle } from "../components/Layout";
// import IncidentTable from "../components/IncidentTable";
// import { incidents } from "../data";

// export default function Investigations(){
//  const [filter,setFilter]=useState("All");
//  const list=filter==="All"?incidents:incidents.filter(x=>x.level===filter.toUpperCase()||(filter==="Open"&&x.status==="OPEN")||(filter==="Resolved"&&x.status==="RESOLVED"));
//  return <Shell><PageTitle eyebrow="Review flagged voice security incidents" title="INVESTIGATIONS"/><div className="content"><div className="filters">{["All","Critical","High","Medium","Low","Open","Resolved"].map(f=><button className={filter===f?"selected":""} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div><section className="panel"><SectionTitle icon={<FileAudio size={15}/>} title="Investigation Queue" subtitle="5 cases in current view · live calls and uploaded audio use the same risk engine"/><IncidentTable rows={list}/></section></div></Shell>
// }
// import React,{useState} from "react";
// import { FileAudio } from "lucide-react";
// import { Shell, PageTitle, SectionTitle } from "../components/Layout";
// import IncidentTable from "../components/IncidentTable";
// import { incidents } from "../data";

// export default function Investigations(){
//  const [filter,setFilter]=useState("All");
//  const list=filter==="All"?incidents:incidents.filter(x=>x.level===filter.toUpperCase()||(filter==="Open"&&x.status==="OPEN")||(filter==="Resolved"&&x.status==="RESOLVED"));
//  return <Shell><PageTitle eyebrow="Review flagged voice security incidents" title="INVESTIGATIONS"/><div className="content"><div className="filters">{["All","Critical","High","Medium","Low","Open","Resolved"].map(f=><button className={filter===f?"selected":""} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div><section className="panel"><SectionTitle icon={<FileAudio size={15}/>} title="Investigation Queue" subtitle="5 cases in current view · live calls and uploaded audio use the same risk engine"/><IncidentTable rows={list}/></section></div></Shell>
// }
import { API_BASE_URL } from "./config";
import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileAudio,
  ShieldAlert,
  X,
} from "lucide-react";


import { Shell, PageTitle, SectionTitle } from "../components/Layout";
import { incidents } from "../data";

export default function Investigations() {
  const [filter, setFilter] = useState("All");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadInvestigations = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/overview`)

        if (!response.ok) {
          throw new Error("Failed to load investigations");
        }

        const data = await response.json();

        if (mounted) {
          setIncidents(
            Array.isArray(data.recent_incidents)
              ? data.recent_incidents
              : []
          );
          setError("");
        }
      } catch (err) {
        console.error("Investigation fetch error:", err);

        if (mounted) {
          setError("Backend unavailable");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInvestigations();

    const interval = setInterval(loadInvestigations, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const list =
    filter === "All"
      ? incidents
      : incidents.filter(
          (x) =>
            String(x.level || "").toUpperCase() ===
              filter.toUpperCase() ||
            (filter === "Open" &&
              String(x.status || "").toUpperCase() === "OPEN") ||
            (filter === "Resolved" &&
              String(x.status || "").toUpperCase() === "RESOLVED")
        );

  return (
    <Shell>
      <div className="investigations-page">

        <PageTitle
          eyebrow="Review flagged voice security incidents"
          title="INVESTIGATIONS"
        />

        <div className="content investigations-content">

          {/* =====================================================
              FILTERS
          ===================================================== */}

          <div className="filter-bar">

            <div className="filter-heading">
              <span>CASE FILTER</span>
              <strong>{list.length} incidents</strong>
            </div>

            <div className="filters">
              {[
                "All",
                "Critical",
                "High",
                "Medium",
                "Low",
                "Open",
                "Resolved",
              ].map((item) => (
                <button
                  key={item}
                  className={filter === item ? "selected" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>

          </div>


          {/* =====================================================
              INVESTIGATION QUEUE
          ===================================================== */}

          <section className="investigation-panel">

            <SectionTitle
              icon={<FileAudio size={15} />}
              title="Investigation Queue"
              subtitle={`${list.length} cases in current view · live calls and uploaded audio use the same risk engine`}
            />

            <div className="table-wrapper">

              <table className="investigation-table">

                <thead>
                  <tr>
                    <th>INCIDENT</th>
                    <th>TYPE</th>
                    <th>RISK</th>
                    <th>STATUS</th>
                    <th>TIME</th>
                    <th className="action-head"></th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
    <tr>
      <td colSpan="6" className="empty-state">
        Loading live investigations...
      </td>
    </tr>
  ) : error ? (
    <tr>
      <td colSpan="6" className="empty-state">
        {error}
      </td>
    </tr>
  ) : list.length === 0 ? (
    <tr>
      <td colSpan="6" className="empty-state">
        No incidents found for this filter.
      </td>
    </tr>
  ) : (
    list.map((incident, index) => (
      <IncidentRow
        key={
          incident.id ||
          incident.timestamp ||
          index
        }
        incident={incident}
        onOpen={() => setSelectedIncident(incident)}
      />
    ))
  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>


        {/* =====================================================
            INCIDENT DETAIL MODAL
        ===================================================== */}

        {selectedIncident && (
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedIncident(null);
              }
            }}
          >

            <div
              className="incident-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Incident details"
            >

              {/* MODAL HEADER */}

              <div className="modal-header">

                <div className="modal-title-area">

                  <div className="modal-icon">
                    <ShieldAlert size={19} />
                  </div>

                  <div>
                    <span className="modal-eyebrow">
                      INCIDENT DETAILS
                    </span>

                    <h2>
                      {selectedIncident.id || "Incident"}
                    </h2>
                  </div>

                </div>

                <button
                  className="close-modal"
                  onClick={() => setSelectedIncident(null)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

              </div>


              {/* SUMMARY */}

              <div className="modal-summary">

                <div className="summary-item">
                  <span>Risk Level</span>

                  <strong
                    className={`modal-risk ${
                      String(
                        selectedIncident.level || ""
                      ).toLowerCase()
                    }`}
                  >
                    {selectedIncident.level || "—"}
                  </strong>
                </div>

                <div className="summary-item">
                  <span>Status</span>

                  <strong className="modal-status">
                    {selectedIncident.status || "—"}
                  </strong>
                </div>

                <div className="summary-item">
                  <span>Incident ID</span>

                  <strong>
                    {selectedIncident.id || "—"}
                  </strong>
                </div>

              </div>


              {/* ALL DETAILS */}

              <div className="details-heading">
                <span>CASE INFORMATION</span>
              </div>

              <div className="details-grid">

                {Object.entries(selectedIncident).map(
                  ([key, value]) => {

                    // duplicate summary fields ko neeche dobara show
                    // nahi karna
                    if (
                      ["id", "level", "status"].includes(
                        key.toLowerCase()
                      )
                    ) {
                      return null;
                    }

                    return (
                      <DetailItem
                        key={key}
                        label={formatLabel(key)}
                        value={value}
                      />
                    );
                  }
                )}

              </div>


              {/* MODAL FOOTER */}

              <div className="modal-footer">

                <div className="footer-status">
                  {String(selectedIncident.status).toUpperCase() ===
                  "RESOLVED" ? (
                    <>
                      <CheckCircle2 size={15} />
                      Resolved incident
                    </>
                  ) : (
                    <>
                      <Clock3 size={15} />
                      Investigation requires review
                    </>
                  )}
                </div>

                <button
                  className="modal-close-button"
                  onClick={() => setSelectedIncident(null)}
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}


        {/* =====================================================
            PAGE CSS
        ===================================================== */}

        <style>{`

          /* =====================================================
             PAGE BACKGROUND & GLOW
          ===================================================== */

          .investigations-page {
            position: relative;
            min-height: 100%;
            color: #f8fafc; /* Crisp white text */
          }

          /* Cyan Neon Glow */
          .investigations-page::before {
            content: "";
            position: fixed;
            width: 600px;
            height: 600px;
            left: -150px;
            top: 50px;
            background: rgba(6, 182, 212, 0.12);
            filter: blur(150px);
            pointer-events: none;
            z-index: 0;
          }

          /* Purple Neon Glow */
          .investigations-page::after {
            content: "";
            position: fixed;
            width: 600px;
            height: 600px;
            right: -100px;
            bottom: -100px;
            background: rgba(139, 92, 246, 0.12);
            filter: blur(150px);
            pointer-events: none;
            z-index: 0;
          }

          .investigations-content {
            position: relative;
            z-index: 1;
            width: min(1180px, calc(100% - 48px));
            margin: 0 auto;
            padding: 30px 0 80px;
          }

          /* =====================================================
             FILTER BAR
          ===================================================== */

          .filter-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
            padding: 16px 20px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.6); /* Sleek dark blue/grey */
            border: 1px solid rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }

          .filter-heading {
            min-width: 130px;
          }

          .filter-heading span {
            display: block;
            margin-bottom: 4px;
            color: #64748b;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.1em;
          }

          .filter-heading strong {
            color: #f8fafc;
            font-size: 14px;
            font-weight: 600;
          }

          .filters {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .filters button {
            padding: 8px 16px;
            border-radius: 999px;
            color: #94a3b8;
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid transparent;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.2s ease;
          }

          .filters button:hover {
            color: #f8fafc;
            background: rgba(30, 41, 59, 0.8);
          }

          .filters button.selected {
            color: #000000;
            background: #22d3ee; /* Cyan active state */
            border-color: #22d3ee;
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);
          }

          /* =====================================================
             MAIN PANEL
          ===================================================== */

          .investigation-panel {
            padding: 24px;
            border-radius: 16px;
            background: rgba(11, 17, 32, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(16px);
            overflow: hidden;
          }

          .investigation-panel :global(.section-title) {
            margin-bottom: 24px;
          }

          /* =====================================================
             TABLE
          ===================================================== */

          .table-wrapper {
            width: 100%;
            overflow-x: auto;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(15, 23, 42, 0.3);
          }

          .investigation-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 720px;
          }

          .investigation-table th {
            padding: 14px 16px;
            text-align: left;
            color: #64748b;
            background: rgba(30, 41, 59, 0.4);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .investigation-table td {
            padding: 14px 16px;
            color: #cbd5e1;
            background: rgba(15, 23, 42, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            font-size: 12px;
            vertical-align: middle;
          }

          .investigation-table tbody tr {
            transition: background 0.2s ease;
          }

          .investigation-table tbody tr:hover td {
            background: rgba(30, 41, 59, 0.6); /* Hover effect on row */
          }

          .investigation-table tbody tr:last-child td {
            border-bottom: none;
          }

          /* =====================================================
             INCIDENT CELL
          ===================================================== */

          .incident-cell {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .incident-icon {
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            flex-shrink: 0;
            border-radius: 8px;
            color: #22d3ee;
            background: rgba(34, 211, 238, 0.1);
          }

          .incident-main {
            min-width: 0;
          }

          .incident-id {
            display: block;
            color: #f8fafc;
            font-size: 13px;
            font-weight: 600;
          }

          .incident-description {
            display: block;
            max-width: 260px;
            margin-top: 4px;
            color: #94a3b8;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* =====================================================
             BADGES (NEON GLOW STYLES)
          ===================================================== */

          .level-badge,
          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .level-critical {
            color: #ef4444; /* Alert Red */
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }

          .level-high {
            color: #f97316; /* Orange */
            background: rgba(249, 115, 22, 0.1);
            border: 1px solid rgba(249, 115, 22, 0.2);
          }

          .level-medium {
            color: #f59e0b; /* Yellow/Amber */
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
          }

          .level-low {
            color: #10b981; /* Green */
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }

          .status-open {
            color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
          }

          .status-resolved {
            color: #10b981;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }

          /* =====================================================
             RISK SCORE
          ===================================================== */

          .table-risk {
            display: flex;
            align-items: baseline;
            gap: 4px;
          }

          .table-risk strong {
            color: #ef4444; /* Red for high risk */
            font-size: 14px;
          }

          .table-risk span {
            color: #64748b;
            font-size: 10px;
          }

          /* =====================================================
             ARROW ACTION
          ===================================================== */

          .action-cell {
            text-align: right;
          }

          .open-incident {
            width: 32px;
            height: 32px;
            display: grid;
            place-items: center;
            margin-left: auto;
            border-radius: 8px;
            color: #94a3b8;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .open-incident:hover {
            color: #22d3ee;
            background: rgba(34, 211, 238, 0.1);
            transform: translateX(2px);
          }

          /* =====================================================
             EMPTY STATE
          ===================================================== */

          .empty-state {
            padding: 40px !important;
            text-align: center;
            color: #64748b !important;
            font-size: 13px !important;
          }

          /* =====================================================
             MODAL BACKDROP & CONTAINER
          ===================================================== */

          .modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
            background: rgba(2, 6, 23, 0.8);
            backdrop-filter: blur(10px);
          }

          .incident-modal {
            width: min(720px, 100%);
            max-height: min(800px, calc(100vh - 60px));
            overflow-y: auto;
            border-radius: 16px;
            background: #0f172a; /* Solid slate dark */
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(34, 211, 238, 0.1);
            animation: modalIn .2s ease-out;
          }

          @keyframes modalIn {
            from { opacity: 0; transform: translateY(15px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          /* =====================================================
             MODAL HEADER
          ===================================================== */

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(30, 41, 59, 0.5);
          }

          .modal-title-area {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .modal-icon {
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            border-radius: 10px;
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
          }

          .modal-eyebrow {
            display: block;
            margin-bottom: 4px;
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
          }

          .modal-title-area h2 {
            margin: 0;
            color: #f8fafc;
            font-size: 18px;
            font-weight: 600;
          }

          .close-modal {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 5px;
          }

          .close-modal:hover {
            color: #f8fafc;
          }

          /* =====================================================
             MODAL SUMMARY
          ===================================================== */

          .modal-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            padding: 20px 24px;
          }

          .summary-item {
            min-width: 0;
            padding: 16px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.03);
          }

          .summary-item span {
            display: block;
            margin-bottom: 8px;
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .summary-item strong {
            display: block;
            color: #f8fafc;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .modal-risk.critical { color: #ef4444; }
          .modal-risk.high { color: #f97316; }
          .modal-risk.medium { color: #f59e0b; }
          .modal-risk.low { color: #10b981; }
          
          .modal-status { color: #22d3ee !important; text-transform: uppercase; }

          /* =====================================================
             MODAL DETAILS
          ===================================================== */

          .details-heading {
            padding: 0 24px 12px;
          }

          .details-heading span {
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
          }

          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 0 24px 24px;
          }

          .detail-item {
            min-width: 0;
            padding: 14px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.03);
          }

          .detail-item.full-width {
            grid-column: 1 / -1;
          }

          .detail-label {
            display: block;
            margin-bottom: 6px;
            color: #94a3b8;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .detail-value {
            display: block;
            color: #e2e8f0;
            font-size: 12px;
            line-height: 1.5;
            overflow-wrap: anywhere;
          }

          /* =====================================================
             MODAL FOOTER
          ===================================================== */

          .modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }

          .footer-status {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            font-size: 11px;
          }

          .resolved-icon { color: #10b981; }
          .open-icon { color: #f59e0b; }

          .modal-close-button {
            padding: 10px 20px;
            border-radius: 8px;
            color: #fff;
            background: #334155;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: 0.2s;
          }

          .modal-close-button:hover {
            background: #475569;
          }

          /* =====================================================
             RESPONSIVE
          ===================================================== */

          @media (max-width: 850px) {
            .filter-bar {
              align-items: flex-start;
              flex-direction: column;
            }
            .filters {
              justify-content: flex-start;
            }
          }

          @media (max-width: 650px) {
            .investigations-content {
              width: calc(100% - 22px);
              padding-top: 20px;
            }
            .investigation-panel {
              padding: 16px;
            }
            .modal-summary, .details-grid {
              grid-template-columns: 1fr;
            }
            .modal-footer {
              align-items: flex-start;
              flex-direction: column;
              gap: 15px;
            }
            .modal-close-button {
              width: 100%;
            }
          }

        `}</style>
      </div>
    </Shell>
  );
}


/* ================================================================
   INCIDENT ROW
================================================================ */

function IncidentRow({ incident, onOpen }) {
  const level = String(incident.level || "").toLowerCase();

  const status = String(incident.status || "").toLowerCase();

  const description =
    incident.description ||
    incident.summary ||
    incident.reason ||
    incident.type ||
    "Voice security incident";

  const risk =
    incident.risk ??
    incident.score ??
    incident.risk_score ??
    incident.riskScore;

  return (
    <tr>

      <td>
        <div className="incident-cell">

          <div className="incident-icon">
            <FileAudio size={15} />
          </div>

          <div className="incident-main">
            <span className="incident-id">
              {incident.id || "Unknown incident"}
            </span>

            <span className="incident-description">
              {description}
            </span>
          </div>

        </div>
      </td>


      <td>
        {incident.type || incident.category || "Voice incident"}
      </td>


      <td>

        {risk !== undefined && risk !== null ? (
          <div className="table-risk">
            <strong>{risk}</strong>
            <span>/100</span>
          </div>
        ) : (
          <span>—</span>
        )}

      </td>


      <td>
        <span
          className={`level-badge level-${level}`}
        >
          {incident.level || "—"}
        </span>

        <span
          className={`status-badge status-${
            status === "resolved"
              ? "resolved"
              : "open"
          }`}
          style={{ marginLeft: "6px" }}
        >
          {incident.status || "—"}
        </span>
      </td>


      <td>
        {incident.time ||
          incident.timestamp ||
          incident.date ||
          "—"}
      </td>


      <td className="action-cell">

        <button
          type="button"
          className="open-incident"
          onClick={onOpen}
          title="View incident details"
          aria-label={`View details for ${
            incident.id || "incident"
          }`}
        >
          <ChevronRight size={16} />
        </button>

      </td>

    </tr>
  );
}


/* ================================================================
   DETAIL ITEM
================================================================ */

function DetailItem({ label, value }) {
  let displayValue = value;

  if (value === null || value === undefined || value === "") {
    displayValue = "—";
  } else if (typeof value === "object") {
    displayValue = JSON.stringify(value, null, 2);
  } else if (typeof value === "boolean") {
    displayValue = value ? "Yes" : "No";
  }

  const isLong =
    String(displayValue).length > 100;

  return (
    <div
      className={`detail-item ${
        isLong ? "full-width" : ""
      }`}
    >
      <span className="detail-label">
        {label}
      </span>

      <span className="detail-value">
        {displayValue}
      </span>
    </div>
  );
}


/* ================================================================
   LABEL FORMATTER
================================================================ */

function formatLabel(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}