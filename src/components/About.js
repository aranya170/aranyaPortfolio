import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Icon from "./Icons";
import "../styles/About.css";
import { usePortfolio } from "../context/PortfolioContext";

gsap.registerPlugin(ScrollTrigger);

// Paragraphs come from the admin panel. Escape everything, then re-allow only
// the highlight span, so no other HTML (or script) can reach the page.
const toSafeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;span class=(["'])highlight\1&gt;/g, '<span class="highlight">')
    .replace(/&lt;\/span&gt;/g, "</span>");

const About = () => {
  const { portfolio } = usePortfolio();
  const aboutData = portfolio.about;

  const aboutRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".about-title",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#about",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      gsap.fromTo(
        ".about-flex-container > *",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-content",
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, aboutRef);

    return () => ctx.revert();
  }, [aboutData]);

  const paragraphs = Array.isArray(aboutData.paragraphs) ? aboutData.paragraphs : [];

  return (
    <section id="about" ref={aboutRef}>
      <div className="about-content">
        <div className="about-flex-container">
          <div className="about-image-container">
            <img 
              src={aboutData.profile_image || "/assets/Aranya Kishor Das.png"} 
              alt="Aranya Kishor Das" 
              className="about-profile-image"
            />
          </div>
          
          <div className="about-text-content">
            <div className="section-header">
              <span className="section-title about-title">{aboutData.title || "About Me"}</span>
            </div>

            <div className="about-description">
              {paragraphs.map((para, idx) => (
                <p
                  key={idx}
                  dangerouslySetInnerHTML={{ __html: toSafeHtml(para) }}
                />
              ))}
            </div>

            <p className="about-timeline-link">
              <a href="#timeline">
                {aboutData.timeline_link_text || "View my timeline to learn more about my journey"}{" "}
                &rarr;
              </a>
            </p>
            <div className="about-actions">
              <a href="#contact" className="resume-button btn-effect">
                {aboutData.contact_button_text || "Get in Touch"} <Icon name="Mail" className="button-icon" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
