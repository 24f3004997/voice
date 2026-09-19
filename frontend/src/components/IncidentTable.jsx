import React from "react";
import { ChevronRight } from "lucide-react";
import { incidents } from "../data";
export default function IncidentTable({compact=false, rows=incidents}) {
  return <div className="table-wrap"><table><thead><tr><th>{compact?"TIME":"CASE ID"}</th><th>CALLER / FILE</th><th>ROLE</th><th>RISK SCORE</th><th>DETECTION</th><th>TRANSACTION</th><th>SOURCE</th><th>STATUS</th><th>CREATED</th><th></th></tr></thead>
  <tbody>{rows.map(x=><tr key={x.id}><td>{compact?x.time:<span className="case">{x.id}</span>}</td><td><b>{x.caller}</b>{!compact&&<em>DEMO DATA</em>}</td><td>{x.role}</td><td><span className={"risk "+x.level.toLowerCase()}>{x.risk} / {x.level}</span></td><td>{x.detection}</td><td>{x.transaction}</td><td>{x.source}</td><td><span className="status-pill">{x.status}</span></td><td>{x.time}</td><td><ChevronRight size={14}/></td></tr>)}</tbody></table></div>
}