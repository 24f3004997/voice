import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Mic2,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { Shell, PageTitle, SectionTitle } from "../components/Layout";
import { profiles } from "../data";

export default function VoiceProfiles() {
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return profiles;

    return profiles.filter((profile) => {
      return (
        String(profile.name || "")
          .toLowerCase()
          .includes(query) ||
        String(profile.role || "")
          .toLowerCase()
          .includes(query) ||
        String(profile.id || "")
          .toLowerCase()
          .includes(query) ||
        String(profile.status || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [search]);

  return (
    <Shell>
      <div className="voice-profiles-page">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <PageTitle
          eyebrow="Registered speaker identities and verification history"
          title="VOICE PROFILES"
        >
          <button
            type="button"
            className="add-profile-btn"
            onClick={() => {
              // Add profile functionality can be connected later.
            }}
          >
            <Plus size={15} />
            Add Voice Profile
          </button>
        </PageTitle>


        <div className="content voice-profiles-content">

          {/* =====================================================
              SEARCH
          ===================================================== */}

          <div className="profile-toolbar">

            <div className="search-box">

              <Search size={15} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, role or profile ID"
              />

              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}

            </div>

            <div className="profile-count">
              <span>REGISTERED IDENTITIES</span>
              <strong>
                {filteredProfiles.length}
              </strong>
            </div>

          </div>


          {/* =====================================================
              PROFILES PANEL
          ===================================================== */}

          <section className="profiles-panel">

            <SectionTitle
              icon={<UserRound size={15} />}
              title="Registered Identities"
              subtitle={`${filteredProfiles.length} profiles · speaker verification and drift monitoring`}
            />


            {filteredProfiles.length === 0 ? (
              <div className="empty-profiles">

                <div className="empty-icon">
                  <Search size={20} />
                </div>

                <h3>No profiles found</h3>

                <p>
                  Try searching with a different name,
                  role or profile ID.
                </p>

              </div>
            ) : (
              <div className="profile-grid">

                {filteredProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onOpen={() =>
                      setSelectedProfile(profile)
                    }
                  />
                ))}

              </div>
            )}

          </section>

        </div>


        {/* =====================================================
            PROFILE DETAIL MODAL
        ===================================================== */}

        {selectedProfile && (
          <ProfileModal
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
          />
        )}


        {/* =====================================================
            PAGE CSS
        ===================================================== */}

        <style>{`
          /* =====================================================
             PAGE BACKGROUND & GLOW EFFECTS
          ===================================================== */

          .voice-profiles-page {
            position: relative;
            min-height: 100%;
            color: #f8fafc; /* Crisp white for main text */
          }

          /* Cyan Neon Glow on the left */
          .voice-profiles-page::before {
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

          /* Purple Neon Glow on the right */
          .voice-profiles-page::after {
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

          .voice-profiles-content {
            position: relative;
            z-index: 1;
            width: min(1180px, calc(100% - 48px));
            margin: 0 auto;
            padding: 30px 0 80px;
          }

          /* =====================================================
             ADD PROFILE BUTTON
          ===================================================== */

          .add-profile-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            padding: 10px 16px;
            border-radius: 8px;
            color: #000000;
            background: #22d3ee; /* Bright Cyan */
            border: none;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
            transition: all 0.2s ease;
          }

          .add-profile-btn:hover {
            background: #06b6d4;
            transform: translateY(-1px);
            box-shadow: 0 0 25px rgba(34, 211, 238, 0.6);
          }

          /* =====================================================
             TOOLBAR & SEARCH
          ===================================================== */

          .profile-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 24px;
          }

          .search-box {
            width: min(470px, 100%);
            height: 44px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 16px;
            border-radius: 10px;
            color: #94a3b8;
            background: rgba(15, 23, 42, 0.6); /* Very dark sleek blue/grey */
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            transition: all 0.2s ease;
          }

          .search-box:focus-within {
            border-color: rgba(34, 211, 238, 0.5); /* Cyan border on focus */
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.15);
            color: #22d3ee;
          }

          .search-box input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f8fafc;
            font-size: 13px;
          }

          .search-box input::placeholder {
            color: #475569;
          }

          .clear-search {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
          }
          .clear-search:hover { color: #f8fafc; }

          /* =====================================================
             PROFILE COUNT
          ===================================================== */

          .profile-count {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 14px;
            border-radius: 8px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .profile-count span {
            color: #64748b;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.08em;
          }

          .profile-count strong {
            color: #22d3ee; /* Cyan highlight */
            font-size: 14px;
            font-weight: 700;
          }

          /* =====================================================
             MAIN PANEL (GLASSMORPHISM)
          ===================================================== */

          .profiles-panel {
            padding: 24px;
            border-radius: 16px;
            background: rgba(11, 17, 32, 0.5); /* Deep dark background */
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(16px);
          }

          .profile-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin-top: 20px;
          }

          /* =====================================================
             PROFILE CARD (THE "TABLE" REPLACEMENT)
          ===================================================== */

          .profile-card {
            position: relative;
            padding: 20px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.6); /* Modern Dark Card */
            border: 1px solid rgba(255, 255, 255, 0.06);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .profile-card:hover {
            transform: translateY(-3px);
            background: rgba(30, 41, 59, 0.8);
            border-color: rgba(34, 211, 238, 0.3); /* Subtle cyan border on hover */
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(34, 211, 238, 0.1);
          }

          /* =====================================================
             CARD CONTENTS
          ===================================================== */

          .profile-top {
            display: grid;
            grid-template-columns: 46px minmax(0, 1fr) auto;
            align-items: center;
            gap: 14px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .person {
            width: 46px;
            height: 46px;
            display: grid;
            place-items: center;
            border-radius: 10px;
            color: #22d3ee;
            background: rgba(34, 211, 238, 0.1);
            border: 1px solid rgba(34, 211, 238, 0.2);
          }

          .profile-top h3 {
            margin: 0 0 4px;
            color: #f8fafc;
            font-size: 15px;
            font-weight: 600;
          }

          .profile-top p {
            margin: 0;
            color: #94a3b8;
            font-size: 12px;
          }

          /* =====================================================
             STATUS PILLS
          ===================================================== */

          .profile-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .profile-status.active {
            color: #10b981; /* Neon Green */
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }

          .profile-status.review {
            color: #f59e0b; /* Bright Amber/Yellow */
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
          }

          .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 8px currentColor;
          }

          /* =====================================================
             CARD DETAILS
          ===================================================== */

          .profile-info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            padding-top: 16px;
          }

          .profile-info span {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .profile-info small {
            color: #64748b;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .profile-info b {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 500;
          }

          .yellow-text {
            color: #ef4444 !important; /* Made it Red for high drift alert */
          }

          .card-arrow {
            position: absolute;
            right: 20px;
            bottom: 20px;
            color: #475569;
            transition: all 0.2s ease;
          }

          .profile-card:hover .card-arrow {
            color: #22d3ee;
            transform: scale(1.1);
          }

          /* =====================================================
             MODAL (DARK THEME UPDATED)
          ===================================================== */

          .profile-modal-backdrop {
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

          .profile-modal {
            width: min(500px, 100%);
            border-radius: 16px;
            overflow: hidden;
            background: #0f172a; /* Solid dark slate */
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 211, 238, 0.1);
            animation: profileModalIn .2s ease-out;
          }

          @keyframes profileModalIn {
            from { opacity: 0; transform: translateY(15px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .profile-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(30, 41, 59, 0.5);
          }

          .modal-profile-person {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .modal-profile-icon {
            width: 48px;
            height: 48px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            color: #22d3ee;
            background: rgba(34, 211, 238, 0.1);
          }

          .modal-profile-person h2 {
            margin: 0 0 4px;
            color: #f8fafc;
            font-size: 18px;
          }

          .modal-profile-person p {
            margin: 0;
            color: #94a3b8;
            font-size: 13px;
          }

          .close-profile-modal {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 5px;
          }
          .close-profile-modal:hover { color: #f8fafc; }

          .profile-modal-body {
            padding: 24px;
          }

          .modal-profile-status {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 14px 18px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .modal-profile-status span {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
          }

          .modal-profile-status strong {
            font-size: 13px;
            text-transform: uppercase;
            font-weight: 700;
          }

          .modal-active { color: #10b981; }
          .modal-review { color: #f59e0b; }

          .profile-detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .profile-detail {
            padding: 16px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.03);
          }

          .profile-detail span {
            display: block;
            margin-bottom: 6px;
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .profile-detail strong {
            color: #f8fafc;
            font-size: 14px;
            font-weight: 600;
          }

          .profile-detail strong.drift-high {
            color: #ef4444; /* Alert red */
          }

          .verification-note {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-top: 20px;
            padding: 14px;
            border-radius: 10px;
            color: #22d3ee;
            background: rgba(34, 211, 238, 0.05);
            border: 1px solid rgba(34, 211, 238, 0.2);
            font-size: 12px;
            line-height: 1.5;
          }

          .profile-modal-footer {
            padding: 16px 24px;
            display: flex;
            justify-content: flex-end;
            background: rgba(0, 0, 0, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }

          .modal-done-btn {
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

          .modal-done-btn:hover {
            background: #475569;
          }

          /* =====================================================
             RESPONSIVE
          ===================================================== */
          @media (max-width: 900px) {
            .profile-grid { grid-template-columns: 1fr; }
          }
          @media (max-width: 680px) {
            .profile-toolbar { flex-direction: column; align-items: stretch; }
            .profile-info { grid-template-columns: 1fr 1fr; gap: 15px; }
          }
        `}</style>
      </div>
    </Shell>
  );
}


