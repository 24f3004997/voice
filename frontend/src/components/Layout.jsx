// import React from "react";
// import { NavLink } from "react-router-dom";
// import { ShieldCheck, LayoutDashboard, PhoneCall, Search, Mic2, Bell } from "lucide-react";

// export function Shell({children}) {
//   return <div className="app-shell">
//     <aside className="sidebar">
//       <div className="brand">
//         <div className="brand-mark"><ShieldCheck size={18}/></div>
//         <div><div className="brand-name">VOXTRACE</div><div className="brand-sub">VOICE FRAUD INTELLIGENCE</div></div>
//       </div>
//       <nav>
//         <NavItem to="/" icon={<LayoutDashboard size={15}/>} label="Overview" />
//         <NavItem to="/live-calls" icon={<PhoneCall size={15}/>} label="Live Calls" badge="1" />
//         <NavItem to="/investigations" icon={<Search size={15}/>} label="Investigations" />
//         <NavItem to="/voice-profiles" icon={<Mic2 size={15}/>} label="Voice Profiles" />
//       </nav>
//       <div className="sidebar-bottom">Edit with <b>Lovable</b> <span>×</span></div>
//     </aside>
//     <main className="main">
//       <header className="topbar">
//         <div></div>
//         <div className="top-actions">
//           <button className="demo-btn">⚙ DEMO MODE</button>
//           <button className="icon-btn"><Bell size={14}/></button>
//           <button className="avatar">S</button>
//         </div>
//       </header>
//       {children}
//     </main>
//   </div>
// }

// export function NavItem({to, icon, label, badge}) {
//   return <NavLink to={to} className={({isActive}) => "nav-item " + (isActive ? "active":"")}>
//     {icon}<span>{label}</span>{badge && <small>{badge}</small>}
//   </NavLink>
// }

// export function PageTitle({eyebrow,title,children}) {
//   return <div className="page-head">
//     <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
//     {children}
//   </div>
// }

// export function SectionTitle({icon,title,subtitle}) {
//   return <div className="section-title"><div className="section-icon">{icon}</div><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
// }



import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ShieldCheck, LayoutDashboard, PhoneCall, Search, Mic2, Bell, User, Calendar } from "lucide-react";

// Animated Background Component
function AnimatedBackground() {
  return (
    <div className="animated-bg">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
    </div>
  );
}

export function Shell({children}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live time update (har 1 second me)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      {/* Moving Animated Background */}
      <AnimatedBackground />
      
      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <ShieldCheck size={18} style={{ color: '#2655ff' }} /> 
            </div>
            <div>
              <div className="brand-name">VOXTRACE</div>
              {/* <div className="brand-sub">VOICE FRAUD INTELLIGENCE</div> */}
            </div>
          </div>
          <nav>
            <NavItem to="/" icon={<LayoutDashboard size={15}/>} label="Overview" />
            <NavItem to="/live-calls" icon={<PhoneCall size={15}/>} label="Live Calls" badge="1" />
            <NavItem to="/investigations" icon={<Search size={15}/>} label="Investigations" />
            <NavItem to="/voice-profiles" icon={<Mic2 size={15}/>} label="Voice Profiles" />
          </nav>
          <div className="sidebar-bottom">Edit with <b>Voxtrace</b> </div>
        </aside>
        
        <main className="main">
          <header className="topbar">
            <div className="header-greeting" style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>
              {getGreeting()}, User
            </div>
            
            <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="datetime-pill" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                backgroundColor: '#111827',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #1f2937',
                fontSize: '13px',
                color: '#cbd5e1'
              }}>
                <Calendar size={14} style={{ color: '#f97316' }} /> 
                <span>{formattedDate} &bull; {formattedTime}</span>
              </div>

              <button className="icon-btn" style={{ position: 'relative', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                <Bell size={18}/>
                <span style={{
                  position: 'absolute',
                  top: '0px',
                  right: '2px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#f97316',
                  borderRadius: '50%'
                }}></span>
              </button>
              
              <button className="avatar" style={{ 
                backgroundColor: '#f97316', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <User size={16} strokeWidth={2.5} />
              </button>
            </div>
          </header>
          
          <div className="content-wrapper">
             {children}
          </div>
        </main>
      </div>
    </>
  );
}

export function NavItem({to, icon, label, badge}) {
  return (
    <NavLink to={to} className={({isActive}) => "nav-item " + (isActive ? "active":"")}>
      {icon}<span>{label}</span>{badge && <small>{badge}</small>}
    </NavLink>
  );
}

export function PageTitle({eyebrow, title, children}) {
  return (
    <div className="page-head">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
      {children}
    </div>
  );
}

export function SectionTitle({icon, title, subtitle}) {
  return (
    <div className="section-title">
      <div className="section-icon">{icon}</div>
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    </div>
  );
}