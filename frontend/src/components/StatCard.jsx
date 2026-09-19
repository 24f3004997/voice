import React from "react";
export default function StatCard({icon,value,label,tone="teal",meta}) {
  return <div className="stat-card">
    <div className={"stat-icon "+tone}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {meta && <div className="stat-meta">{meta}</div>}
  </div>
}