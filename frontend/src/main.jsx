import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles.css";
import Overview from "./pages/Overview";
import LiveCalls from "./pages/LiveCalls";
import Investigations from "./pages/Investigations";
import VoiceProfiles from "./pages/VoiceProfiles";
import AnalyzeAudio from "./pages/AnalyzeAudio";

function App(){
  return <Routes>
    <Route path="/" element={<Overview/>}/>
    <Route path="/live-calls" element={<LiveCalls/>}/>
    <Route path="/investigations" element={<Investigations/>}/>
    <Route path="/voice-profiles" element={<VoiceProfiles/>}/>
    <Route path="/analyze" element={<AnalyzeAudio/>}/>
  </Routes>
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter><App/></BrowserRouter>
);
