import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import JobList from "./JobList";
import "../styles/Experience.css";

gsap.registerPlugin(ScrollTrigger);

const Experience = () => {
  const [activeKey, setActiveKey] = useState("1");
  const experienceRef = useRef(null);
  const contentRef = useRef(null);

  const handleSelect = (eventKey) => {
    setActiveKey(eventKey);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".experience-title",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#experience",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      gsap.fromTo(
        contentRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#experience",
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, experienceRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="experience" ref={experienceRef}>
      <div className="section-header">
        <h2 className="section-title experience-title">Experience</h2>
      </div>

      <div className="experience-content" ref={contentRef}>
        <JobList activeKey={activeKey} handleSelect={handleSelect} />
      </div>
    </section>
  );
};

export default Experience;