import React, { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import "../styles/Experience.css";
import { usePortfolio } from "../context/PortfolioContext";

const JobList = () => {
  const { portfolio } = usePortfolio();

  // An array (not an object keyed by company) so several roles at the same
  // company, e.g. President / Vice President, each get their own tab.
  const experienceItems = portfolio.experiences.map((exp) => {
    let descs = exp.descriptions;
    if (typeof descs === "string") {
      try {
        descs = JSON.parse(descs);
      } catch (e) {
        descs = [];
      }
    }
    return {
      company: exp.company,
      jobTitle: exp.job_title,
      duration: exp.duration,
      desc: Array.isArray(descs) ? descs : [String(descs)],
    };
  });

  const companyCounts = experienceItems.reduce((acc, item) => {
    acc[item.company] = (acc[item.company] || 0) + 1;
    return acc;
  }, {});
  const tabLabel = (item) =>
    companyCounts[item.company] > 1 ? `${item.company} · ${item.jobTitle}` : item.company;

  const [value, setValue] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(window.innerWidth < 600);
  const contentRef = useRef(null);

  const safeIndex = value < experienceItems.length && value >= 0 ? value : 0;
  const currentItem = experienceItems[safeIndex] || {
    company: "",
    jobTitle: "",
    duration: "",
    desc: [],
  };

  useEffect(() => {
    const handleResize = () => {
      setIsHorizontal(window.innerWidth < 600);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTabChange = (index) => {
    if (index === value) return;

    if (contentRef.current) {
      gsap.to(contentRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setValue(index);
          gsap.fromTo(
            contentRef.current,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
          );
        },
      });
    } else {
      setValue(index);
    }
  };

  return (
    <div className={`joblist-root ${isHorizontal ? "horizontal" : "vertical"}`}>
      <div className={`joblist-tabs ${isHorizontal ? "horizontal" : "vertical"}`}>
        {experienceItems.map((item, i) => (
          <button
            key={`${item.company}-${item.jobTitle}-${i}`}
            className={`joblist-tab${safeIndex === i ? " active" : ""}`}
            onClick={() => handleTabChange(i)}
            title={`${item.jobTitle} @ ${item.company}`}
          >
            {isHorizontal ? `0${i + 1}.` : tabLabel(item)}
          </button>
        ))}
      </div>

      <div className="joblist-content" ref={contentRef}>
        <div className="joblist-panel">
          <span className="joblist-job-title">{currentItem.jobTitle} </span>
          <span className="joblist-job-company">{currentItem.company}</span>
          <div className="joblist-duration">{currentItem.duration}</div>
          <ul className="job-description">
            {currentItem.desc.map((descItem, j) => (
              <li key={j}>{descItem}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JobList;