/* ================================================================
   PROFILE CARD
================================================================ */

function ProfileCard({ profile, onOpen }) {
  const isReview =
    String(profile.status || "").toUpperCase() === "REVIEW";

  const isHighDrift =
    String(profile.drift || "").toUpperCase() === "HIGH";

  return (
    <div
      className="profile-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >

      <div className="profile-top">

        <div className="person">
          <UserRound size={20} />
        </div>

        <div>
          <h3>{profile.name}</h3>
          <p>{profile.role}</p>
        </div>

        <span
          className={`profile-status ${
            isReview ? "review" : "active"
          }`}
        >
          <span className="status-dot" />
          {profile.status}
        </span>

      </div>


      <div className="profile-info">

        <span>
          <small>PROFILE ID</small>
          <b>{profile.id}</b>
        </span>

        <span>
          <small>REFERENCE SAMPLES</small>
          <b>{profile.samples}</b>
        </span>

        <span>
          <small>LAST VERIFIED</small>
          <b>{profile.verified}</b>
        </span>

        <span>
          <small>PROFILE DRIFT</small>
          <b className={isHighDrift ? "yellow-text" : ""}>
            {profile.drift}
          </b>
        </span>

      </div>


      <div className="card-arrow">
        <ShieldCheck size={14} />
      </div>

    </div>
  );
}


