import React from "react";
import { NavLink } from "react-router-dom";
import { ShieldCheck, LayoutDashboard, PhoneCall, Search, Mic2, Bell } from "lucide-react";

export function Shell({children}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={18}/></div>
        <div><div className="brand-name">VOXTRACE</div><div className="brand-sub">VOICE FRAUD INTELLIGENCE</div></div>
      </div>
      <nav>
        <NavItem to="/" icon={<LayoutDashboard size={15}/>} label="Overview" />
        <NavItem to="/live-calls" icon={<PhoneCall size={15}/>} label="Live Calls" badge="1" />
        <NavItem to="/investigations" icon={<Search size={15}/>} label="Investigations" />
        <NavItem to="/voice-profiles" icon={<Mic2 size={15}/>} label="Voice Profiles" />
      </nav>
      <div className="sidebar-bottom">Edit with <b>Lovable</b> <span>×</span></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div></div>
        <div className="top-actions">
          <button className="demo-btn">⚙ DEMO MODE</button>
          <button className="icon-btn"><Bell size={14}/></button>
          <button className="avatar">S</button>
        </div>
      </header>
      {children}
    </main>
  </div>
}

export function NavItem({to, icon, label, badge}) {
  return <NavLink to={to} className={({isActive}) => "nav-item " + (isActive ? "active":"")}>
    {icon}<span>{label}</span>{badge && <small>{badge}</small>}
  </NavLink>
}

export function PageTitle({eyebrow,title,children}) {
  return <div className="page-head">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
    {children}
  </div>
}

export function SectionTitle({icon,title,subtitle}) {
  return <div className="section-title"><div className="section-icon">{icon}</div><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
}
