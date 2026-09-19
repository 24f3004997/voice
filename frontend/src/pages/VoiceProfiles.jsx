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
             PAGE
          ===================================================== */

          .voice-profiles-page {
            position: relative;

            min-height: 100%;

            color: #dce9ea;
          }

          .voice-profiles-page::before {
            content: "";

            position: fixed;

            width: 520px;
            height: 520px;

            left: -120px;
            top: 100px;

            background: rgba(0, 190, 200, .075);

            filter: blur(120px);

            pointer-events: none;

            z-index: 0;
          }

          .voice-profiles-page::after {
            content: "";

            position: fixed;

            width: 500px;
            height: 500px;

            right: -130px;
            bottom: -80px;

            background: rgba(30, 70, 150, .08);

            filter: blur(125px);

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

            padding: 9px 14px;

            border-radius: 9px;

            color: #9cebee;

            background:
              linear-gradient(
                135deg,
                rgba(27, 177, 184, .16),
                rgba(19, 107, 113, .10)
              );

            border: 1px solid rgba(56, 202, 208, .20);

            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.035),
              0 8px 24px rgba(0,0,0,.12);

            cursor: pointer;

            font-size: 10px;
            font-weight: 600;

            transition:
              background .18s ease,
              border-color .18s ease,
              transform .18s ease;
          }

          .add-profile-btn:hover {
            background:
              linear-gradient(
                135deg,
                rgba(27, 190, 197, .21),
                rgba(19, 115, 121, .14)
              );

            border-color: rgba(56, 211, 217, .30);

            transform: translateY(-1px);
          }


          /* =====================================================
             TOOLBAR
          ===================================================== */

          .profile-toolbar {
            display: flex;

            align-items: center;
            justify-content: space-between;

            gap: 18px;

            margin-bottom: 18px;
          }


          /* =====================================================
             SEARCH
          ===================================================== */

          .search-box {
            width: min(470px, 100%);

            height: 42px;

            display: flex;

            align-items: center;

            gap: 10px;

            padding: 0 13px;

            border-radius: 12px;

            color: rgba(92, 194, 201, .65);

            background:
              linear-gradient(
                145deg,
                rgba(13, 35, 39, .75),
                rgba(5, 20, 24, .68)
              );

            border: 1px solid rgba(103, 183, 188, .11);

            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.025),
              0 12px 35px rgba(0,0,0,.10);

            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
          }

          .search-box:focus-within {
            border-color: rgba(50, 197, 204, .25);

            box-shadow:
              0 0 0 3px rgba(35, 186, 193, .035),
              inset 0 1px 0 rgba(255,255,255,.025);
          }

          .search-box input {
            width: 100%;

            min-width: 0;

            border: 0;
            outline: 0;

            background: transparent;

            color: #d5e4e5;

            font-size: 11px;
          }

          .search-box input::placeholder {
            color: rgba(132, 164, 166, .47);
          }

          .clear-search {
            width: 24px;
            height: 24px;

            display: grid;
            place-items: center;

            flex-shrink: 0;

            border-radius: 6px;

            color: rgba(160, 190, 192, .55);

            background: rgba(100, 150, 153, .07);

            border: 1px solid rgba(100, 170, 175, .08);

            cursor: pointer;
          }

          .clear-search:hover {
            color: #dceced;

            background: rgba(100, 170, 175, .12);
          }


          /* =====================================================
             PROFILE COUNT
          ===================================================== */

          .profile-count {
            display: flex;

            align-items: center;

            gap: 9px;

            padding: 8px 11px;

            border-radius: 9px;

            background: rgba(8, 26, 29, .42);

            border: 1px solid rgba(99, 171, 176, .08);
          }

          .profile-count span {
            color: rgba(102, 190, 196, .48);

            font-size: 8px;
            font-weight: 600;

            letter-spacing: .10em;
          }

          .profile-count strong {
            color: #b9dfe1;

            font-size: 11px;
            font-weight: 600;
          }


          /* =====================================================
             MAIN PANEL
          ===================================================== */

          .profiles-panel {
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
              0 22px 65px rgba(0,0,0,.17),
              inset 0 1px 0 rgba(255,255,255,.03);

            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }


          /* =====================================================
             PROFILE GRID
          ===================================================== */

          .profile-grid {
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 13px;

            margin-top: 18px;
          }


          /* =====================================================
             PROFILE CARD
          ===================================================== */

          .profile-card {
            position: relative;

            min-width: 0;

            padding: 17px;

            border-radius: 15px;

            background:
              linear-gradient(
                145deg,
                rgba(15, 39, 43, .72),
                rgba(5, 21, 24, .62)
              );

            border: 1px solid rgba(103, 182, 187, .11);

            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.025),
              0 13px 35px rgba(0,0,0,.11);

            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);

            cursor: pointer;

            transition:
              transform .20s ease,
              border-color .20s ease,
              background .20s ease,
              box-shadow .20s ease;
          }

          .profile-card:hover {
            transform: translateY(-2px);

            border-color: rgba(64, 194, 201, .20);

            background:
              linear-gradient(
                145deg,
                rgba(18, 47, 51, .78),
                rgba(6, 23, 26, .67)
              );

            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.035),
              0 18px 45px rgba(0,0,0,.16),
              0 0 25px rgba(20, 180, 188, .025);
          }


          /* =====================================================
             PROFILE TOP
          ===================================================== */

          .profile-top {
            display: grid;

            grid-template-columns: 42px minmax(0, 1fr) auto;

            align-items: center;

            gap: 11px;

            padding-bottom: 15px;

            border-bottom: 1px solid rgba(101, 177, 182, .08);
          }

          .person {
            width: 42px;
            height: 42px;

            display: grid;
            place-items: center;

            border-radius: 11px;

            color: #48d0d5;

            background:
              linear-gradient(
                145deg,
                rgba(37, 192, 199, .12),
                rgba(19, 96, 102, .08)
              );

            border: 1px solid rgba(47, 196, 203, .15);

            box-shadow:
              inset 0 1px 0 rgba(255,255,255,.035);
          }

          .profile-top h3 {
            margin: 0 0 3px;

            color: #dbe8e9;

            font-size: 13px;
            font-weight: 600;

            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .profile-top p {
            margin: 0;

            color: rgba(132, 164, 166, .56);

            font-size: 10px;
          }


          /* =====================================================
             STATUS
          ===================================================== */

          .profile-status {
            display: inline-flex;

            align-items: center;

            gap: 5px;

            padding: 5px 8px;

            border-radius: 999px;

            font-size: 8px;
            font-weight: 600;

            letter-spacing: .06em;
          }

          .profile-status.active {
            color: #70d9aa;

            background: rgba(55, 186, 125, .07);

            border: 1px solid rgba(55, 186, 125, .13);
          }

          .profile-status.review {
            color: #e5bb59;

            background: rgba(220, 171, 53, .07);

            border: 1px solid rgba(220, 171, 53, .13);
          }

          .status-dot {
            width: 5px;
            height: 5px;

            border-radius: 50%;

            background: currentColor;

            box-shadow: 0 0 8px currentColor;
          }


          /* =====================================================
             PROFILE INFO
          ===================================================== */

          .profile-info {
            display: grid;

            grid-template-columns:
              1fr 1fr 1fr;

            gap: 9px;

            padding-top: 14px;
          }

          .profile-info span {
            min-width: 0;

            display: flex;

            flex-direction: column;

            gap: 4px;

            color: rgba(139, 169, 171, .56);

            font-size: 9px;

            line-height: 1.35;
          }

          .profile-info small {
            color: rgba(72, 190, 197, .55);

            font-size: 8px;
          }

          .profile-info b {
            color: #c8d9da;

            font-size: 10px;
            font-weight: 500;
          }

          .yellow-text {
            color: #e3b94f !important;
          }


          /* =====================================================
             CARD ACTION
          ===================================================== */

          .card-arrow {
            position: absolute;

            right: 15px;
            bottom: 14px;

            width: 25px;
            height: 25px;

            display: grid;
            place-items: center;

            border-radius: 7px;

            color: rgba(87, 192, 198, .55);

            background: rgba(24, 137, 143, .05);

            border: 1px solid rgba(63, 184, 191, .08);

            transition:
              color .18s ease,
              background .18s ease,
              transform .18s ease;
          }

          .profile-card:hover .card-arrow {
            color: #91e4e7;

            background: rgba(24, 153, 160, .11);

            transform: translateX(2px);
          }


          /* =====================================================
             EMPTY STATE
          ===================================================== */

          .empty-profiles {
            display: flex;

            align-items: center;
            flex-direction: column;

            justify-content: center;

            min-height: 260px;

            text-align: center;
          }

          .empty-icon {
            width: 45px;
            height: 45px;

            display: grid;
            place-items: center;

            margin-bottom: 12px;

            border-radius: 12px;

            color: rgba(77, 198, 204, .65);

            background: rgba(34, 171, 178, .07);

            border: 1px solid rgba(57, 192, 199, .11);
          }

          .empty-profiles h3 {
            margin: 0 0 5px;

            color: #d4e3e4;

            font-size: 13px;
          }

          .empty-profiles p {
            margin: 0;

            color: rgba(132, 163, 165, .50);

            font-size: 10px;
          }


          /* =====================================================
             MODAL
          ===================================================== */

          .profile-modal-backdrop {
            position: fixed;

            inset: 0;

            z-index: 9999;

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 25px;

            background: rgba(1, 8, 10, .72);

            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }

          .profile-modal {
            width: min(590px, 100%);

            border-radius: 21px;

            overflow: hidden;

            background:
              linear-gradient(
                145deg,
                rgba(15, 40, 44, .96),
                rgba(5, 20, 24, .97)
              );

            border: 1px solid rgba(105, 193, 199, .17);

            box-shadow:
              0 35px 100px rgba(0,0,0,.52),
              inset 0 1px 0 rgba(255,255,255,.045);

            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);

            animation: profileModalIn .18s ease-out;
          }

          @keyframes profileModalIn {
            from {
              opacity: 0;
              transform: translateY(10px) scale(.985);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .profile-modal-header {
            display: flex;

            align-items: center;
            justify-content: space-between;

            gap: 15px;

            padding: 19px 21px;

            border-bottom: 1px solid rgba(105, 181, 186, .10);
          }

          .modal-profile-person {
            display: flex;

            align-items: center;

            gap: 11px;
          }

          .modal-profile-icon {
            width: 42px;
            height: 42px;

            display: grid;
            place-items: center;

            border-radius: 11px;

            color: #50d2d7;

            background: rgba(35, 190, 197, .09);

            border: 1px solid rgba(50, 198, 205, .14);
          }

          .modal-profile-person h2 {
            margin: 0 0 3px;

            color: #e0ebec;

            font-size: 17px;
          }

          .modal-profile-person p {
            margin: 0;

            color: rgba(133, 166, 168, .56);

            font-size: 9px;
          }

          .close-profile-modal {
            width: 33px;
            height: 33px;

            display: grid;
            place-items: center;

            border-radius: 8px;

            color: rgba(166, 192, 194, .62);

            background: rgba(100, 150, 153, .06);

            border: 1px solid rgba(100, 170, 175, .09);

            cursor: pointer;
          }

          .close-profile-modal:hover {
            color: #e2eeee;

            background: rgba(100, 170, 175, .11);
          }


          /* =====================================================
             MODAL BODY
          ===================================================== */

          .profile-modal-body {
            padding: 18px 21px 21px;
          }

          .modal-profile-status {
            display: flex;

            align-items: center;
            justify-content: space-between;

            margin-bottom: 15px;

            padding: 12px;

            border-radius: 10px;

            background: rgba(3, 18, 21, .40);

            border: 1px solid rgba(98, 171, 176, .08);
          }

          .modal-profile-status span {
            color: rgba(133, 165, 167, .55);

            font-size: 9px;
          }

          .modal-profile-status strong {
            font-size: 10px;
          }

          .modal-active {
            color: #6dd8a7;
          }

          .modal-review {
            color: #e5bb59;
          }

          .profile-detail-grid {
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 9px;
          }

          .profile-detail {
            padding: 12px;

            border-radius: 10px;

            background: rgba(3, 18, 21, .38);

            border: 1px solid rgba(97, 170, 175, .08);
          }

          .profile-detail span {
            display: block;

            margin-bottom: 5px;

            color: rgba(128, 160, 162, .52);

            font-size: 8px;

            text-transform: uppercase;

            letter-spacing: .07em;
          }

          .profile-detail strong {
            color: #cbdcdd;

            font-size: 11px;
            font-weight: 500;
          }

          .profile-detail strong.drift-high {
            color: #e4b94f;
          }

          .verification-note {
            display: flex;

            align-items: center;

            gap: 8px;

            margin-top: 12px;

            padding: 11px 12px;

            border-radius: 10px;

            color: rgba(120, 208, 177, .68);

            background: rgba(44, 168, 117, .045);

            border: 1px solid rgba(55, 181, 127, .08);

            font-size: 9px;
          }

          .profile-modal-footer {
            display: flex;

            justify-content: flex-end;

            padding: 13px 21px;

            border-top: 1px solid rgba(105, 181, 186, .09);
          }

          .modal-done-btn {
            padding: 8px 14px;

            border-radius: 8px;

            color: #b9d5d6;

            background: rgba(100, 150, 153, .07);

            border: 1px solid rgba(100, 170, 175, .10);

            cursor: pointer;

            font-size: 10px;
            font-weight: 600;
          }

          .modal-done-btn:hover {
            background: rgba(100, 170, 175, .12);

            color: #e0eeee;
          }


          /* =====================================================
             RESPONSIVE
          ===================================================== */

          @media (max-width: 900px) {

            .profile-grid {
              grid-template-columns: 1fr;
            }

          }


          @media (max-width: 680px) {

            .voice-profiles-content {
              width: calc(100% - 22px);

              padding-top: 20px;
            }

            .profile-toolbar {
              align-items: stretch;

              flex-direction: column;
            }

            .search-box {
              width: 100%;
            }

            .profile-count {
              align-self: flex-start;
            }

            .profiles-panel {
              padding: 14px;
            }

            .profile-top {
              grid-template-columns: 39px minmax(0, 1fr);

            }

            .profile-status {
              grid-column: 2;
              justify-self: start;
            }

            .profile-info {
              grid-template-columns: 1fr;
            }

            .profile-modal-backdrop {
              padding: 14px;
            }

            .profile-detail-grid {
              grid-template-columns: 1fr;
            }

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