/* ================================================================
   PROFILE MODAL
================================================================ */

function ProfileModal({ profile, onClose }) {
  const isReview =
    String(profile.status || "").toUpperCase() === "REVIEW";

  const isHighDrift =
    String(profile.drift || "").toUpperCase() === "HIGH";

  return (
    <div
      className="profile-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >

      <div className="profile-modal">

        <div className="profile-modal-header">

          <div className="modal-profile-person">

            <div className="modal-profile-icon">
              <Mic2 size={19} />
            </div>

            <div>
              <h2>{profile.name}</h2>
              <p>{profile.role}</p>
            </div>

          </div>

          <button
            type="button"
            className="close-profile-modal"
            onClick={onClose}
            aria-label="Close profile"
          >
            <X size={17} />
          </button>

        </div>


        <div className="profile-modal-body">

          <div className="modal-profile-status">

            <span>PROFILE STATUS</span>

            <strong
              className={
                isReview
                  ? "modal-review"
                  : "modal-active"
              }
            >
              {profile.status}
            </strong>

          </div>


          <div className="profile-detail-grid">

            <div className="profile-detail">
              <span>Profile ID</span>
              <strong>{profile.id}</strong>
            </div>

            <div className="profile-detail">
              <span>Reference Samples</span>
              <strong>{profile.samples}</strong>
            </div>

            <div className="profile-detail">
              <span>Last Verified</span>
              <strong>{profile.verified}</strong>
            </div>

            <div className="profile-detail">
              <span>Profile Drift</span>
              <strong
                className={
                  isHighDrift
                    ? "drift-high"
                    : ""
                }
              >
                {profile.drift}
              </strong>
            </div>

          </div>


          <div className="verification-note">
            <CheckCircle2 size={14} />
            Voice identity is monitored continuously against
            registered reference samples.
          </div>

        </div>


        <div className="profile-modal-footer">

          <button
            type="button"
            className="modal-done-btn"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
}