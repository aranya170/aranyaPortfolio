import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../styles/TechStack.css";
import { usePortfolio } from "../context/PortfolioContext";

gsap.registerPlugin(ScrollTrigger);

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
    const target = e.currentTarget;
    if (enter) {
      gsap.to(target, {
        y: -5,
        scale: 1.1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(target.querySelector(".tech-icon"), {
        color: "var(--green-bright)",
        duration: 0.3,
      });
    } else {
      gsap.to(target, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(target.querySelector(".tech-icon"), {
        color: target.dataset.color,
        duration: 0.3,
      });
    }
  };

  const renderIcon = (iconName) => {
    if (!siIcons) return null;
    const IconComp = (iconName && siIcons[iconName]) || siIcons.SiCodefactor;
    return <IconComp />;
  };

  return (
    <section id="tech-stack" ref={techStackRef}>
      <div className="section-header">
        <span className="section-title tech-title">Tech Stack</span>
      </div>

      <div className="tech-grid-container">
        {techStackData.map((tool) => (
          <div
            key={tool.name}
            className="tech-icon-container"
            data-color={tool.color}
            title={tool.name}
            onMouseEnter={(e) => handleIconHover(e, true)}
            onMouseLeave={(e) => handleIconHover(e, false)}
          >
            <div className="tech-icon" style={{ color: tool.color }}>
              {renderIcon(tool.icon_name)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}