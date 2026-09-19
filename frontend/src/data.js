export const incidents = [
  { id:"VX-20491", caller:"Demo CFO", role:"CFO (simulated)", risk:94, level:"CRITICAL", detection:"Potential voice impersonation", transaction:"₹25,00,000", source:"LIVE CALL", status:"OPEN", time:"09:42" },
  { id:"VX-20488", caller:"Demo Finance Manager", role:"Finance Manager (simulated)", risk:76, level:"HIGH", detection:"Synthetic speech indicators", transaction:"₹8,50,000", source:"LIVE CALL", status:"UNDER REVIEW", time:"09:38" },
  { id:"VX-20473", caller:"Demo CEO", role:"CEO (simulated)", risk:11, level:"LOW", detection:"No significant anomaly", transaction:"None", source:"LIVE CALL", status:"RESOLVED", time:"09:31" },
  { id:"VX-20461", caller:"Demo Treasury Lead", role:"Treasury Lead (simulated)", risk:57, level:"MEDIUM", detection:"Unusual cadence and urgency", transaction:"₹3,20,000", source:"LIVE CALL", status:"UNDER REVIEW", time:"09:17" },
  { id:"VX-20452", caller:"Demo Vendor Contact", role:"Vendor (simulated)", risk:65, level:"MEDIUM", detection:"Identity mismatch", transaction:"₹8,10,000", source:"LIVE CALL", status:"OPEN", time:"09:04" }
];

export const profiles = [
  { name:"Demo CFO", role:"CFO (simulated)", id:"VP-0001", samples:8, verified:"Today", drift:"LOW", status:"ACTIVE" },
  { name:"Demo Finance Manager", role:"Finance Manager (simulated)", id:"VP-0002", samples:6, verified:"Yesterday", drift:"LOW", status:"ACTIVE" },
  { name:"Demo CEO", role:"CEO (simulated)", id:"VP-0003", samples:10, verified:"18 Sep 2026, 09:31", drift:"LOW", status:"ACTIVE" },
  { name:"Demo Treasury Lead", role:"Treasury Lead (simulated)", id:"VP-0004", samples:5, verified:"15 Sep 2026", drift:"HIGH", status:"REVIEW" }
];
