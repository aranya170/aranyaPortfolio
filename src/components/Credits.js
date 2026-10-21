import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../styles/Credits.css";
import SideNavBar from "./SideNavBar";
import { usePortfolio } from "../context/PortfolioContext";

gsap.registerPlugin(ScrollTrigger);

const Credits = () => {
  const creditsRef = useRef(null);
  const { portfolio } = usePortfolio();

  const socials = portfolio?.settings?.socials || {
    github: "https://github.com/aranya170",
    linkedin: "https://www.linkedin.com/in/aranya170",
    email: "aranya.akd@gmail.com",
  };

  const copyrightText = (
    portfolio?.settings?.footer?.copyrightText ||
    "© {year} Aranya Kishor Das. All rights reserved."
  ).replace("{year}", new Date().getFullYear());

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        creditsRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#credits",
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, creditsRef);

    return () => ctx.revert();
  }, []);

  return (
    <div id="credits" ref={creditsRef}>
      <div className="ending-credits">
        <SideNavBar />
        <div className="social-links-footer">
          <a
            href={socials.github || "https://github.com/aranya170"}
            target="_blank"
            rel="noopener noreferrer me"
            title="Aranya Kishor Das on GitHub"
          >
            GitHub
          </a>
          <span className="footer-separator" aria-hidden="true">/</span>
          <a
            href={socials.linkedin || "https://www.linkedin.com/in/aranya170"}
            target="_blank"
            rel="noopener noreferrer me"
            title="Aranya Kishor Das on LinkedIn"
          >
            LinkedIn
          </a>
        </div>
        <div className="footer-copyright">{copyrightText}</div>
      </div>
    </div>
  );
};

export default Credits;
