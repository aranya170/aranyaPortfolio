import React, { useState, Suspense, lazy } from "react";
import { Switch, Route } from "react-router-dom";
import { PortfolioProvider } from "./context/PortfolioContext";
import Intro from "./components/Intro";
import About from "./components/About";
import TechStack from "./components/TechStack";
import Timeline from "./components/Timeline";
import Experience from "./components/Experience";
import Credits from "./components/Credits";
import NavBar from "./components/NavBar";
import SideNavBar from "./components/SideNavBar";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import GitHubContributions from "./components/GitHubContributions";
import { StarsCanvas } from "./components/StarBackground";
import "./App.css";
import "./styles/Global.css";

// Visitors never need the admin panel code, so it is split into its own chunk
const AdminApp = lazy(() => import("./admin/AdminApp"));

function MainPortfolio() {
  const [showStars, setShowStars] = useState(true);
  return (
    <div className="App">
      {showStars && <StarsCanvas />}
      <>
        <NavBar showStars={showStars} setShowStars={setShowStars} />
        <SideNavBar showStars={showStars} setShowStars={setShowStars} />
      </>

      <div id="content">
        <Intro />
        <About />
        <Projects />
        <Timeline />
        <Experience />
        <TechStack />
        <GitHubContributions />
        <Contact />
        <Credits />
      </div>
    </div>
  );
}

function App() {
  return (
    <PortfolioProvider>
      <Switch>
        <Route path="/admin">
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        </Route>
        <Route path="/" component={MainPortfolio} />
      </Switch>
    </PortfolioProvider>
  );
}

export default App;