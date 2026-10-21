import React, { useRef, useEffect } from "react";
import Icon from "./Icons";
import "../styles/SideNavBar.css";
import { gsap } from "gsap";
import { FaOrcid } from "react-icons/fa";
import { usePortfolio } from "../context/PortfolioContext";

export default function SideNavBar({ showStars, setShowStars }) {
  const { portfolio } = usePortfolio();
  const socials = portfolio.settings?.socials || {};
  const sideNavRef = useRef(null);
  const iconsRef = useRef([]);

  useEffect(() => {
    if (sideNavRef.current) {
      gsap.set(sideNavRef.current, {
        autoAlpha: 1,
        y: 0,
      });

      gsap.set(iconsRef.current, {
        autoAlpha: 0,
        y: -20,
        x: -10,
      });

      gsap.to(iconsRef.current, {
        autoAlpha: 1,
        y: 0,
        x: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "back.out(1.4)",
        delay: 0.9,
      });
    }
  }, []);

  const addToRefs = (el) => {
    if (el && !iconsRef.current.includes(el)) {
      iconsRef.current.push(el);
    }
  };

  return (
    <div className="side-navbar" ref={sideNavRef}>
      <a
        href={socials.github || "https://github.com/aranya170"}
        title="GitHub"
        target="_blank"
        rel="noopener noreferrer"
        ref={addToRefs}
      >
        <Icon name="GitHub" className="sidenav-icon" />
      </a>
      <a
        href={socials.linkedin || "https://www.linkedin.com/in/aranya170"}
        title="LinkedIn"
        target="_blank"
        rel="noopener noreferrer"
        ref={addToRefs}
      >
        <Icon name="Linkedin" className="sidenav-icon" />
      </a>
      <a
        href="https://orcid.org/0009-0002-1177-0871"
        title="ORCID"
        target="_blank"
        rel="noopener noreferrer"
        ref={addToRefs}
      >
        <FaOrcid className="sidenav-icon" />
      </a>
      <a
        href={`mailto:${socials.email || "aranya.akd@gmail.com"}`}
        title="Email"
        ref={addToRefs}
      >
        <Icon name="Email" className="sidenav-icon" />
      </a>
      {typeof setShowStars === "function" && (
        <>
          <div className="side-navbar-divider" ref={addToRefs}></div>
          <button
            className={`star-btn${showStars ? " star-active" : ""}`}
            onClick={() => setShowStars((prev) => !prev)}
            title={showStars ? "Disable Background" : "Enable Background"}
            type="button"
            ref={addToRefs}
          >
            <Icon name="Star" />
          </button>
        </>
      )}
    </div>
  );
}
