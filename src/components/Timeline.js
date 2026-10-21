import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FiZap, FiCompass, FiAward, FiCpu, FiUsers, FiTrendingUp } from "react-icons/fi";
import "../styles/Timeline.css";
import { usePortfolio } from "../context/PortfolioContext";

gsap.registerPlugin(ScrollTrigger);

export default function Timeline() {
  const { portfolio } = usePortfolio();
  const milestones = portfolio.timeline;

  const timelineWrapRef = useRef(null);
  const timelineItemsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".timeline-title",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#timeline",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      gsap.fromTo(
        ".timeline-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1,
          ease: "none",
          scrollTrigger: {
            trigger: timelineWrapRef.current,
            start: "top 75%",
            end: "bottom 30%",
            scrub: true,
          },
        }
      );

      timelineItemsRef.current.forEach((item, index) => {
        if (!item) return;
        const direction = index % 2 === 0 ? -1 : 1;
        const content = item.querySelector(".timeline-content");
        const dot = item.querySelector(".timeline-dot");
        const date = item.querySelector(".timeline-date");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });

        if (content && dot && date) {
          tl.fromTo(
            content,
            { x: direction * 40, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.5,
              ease: "power2.out",
            }
          )
            .fromTo(
              dot,
              { scale: 0, opacity: 0 },
              {
                scale: 1,
                opacity: 1,
                duration: 0.3,
                ease: "back.out(1.7)",
              },
              "-=0.3"
            )
            .fromTo(
              date,
              { opacity: 0, y: 10 },
              {
                opacity: 1,
                y: 0,
                duration: 0.3,
                ease: "power2.out",
              },
              "-=0.2"
            );
        }
      });
    }, timelineWrapRef);

    return () => ctx.revert();
  }, [milestones]);

  const renderIcon = (type) => {
    switch (type) {
      case "idea":
        return <FiZap className="timeline-icon" />;
      case "career":
        return <FiCompass className="timeline-icon" />;
      case "education":
        return <FiAward className="timeline-icon" />;
      case "research":
        return <FiCpu className="timeline-icon" />;
      case "startup":
        return <FiUsers className="timeline-icon" />;
      case "statistics":
        return <FiTrendingUp className="timeline-icon" />;
      default:
        return <FiZap className="timeline-icon" />;
    }
  };

  return (
    <section id="timeline">
      <div className="section-header">
        <h2 className="section-title timeline-title">Timeline</h2>
      </div>

      <div className="timeline-wrapper" ref={timelineWrapRef}>
        <div className="timeline-track"></div>
        <div className="timeline-line"></div>
        <div className="timeline-items">
          {milestones.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`timeline-item ${idx % 2 === 0 ? "left" : "right"}${
                idx === milestones.length - 1 ? " is-current" : ""
              }`}
              ref={(el) => (timelineItemsRef.current[idx] = el)}
            >
              <div className="timeline-dot">{renderIcon(item.type)}</div>
              <div className="timeline-date">{item.year || item.timeframe}</div>
              <div className="timeline-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
