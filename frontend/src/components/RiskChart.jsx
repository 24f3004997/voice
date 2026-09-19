// import React from "react";
// export default function RiskChart() {
//   return <div className="chart">
//     <svg viewBox="0 0 900 240" preserveAspectRatio="none">
//       <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#29b87d" stopOpacity=".25"/><stop offset="100%" stopColor="#29b87d" stopOpacity="0"/></linearGradient></defs>
//       {[30,80,130,180].map(y=><line key={y} x1="0" y1={y} x2="900" y2={y} stroke="#18252a" />)}
//       <path d="M0 165 C100 140 180 115 270 90 S390 50 460 70 S570 92 650 55 S770 25 900 18 L900 200 L0 200 Z" fill="url(#g)"/>
//       <path d="M0 165 C100 140 180 115 270 90 S390 50 460 70 S570 92 650 55 S770 25 900 18" fill="none" stroke="#37d991" strokeWidth="2"/>
//       <path d="M0 185 C110 178 180 166 270 150 S390 128 460 140 S570 152 650 132 S770 118 900 135" fill="none" stroke="#e2a91f" strokeWidth="2"/>
//       <path d="M0 195 C110 192 180 188 270 180 S390 168 460 178 S570 182 650 172 S770 175 900 185" fill="none" stroke="#ff4d55" strokeWidth="2"/>
//     </svg>
//     <div className="x-axis"><span>06:00</span><span>07:00</span><span>08:00</span><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span></div>
//     <div className="legend"><span><i className="dot low"/> LOW</span><span><i className="dot medium"/> MEDIUM</span><span><i className="dot high"/> HIGH</span></div>
//   </div>
// }

import React from "react";

const EMPTY_POINTS = [
  { time: "--:--", low: 0, medium: 0, high: 0 },
  { time: "--:--", low: 0, medium: 0, high: 0 },
  { time: "--:--", low: 0, medium: 0, high: 0 },
  { time: "--:--", low: 0, medium: 0, high: 0 },
  { time: "--:--", low: 0, medium: 0, high: 0 },
  { time: "--:--", low: 0, medium: 0, high: 0 },
  { time: "--:--", low: 0, medium: 0, high: 0 },
];

export default function RiskChart({ data = [] }) {
  const points = Array.isArray(data) && data.length ? data : EMPTY_POINTS;

  const width = 900;
  const bottom = 190;
  const top = 18;

  const maxValue = Math.max(
    5,
    ...points.flatMap((point) => [
      Number(point.low) || 0,
      Number(point.medium) || 0,
      Number(point.high) || 0,
    ])
  );

  const x = (index) =>
    points.length <= 1
      ? width / 2
      : (index / (points.length - 1)) * width;

  const y = (value) =>
    bottom - ((Number(value) || 0) / maxValue) * (bottom - top);

  const makePath = (key) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(
            point[key]
          ).toFixed(1)}`
      )
      .join(" ");

  const lowPath = makePath("low");
  const mediumPath = makePath("medium");
  const highPath = makePath("high");

  return (
    <div className="chart" style={{ width: "100%", minHeight: 245, marginTop: 8 }}>
      <svg
        viewBox="0 0 900 220"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: 205 }}
        aria-label="Risk activity chart"
      >
        {[30, 75, 120, 165, 190].map((lineY) => (
          <line
            key={lineY}
            x1="0"
            y1={lineY}
            x2="900"
            y2={lineY}
            stroke="rgba(150,190,193,0.10)"
            strokeWidth="1"
          />
        ))}

        <path
          d={`${lowPath} L 900 ${bottom} L 0 ${bottom} Z`}
          fill="rgba(55,217,145,0.08)"
        />

        <path d={lowPath} fill="none" stroke="#37d991" strokeWidth="2.5" />
        <path d={mediumPath} fill="none" stroke="#e2a91f" strokeWidth="2.5" />
        <path d={highPath} fill="none" stroke="#ff4d55" strokeWidth="2.5" />
      </svg>

      <div
        className="x-axis"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 4,
        }}
      >
        {points.map((point, index) => (
          <span key={`${point.time || "time"}-${index}`}>
            {point.time || "--:--"}
          </span>
        ))}
      </div>

      <div className="legend">
        <span><i className="dot low" /> LOW</span>
        <span><i className="dot medium" /> MEDIUM</span>
        <span><i className="dot high" /> HIGH</span>
      </div>
    </div>
  );
}
