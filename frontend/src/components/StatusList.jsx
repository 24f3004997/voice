// import React from "react";
// export default function StatusList() {
//   return <div className="status-list">{["Detection","Speaker Verification","Behaviour Analysis","Transaction Risk"].map(x=><div className="status-row" key={x}><span>{x}</span><b><i/> ENABLED</b></div>)}</div>
// }

import React from "react";

const labels = {
  detection: "Detection",
  speaker_verification: "Speaker Verification",
  behavior_analysis: "Behaviour Analysis",
  transaction_risk: "Transaction Risk",
};

export default function StatusList({ status = {} }) {
  return (
    <div className="status-list">
      {Object.entries(labels).map(([key, label]) => {
        const enabled = status[key] !== false;
        return (
          <div className="status-row" key={key}>
            <span>{label}</span>
            <b>
              <i /> {enabled ? "ENABLED" : "OFFLINE"}
            </b>
          </div>
        );
      })}
    </div>
  );
}
