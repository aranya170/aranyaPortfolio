import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../styles/TechStack.css";
import { usePortfolio } from "../context/PortfolioContext";

gsap.registerPlugin(ScrollTrigger);

// Brand colours like GitHub's near-black disappear on the dark background
const readableColor = (hex) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || "");
  if (!m) return "var(--text)";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.06 ? "var(--text)" : `#${m[1]}`;
};

export default function TechStack() {
  const { portfolio } = usePortfolio();
  const techStackData = portfolio.techStack;

  const techStackRef = useRef(null);
  const [siIcons, setSiIcons] = useState(null);

  // react-icons/si holds thousands of icons; load it as a separate chunk
  // instead of shipping it in the main bundle, and only once the section is near the viewport.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      import("react-icons/si").then((mod) => {
        if (!cancelled) setSiIcons(mod);
      });

    if (!("IntersectionObserver" in window) || !techStackRef.current) {
      load();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(techStackRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tech-title",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#tech-stack",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      gsap.fromTo(
        ".tech-icon-container",
        { scale: 0.5, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: {
            grid: [4, 6],
            from: "center",
            amount: 0.6,
          },
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: "#tech-stack",
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, techStackRef);

    return () => ctx.revert();
  }, [techStackData]);

  const handleIconHover = (e, enter) => {
    gsap.to(e.currentTarget, {
      y: enter ? -4 : 0,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const renderIcon = (iconName) => {
    if (!siIcons) return null;
    const IconComp = (iconName && siIcons[iconName]) || siIcons.SiCodefactor;
    return <IconComp />;
  };

  return (
    <section id="tech-stack" ref={techStackRef}>
      <div className="section-header">
        <h2 className="section-title tech-title">Tech Stack</h2>
      </div>

      <div className="tech-grid-container">
        {techStackData.map((tool) => (
          <div
            key={tool.name}
            className="tech-icon-container"
            onMouseEnter={(e) => handleIconHover(e, true)}
            onMouseLeave={(e) => handleIconHover(e, false)}
          >
            <div className="tech-icon" style={{ color: readableColor(tool.color) }} aria-hidden="true">
              {renderIcon(tool.icon_name)}
            </div>
            <span className="tech-name">{tool.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}