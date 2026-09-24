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
             PAGE
          ===================================================== */

          .investigations-page {
            position: relative;
            min-height: 100%;
            color: #dce8e9;
          }

          .investigations-page::before {
            content: "";
            position: fixed;

            width: 500px;
            height: 500px;

            left: 0;
            top: 120px;

            background: rgba(0, 190, 200, .08);

            filter: blur(110px);

            pointer-events: none;

            z-index: 0;
          }

          .investigations-page::after {
            content: "";
            position: fixed;

            width: 500px;
            height: 500px;

            right: 0;
            bottom: 0;

            background: rgba(25, 55, 130, .09);

            filter: blur(120px);

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

            margin-bottom: 18px;

            padding: 15px 17px;

            border-radius: 17px;

            background:
              linear-gradient(
                145deg,
                rgba(13, 34, 38, .72),
                rgba(5, 20, 24, .65)
              );

            border: 1px solid rgba(105, 183, 188, .11);

            box-shadow:
              0 15px 50px rgba(0,0,0,.13),
              inset 0 1px 0 rgba(255,255,255,.025);

            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
          }

          .filter-heading {
            min-width: 130px;
          }

          .filter-heading span {
            display: block;

            margin-bottom: 3px;

            color: rgba(72, 193, 201, .55);

            font-size: 9px;
            font-weight: 600;

            letter-spacing: .11em;
          }

          .filter-heading strong {
            color: #d7e5e6;

            font-size: 12px;
            font-weight: 500;
          }

          .filters {
            display: flex;
            align-items: center;

            gap: 7px;

            flex-wrap: wrap;

            justify-content: flex-end;
          }

          .filters button {
            padding: 8px 13px;

            border-radius: 999px;

            color: rgba(164, 187, 189, .65);

            background: rgba(8, 25, 28, .48);

            border: 1px solid rgba(101, 175, 180, .10);

            cursor: pointer;

            font-size: 10px;
            font-weight: 500;

            transition:
              color .18s ease,
              background .18s ease,
              border-color .18s ease,
              transform .18s ease;
          }

          .filters button:hover {
            color: #cce0e1;

            background: rgba(19, 49, 53, .55);

            border-color: rgba(78, 192, 199, .18);

            transform: translateY(-1px);
          }

          .filters button.selected {
            color: #8ce1e4;

            background: rgba(28, 159, 166, .13);

            border-color: rgba(48, 202, 208, .24);

            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.03),
              0 0 18px rgba(20, 190, 198, .05);
          }


          /* =====================================================
             MAIN PANEL
          ===================================================== */

          .investigation-panel {
            padding: 20px;

            border-radius: 20px;

            background:
              linear-gradient(
                145deg,
                rgba(13, 34, 38, .78),
                rgba(5, 20, 24, .70)
              );

            border: 1px solid rgba(105, 183, 188, .12);

            box-shadow:
              0 22px 65px rgba(0,0,0,.18),
              inset 0 1px 0 rgba(255,255,255,.03);

            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);

            overflow: hidden;
          }

          .investigation-panel :global(.section-title) {
            margin-bottom: 18px;
          }


          /* =====================================================
             TABLE
          ===================================================== */

          .table-wrapper {
            width: 100%;

            overflow-x: auto;

            border-radius: 13px;

            border: 1px solid rgba(96, 170, 175, .10);

            background: rgba(3, 17, 20, .35);
          }

          .investigation-table {
            width: 100%;

            border-collapse: separate;
            border-spacing: 0;

            min-width: 720px;
          }

          .investigation-table th {
            padding: 13px 14px;

            text-align: left;

            color: rgba(91, 190, 197, .55);

            background: rgba(9, 29, 32, .60);

            border-bottom: 1px solid rgba(100, 176, 181, .10);

            font-size: 9px;
            font-weight: 600;

            letter-spacing: .10em;
          }

          .investigation-table th:first-child {
            padding-left: 16px;
          }

          .investigation-table th:last-child {
            width: 48px;
          }

          .investigation-table td {
            padding: 13px 14px;

            color: rgba(181, 202, 203, .70);

            background: rgba(4, 19, 22, .30);

            border-bottom: 1px solid rgba(91, 163, 168, .07);

            font-size: 11px;

            vertical-align: middle;
          }

          .investigation-table tbody tr {
            transition:
              background .18s ease;
          }

          .investigation-table tbody tr:hover td {
            background: rgba(21, 53, 57, .28);
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

            gap: 10px;
          }

          .incident-icon {
            width: 31px;
            height: 31px;

            display: grid;
            place-items: center;

            flex-shrink: 0;

            border-radius: 8px;

            color: #35cbd0;

            background: rgba(30, 189, 196, .07);

            border: 1px solid rgba(42, 196, 202, .13);
          }

          .incident-main {
            min-width: 0;
          }

          .incident-id {
            display: block;

            color: #d5e3e4;

            font-size: 11px;
            font-weight: 600;
          }

          .incident-description {
            display: block;

            max-width: 260px;

            margin-top: 3px;

            color: rgba(130, 161, 164, .52);

            font-size: 9px;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }


          /* =====================================================
             BADGES
          ===================================================== */

          .level-badge,
          .status-badge {
            display: inline-flex;
            align-items: center;

            padding: 5px 8px;

            border-radius: 999px;

            font-size: 9px;
            font-weight: 600;

            letter-spacing: .03em;
          }

          .level-critical {
            color: #ff7c88;

            background: rgba(255, 71, 88, .08);

            border: 1px solid rgba(255, 71, 88, .14);
          }

          .level-high {
            color: #ff9b6f;

            background: rgba(255, 125, 75, .07);

            border: 1px solid rgba(255, 125, 75, .13);
          }

          .level-medium {
            color: #e9bd55;

            background: rgba(225, 174, 46, .07);

            border: 1px solid rgba(225, 174, 46, .12);
          }

          .level-low {
            color: #66d7b0;

            background: rgba(53, 187, 139, .07);

            border: 1px solid rgba(53, 187, 139, .12);
          }

          .status-open {
            color: #e3bd64;

            background: rgba(215, 169, 56, .07);

            border: 1px solid rgba(215, 169, 56, .12);
          }

          .status-resolved {
            color: #6fdaa8;

            background: rgba(58, 184, 123, .07);

            border: 1px solid rgba(58, 184, 123, .12);
          }


          /* =====================================================
             RISK SCORE
          ===================================================== */

          .table-risk {
            display: flex;
            align-items: baseline;

            gap: 3px;
          }

          .table-risk strong {
            color: #ff7783;

            font-size: 13px;
          }

          .table-risk span {
            color: rgba(143, 169, 171, .40);

            font-size: 8px;
          }


          /* =====================================================
             ARROW
          ===================================================== */

          .action-cell {
            text-align: right;
          }

          .open-incident {
            width: 31px;
            height: 31px;

            display: grid;
            place-items: center;

            margin-left: auto;

            border-radius: 8px;

            color: rgba(97, 197, 203, .70);

            background: rgba(25, 135, 141, .06);

            border: 1px solid rgba(65, 187, 194, .10);

            cursor: pointer;

            transition:
              color .18s ease,
              background .18s ease,
              border-color .18s ease,
              transform .18s ease;
          }

          .open-incident:hover {
            color: #a0eff1;

            background: rgba(28, 170, 177, .12);

            border-color: rgba(65, 205, 211, .24);

            transform: translateX(2px);
          }


          /* =====================================================
             EMPTY
          ===================================================== */

          .empty-state {
            padding: 40px !important;

            text-align: center;

            color: rgba(140, 168, 170, .50) !important;

            font-size: 12px !important;
          }


          /* =====================================================
             MODAL BACKDROP
          ===================================================== */

          .modal-backdrop {
            position: fixed;

            inset: 0;

            z-index: 9999;

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 30px;

            background: rgba(1, 8, 10, .72);

            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }


          /* =====================================================
             MODAL
          ===================================================== */

          .incident-modal {
            width: min(720px, 100%);

            max-height: min(780px, calc(100vh - 60px));

            overflow-y: auto;

            border-radius: 22px;

            background:
              linear-gradient(
                145deg,
                rgba(16, 40, 44, .96),
                rgba(5, 20, 24, .97)
              );

            border: 1px solid rgba(104, 194, 199, .17);

            box-shadow:
              0 35px 100px rgba(0,0,0,.50),
              inset 0 1px 0 rgba(255,255,255,.045);

            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);

            animation: modalIn .18s ease-out;
          }

          @keyframes modalIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(.985);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }


          /* =====================================================
             MODAL HEADER
          ===================================================== */

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 20px;

            padding: 20px 22px;

            border-bottom: 1px solid rgba(105, 181, 186, .10);
          }

          .modal-title-area {
            display: flex;
            align-items: center;

            gap: 12px;
          }

          .modal-icon {
            width: 40px;
            height: 40px;

            display: grid;
            place-items: center;

            border-radius: 10px;

            color: #ff7884;

            background: rgba(255, 70, 87, .07);

            border: 1px solid rgba(255, 78, 94, .14);
          }

          .modal-eyebrow {
            display: block;

            margin-bottom: 4px;

            color: rgba(80, 193, 200, .56);

            font-size: 9px;
            font-weight: 600;

            letter-spacing: .11em;
          }

          .modal-title-area h2 {
            margin: 0;

            color: #e0ebec;

            font-size: 19px;
            font-weight: 600;
          }

          .close-modal {
            width: 34px;
            height: 34px;

            display: grid;
            place-items: center;

            flex-shrink: 0;

            border-radius: 9px;

            color: rgba(172, 195, 196, .65);

            background: rgba(100, 140, 143, .06);

            border: 1px solid rgba(100, 170, 175, .10);

            cursor: pointer;
          }

          .close-modal:hover {
            color: #e3eeee;

            background: rgba(100, 170, 175, .11);
          }


          /* =====================================================
             SUMMARY
          ===================================================== */

          .modal-summary {
            display: grid;

            grid-template-columns:
              repeat(3, minmax(0, 1fr));

            gap: 10px;

            padding: 18px 22px;
          }

          .summary-item {
            min-width: 0;

            padding: 12px;

            border-radius: 10px;

            background: rgba(3, 18, 21, .45);

            border: 1px solid rgba(99, 172, 177, .09);
          }

          .summary-item span {
            display: block;

            margin-bottom: 6px;

            color: rgba(133, 163, 165, .53);

            font-size: 9px;
          }

          .summary-item strong {
            display: block;

            color: #d4e2e3;

            font-size: 11px;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .summary-item .critical {
            color: #ff6d79;
          }

          .summary-item .high {
            color: #ff9870;
          }

          .summary-item .medium {
            color: #e5ba52;
          }

          .summary-item .low {
            color: #68d9ae;
          }

          .modal-status {
            color: #8ed8b1 !important;
          }


          /* =====================================================
             DETAILS
          ===================================================== */

          .details-heading {
            padding: 0 22px 10px;
          }

          .details-heading span {
            color: rgba(79, 192, 199, .55);

            font-size: 9px;
            font-weight: 600;

            letter-spacing: .11em;
          }

          .details-grid {
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 8px;

            padding: 0 22px 20px;
          }

          .detail-item {
            min-width: 0;

            padding: 12px;

            border-radius: 9px;

            background: rgba(3, 18, 21, .40);

            border: 1px solid rgba(96, 170, 175, .08);
          }

          .detail-item.full-width {
            grid-column: 1 / -1;
          }

          .detail-label {
            display: block;

            margin-bottom: 5px;

            color: rgba(126, 158, 160, .52);

            font-size: 8px;
            font-weight: 600;

            text-transform: uppercase;
            letter-spacing: .07em;
          }

          .detail-value {
            display: block;

            color: #cbdadb;

            font-size: 11px;
            line-height: 1.5;

            overflow-wrap: anywhere;
          }


          /* =====================================================
             FOOTER
          ===================================================== */

          .modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 15px;

            padding: 15px 22px;

            border-top: 1px solid rgba(105, 181, 186, .10);
          }

          .footer-status {
            display: flex;
            align-items: center;

            gap: 7px;

            color: rgba(142, 182, 162, .65);

            font-size: 10px;
          }

          .modal-close-button {
            padding: 9px 15px;

            border-radius: 8px;

            color: #b8cccd;

            background: rgba(100, 145, 148, .07);

            border: 1px solid rgba(100, 170, 175, .11);

            cursor: pointer;

            font-size: 10px;
            font-weight: 600;
          }

          .modal-close-button:hover {
            color: #e0eeee;

            background: rgba(100, 170, 175, .12);
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
              padding: 14px;
            }

            .modal-backdrop {
              padding: 15px;
            }

            .modal-summary {
              grid-template-columns: 1fr;
            }

            .details-grid {
              grid-template-columns: 1fr;
            }

            .modal-footer {
              align-items: flex-start;
              flex-direction: column;
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