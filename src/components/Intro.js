import React, { useEffect, useRef } from "react";
import "../styles/Intro.css";
import RoboticCell from "./RoboticCell";
import Icon from "./Icons";
import { gsap } from "gsap";
import { usePortfolio } from "../context/PortfolioContext";
import { assetUrl } from "../services/api";

const Intro = () => {
  const { portfolio } = usePortfolio();
  const siteProfile = portfolio.siteProfile;
  const subtitle = siteProfile.subtitle || "AI Researcher & Robotics Enthusiast";

  const cursorRef = useRef(null);
  const kickerRef = useRef(null);
  const removeResizeRef = useRef(null);
  const subtitleRef = useRef(null);
  const descRef = useRef(null);
  const buttonsRef = useRef(null);
  const animationRef = useRef(null);
  const textRef = useRef(null);
  const nameRef = useRef(null);
  const hasRunRef = useRef(false);
  const animationStartedRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    gsap.set([kickerRef.current, subtitleRef.current, descRef.current, buttonsRef.current], {
      opacity: 0,
      y: 20,
    });

    if (animationRef.current) {
      gsap.set(animationRef.current, {
        opacity: 0,
        scale: 0.95,
      });
    }

    gsap.to([kickerRef.current, subtitleRef.current, descRef.current, buttonsRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.25,
      ease: "power2.out",
      delay: 0.6,
    });

    if (animationRef.current) {
      gsap.to(animationRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.6,
      });
    }

    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (!animationStartedRef.current) {
          animationStartedRef.current = true;
          startTextAnimation();
        }
      });

      setTimeout(() => {
        if (!animationStartedRef.current) {
          animationStartedRef.current = true;
          startTextAnimation();
        }
      }, 1000);
    } else {
      setTimeout(() => {
        startTextAnimation();
      }, 500);
    }

    function startTextAnimation() {
      if (!textRef.current || !nameRef.current || !cursorRef.current) return;
      const introText = textRef.current.textContent;
      const nameText = nameRef.current.textContent;

      textRef.current.textContent = "";
      nameRef.current.textContent = "";

      const introChars = introText.split("").map((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.opacity = "0";
        textRef.current.appendChild(span);
        return span;
      });

      const nameChars = nameText.split("").map((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.opacity = "0";
        nameRef.current.appendChild(span);
        return span;
      });

      const allChars = [...introChars, ...nameChars];
      const caret = cursorRef.current;
      const container = caret.parentElement;

      // Park the caret right after a character. Measured per character, so it
      // follows the text correctly even when the heading wraps on small screens.
      const moveCaretTo = (char) => {
        const box = container.getBoundingClientRect();
        const rect = char.getBoundingClientRect();
        gsap.set(caret, {
          left: rect.right - box.left + 2,
          top: rect.top - box.top + rect.height * 0.12,
          height: rect.height * 0.76,
        });
      };

      gsap.set(caret, { opacity: 1 });
      moveCaretTo(allChars[0]);

      const typingTl = gsap.timeline({
        onComplete: () => {
          caret.classList.add("typing-done");
          // Keep the caret glued to the end of the name if the layout reflows
          const lastChar = allChars[allChars.length - 1];
          const reposition = () => moveCaretTo(lastChar);
          window.addEventListener("resize", reposition);
          removeResizeRef.current = () => window.removeEventListener("resize", reposition);
        },
      });

      allChars.forEach((char) => {
        typingTl.to(char, {
          opacity: 1,
          duration: 0.05,
          ease: "none",
          onStart: () => moveCaretTo(char),
        });
      });
    }

    return () => {
      removeResizeRef.current?.();
      gsap.killTweensOf([
        kickerRef.current,
        subtitleRef.current,
        descRef.current,
        buttonsRef.current,
        animationRef.current,
      ]);
    };
  }, []);

  return (
    <div className="intro-section">
      <div className="intro-content">
        <p className="signal-kicker intro-kicker" ref={kickerRef}>
          <span className="signal-dot" aria-hidden="true" />
          AI &amp; Robotics Research
          <span className="intro-kicker-location"> · Dhaka, Bangladesh</span>
        </p>
        <div className="typist-content">
          <div className="text-typing-container" style={{ position: "relative" }}>
            <h1
              className="intro-title-wrapper"
              style={{ display: "inline", fontSize: "inherit", fontWeight: "inherit" }}
            >
              <span className="intro-title" ref={textRef}>
                {siteProfile.greeting || "Hi there! I'm "}
              </span>
              <span className="intro-name" ref={nameRef}>
                {siteProfile.name || "Aranya Kishor Das"}
              </span>
            </h1>

            <span
              ref={cursorRef}
              className="typing-caret"
              style={{ position: "absolute", pointerEvents: "none" }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="intro-subtitle" ref={subtitleRef}>
          I'm {/^[aeiou]/i.test(subtitle) ? "an" : "a"}{" "}
          <span className="intro-subtitle-name">{subtitle}</span>{" "}
          {siteProfile.subtitle_suffix || "dedicated to Intelligent Systems."}
        </div>

        <div className="intro-desc" ref={descRef}>
          {siteProfile.description}
        </div>

        <div className="intro-buttons" ref={buttonsRef}>
          <a
            href={assetUrl(siteProfile.cv_url) || "/assets/My_CV.pdf"}
            className="primary-button btn-effect"
            target="_blank"
            rel="noopener noreferrer"
          >
            View CV
            <Icon name="Document" className="button-icon" />
          </a>
          <a href="#contact" className="ghost-button btn-effect">
            Get in touch
            <Icon name="Send" className="button-icon" />
          </a>
        </div>
      </div>

      {siteProfile.show_robot !== false && (
        <div className="intro-animation" ref={animationRef}>
          <RoboticCell />
        </div>
      )}
    </div>
  );
};

export default Intro;
