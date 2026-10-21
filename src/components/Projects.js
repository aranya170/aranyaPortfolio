import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";

import ProjectList from "./ProjectList";
import Icon from "./Icons";
import "../styles/Projects.css";
import {
  VscFolder,
  VscFolderOpened,
  VscMarkdown,
  VscChevronRight,
  VscGlobe,
} from "react-icons/vsc";
import { FaDatabase, FaPython } from "react-icons/fa";
import { BsDatabase } from "react-icons/bs";
import { usePortfolio } from "../context/PortfolioContext";
import { assetUrl } from "../services/api";

gsap.registerPlugin(ScrollTrigger, Flip);

// The syntax highlighter is large and only needed when a code file is opened
const CodeViewer = lazy(() => import("./CodeViewer"));

function getFileIcon(file) {
  const iconStyle = { marginRight: 6, fontSize: 15, flexShrink: 0 };
  if (!file || !file.name)
    return <VscMarkdown style={{ ...iconStyle, color: "#8a9a94" }} />;
  if (file.name.endsWith(".md"))
    return <VscMarkdown style={{ ...iconStyle, color: "#519975" }} />;
  if (file.name.endsWith(".sql"))
    return <FaDatabase style={{ ...iconStyle, color: "#00758f" }} />;
  if (file.name.endsWith(".ipynb"))
    return <FaPython style={{ ...iconStyle, color: "#3572A5" }} />;
  if (file.name.toLowerCase().includes("website") || file.type === "website") {
    return <VscGlobe style={{ ...iconStyle, color: "#34d399" }} />;
  }
  return <VscMarkdown style={{ ...iconStyle, color: "#8a9a94" }} />;
}

const getInitialOpenFolders = (projects) =>
  Object.fromEntries((projects || []).map((_, idx) => [idx, idx === 0]));

const getReadmeIdx = (files) => {
  if (!files || !Array.isArray(files) || files.length === 0) return 0;
  const idx = files.findIndex(
    (file) => file && file.name && file.name.toLowerCase() === "readme.md",
  );
  return idx >= 0 ? idx : 0;
};

export default function Projects() {
  const { portfolio } = usePortfolio();
  const projectsData =
    portfolio &&
    portfolio.projects &&
    Object.keys(portfolio.projects).length > 0
      ? portfolio.projects
      : ProjectList;

  const sectionKeys = Object.keys(projectsData);

  const [selected, setSelected] = useState(() =>
    sectionKeys.reduce((acc, section) => {
      acc[section] = { projectIdx: 0, fileIdx: null };
      return acc;
    }, {}),
  );

  const [openFolders, setOpenFolders] = useState({});
  const [activeFolders, setActiveFolders] = useState({});

  const projectsRef = useRef(null);
  const contentRefs = useRef({});
  const foldersRef = useRef({});
  const filesListRef = useRef({});

  // Sync state when projectsData updates
  useEffect(() => {
    contentRefs.current = sectionKeys.reduce((acc, section) => {
      acc[section] = contentRefs.current[section] || React.createRef();
      return acc;
    }, {});

    setSelected((prev) => {
      const next = { ...prev };
      sectionKeys.forEach((section) => {
        if (!next[section]) {
          next[section] = { projectIdx: 0, fileIdx: null };
        }
      });
      return next;
    });

    sectionKeys.forEach((section) => {
      if (!foldersRef.current[section]) foldersRef.current[section] = {};
      if (!filesListRef.current[section]) filesListRef.current[section] = {};

      const initialOpenState = getInitialOpenFolders(projectsData[section]);

      setOpenFolders((prev) => ({
        ...prev,
        [section]: prev[section] || initialOpenState,
      }));

      setActiveFolders((prev) => ({
        ...prev,
        [section]: prev[section] !== undefined ? prev[section] : 0,
      }));
    });
  }, [projectsData]);

  // Entrance animations with scoped context
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "#projects .section-title",
        {
          y: 30,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#projects",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.utils.toArray(".projects-section-container").forEach((sectionEl) => {
        gsap.fromTo(
          sectionEl,
          {
            y: 40,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionEl,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    }, projectsRef);

    return () => ctx.revert();
  }, [sectionKeys.length]);

  const animateFolderToggle = (section, idx, isOpen) => {
    const folderEl = foldersRef.current?.[section]?.[idx];
    const filesEl = filesListRef.current?.[section]?.[idx];

    if (!folderEl || !filesEl) return;

    const fileItems = filesEl.querySelectorAll("li");
    const chevron = folderEl.querySelector(".chevron-icon");

    if (isOpen) {
      filesEl.style.display = "block";
      filesEl.style.height = "auto";

      gsap.set(fileItems, {
        opacity: 0,
        y: 20,
      });

      gsap.to(fileItems, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out",
      });

      gsap.to(folderEl.querySelector(".folder-icon"), {
        color: "var(--green-bright)",
        duration: 0.3,
      });

      if (chevron) {
        gsap.to(chevron, {
          rotate: 90,
          duration: 0.3,
        });
      }
    } else {
      gsap.to(fileItems, {
        opacity: 0,
        y: 10,
        duration: 0.3,
        stagger: 0.02,
        ease: "power2.in",
        onComplete: () => {
          filesEl.style.display = "none";
        },
      });

      gsap.to(folderEl.querySelector(".folder-icon"), {
        color: "#8a9a94",
        duration: 0.3,
      });

      if (chevron) {
        gsap.to(chevron, {
          rotate: 0,
          duration: 0.3,
        });
      }
    }
  };

  const handleFolderToggle = (section, idx) => {
    const isCurrentlyOpen = openFolders[section]?.[idx];

    setActiveFolders((prev) => ({
      ...prev,
      [section]: idx,
    }));

    if (!isCurrentlyOpen) {
      if (foldersRef.current?.[section]?.[idx]) {
        gsap.to(foldersRef.current[section][idx], {
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          duration: 0.3,
          ease: "power2.out",
        });
      }

      setOpenFolders((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [idx]: true,
        },
      }));

      const files = projectsData[section]?.[idx]?.files;
      const readmeIdx = getReadmeIdx(files);
      handleFileSelect(section, idx, readmeIdx);

      setTimeout(() => animateFolderToggle(section, idx, true), 50);
    } else if (selected[section]?.projectIdx === idx) {
      animateFolderToggle(section, idx, false);

      if (foldersRef.current?.[section]?.[idx]) {
        gsap.to(foldersRef.current[section][idx], {
          backgroundColor: "transparent",
          duration: 0.3,
          ease: "power2.in",
        });
      }

      setTimeout(() => {
        setOpenFolders((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            [idx]: false,
          },
        }));
      }, 300);
    } else {
      const files = projectsData[section]?.[idx]?.files;
      const readmeIdx = getReadmeIdx(files);

      if (foldersRef.current?.[section]?.[activeFolders[section]]) {
        gsap.to(foldersRef.current[section][activeFolders[section]], {
          backgroundColor: "transparent",
          duration: 0.3,
          ease: "power2.in",
        });
      }

      if (foldersRef.current?.[section]?.[idx]) {
        gsap.to(foldersRef.current[section][idx], {
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          duration: 0.3,
          ease: "power2.out",
        });
      }

      handleFileSelect(section, idx, readmeIdx);
    }
  };

  const handleFileSelect = (section, projectIdx, fileIdx) => {
    setOpenFolders((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [projectIdx]: true,
      },
    }));

    setActiveFolders((prev) => ({
      ...prev,
      [section]: projectIdx,
    }));

    const contentElement = contentRefs.current[section]?.current;

    if (contentElement) {
      gsap.to(contentElement.children, {
        opacity: 0,
        y: -15,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setSelected((prev) => ({
            ...prev,
            [section]: { projectIdx, fileIdx },
          }));

          setTimeout(() => {
            gsap.fromTo(
              contentElement.children,
              {
                y: 20,
                opacity: 0,
              },
              {
                y: 0,
                opacity: 1,
                duration: 0.5,
                ease: "power2.out",
                stagger: 0.05,
              },
            );
          }, 50);
        },
      });
    } else {
      setSelected((prev) => ({
        ...prev,
        [section]: { projectIdx, fileIdx },
      }));
    }
  };

  const handleFileHover = (enter, element) => {
    if (element && !element.classList.contains("active")) {
      gsap.to(element, {
        paddingLeft: enter ? "12px" : "8px",
        color: enter ? "var(--green-bright)" : "var(--lightest-slate)",
        duration: 0.2,
      });
    }
  };

  const saveFolderRef = (section, idx, el) => {
    if (!foldersRef.current[section]) {
      foldersRef.current[section] = {};
    }
    foldersRef.current[section][idx] = el;
  };

  const saveFilesListRef = (section, idx, el) => {
    if (!filesListRef.current[section]) {
      filesListRef.current[section] = {};
    }
    filesListRef.current[section][idx] = el;
  };

  return (
    <section id="projects" ref={projectsRef}>
      <div className="section-header">
        <h2 className="section-title">Projects</h2>
      </div>

      {sectionKeys.map((section) => {
        const projects = projectsData[section] || [];
        if (!projects || projects.length === 0) return null;

        const sectionState = selected[section] || { projectIdx: 0, fileIdx: null };
        const safeProjectIdx =
          sectionState.projectIdx < projects.length &&
          sectionState.projectIdx >= 0
            ? sectionState.projectIdx
            : 0;
        const selectedProject = projects[safeProjectIdx] || projects[0];

        const files =
          selectedProject &&
          Array.isArray(selectedProject.files) &&
          selectedProject.files.length > 0
            ? selectedProject.files
            : [{ name: "README.md", type: "info", content: "Project Details" }];

        // fileIdx is null until a visitor picks a file: open on the README card (with the project image)
        const requestedFileIdx =
          sectionState.fileIdx === null || sectionState.fileIdx === undefined
            ? getReadmeIdx(files)
            : sectionState.fileIdx;
        const safeFileIdx =
          requestedFileIdx < files.length && requestedFileIdx >= 0 ? requestedFileIdx : 0;
        const selectedFile = files[safeFileIdx] || files[0];
        const activeFolder =
          activeFolders[section] !== undefined ? activeFolders[section] : 0;

        return (
          <div key={section} className="projects-section-container">
            <div className="projects-directory-layout">
              <h3 className="project-section-title">
                <span className="gradient-text">{section}</span> Projects
              </h3>
              <div className="project-section">
                <div className="directory-box">
                  <div className="directory-bg-elements">
                    <div className="directory-circle"></div>
                    <div className="directory-square"></div>
                  </div>
                  <div className="directory-sidebar">
                    <ul className="directory-tree">
                      {projects.map((project, idx) => {
                        const isOpen = openFolders[section]?.[idx];
                        const isActive = activeFolder === idx;
                        const isSqlProject =
                          project.name?.toLowerCase().includes("sql") ||
                          (Array.isArray(project.files) &&
                            project.files.some(
                              (file) =>
                                file && file.name && file.name.endsWith(".sql"),
                            ));

                        const projectFiles = Array.isArray(project.files)
                          ? project.files
                          : [];

                        return (
                          <li
                            key={project.id || idx}
                            className="project-item"
                            data-project-type={isSqlProject ? "sql" : "other"}
                          >
                            <div
                              ref={(el) => saveFolderRef(section, idx, el)}
                              className={`directory-folder ${isOpen ? "open" : ""} ${
                                isActive ? "active" : ""
                              }`}
                              onClick={() => handleFolderToggle(section, idx)}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  gsap.to(e.currentTarget, {
                                    backgroundColor:
                                      "rgba(16, 185, 129, 0.05)",
                                    duration: 0.2,
                                  });
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  gsap.to(e.currentTarget, {
                                    backgroundColor: "transparent",
                                    duration: 0.2,
                                  });
                                }
                              }}
                            >
                              <VscChevronRight
                                className="chevron-icon"
                                style={{
                                  marginRight: 2,
                                  fontSize: 15,
                                  flexShrink: 0,
                                  transform: isOpen
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                }}
                              />
                              {isOpen ? (
                                <VscFolderOpened
                                  className="folder-icon"
                                  style={{
                                    marginRight: 6,
                                    color: isActive
                                      ? "var(--green-bright)"
                                      : "#8a9a94",
                                    fontSize: 15,
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <VscFolder
                                  className="folder-icon"
                                  style={{
                                    marginRight: 6,
                                    color: isActive
                                      ? "var(--green-bright)"
                                      : "#8a9a94",
                                    fontSize: 15,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span className="folder-name">
                                {project.name}
                              </span>
                            </div>

                            <ul
                              ref={(el) => saveFilesListRef(section, idx, el)}
                              className="directory-files"
                              style={{
                                display: isOpen ? "block" : "none",
                                overflow: "hidden",
                              }}
                            >
                              {projectFiles.map((file, fIdx) => {
                                const isActiveFile =
                                  safeProjectIdx === idx &&
                                  safeFileIdx === fIdx;

                                return (
                                  <li key={fIdx} className="file-item">
                                    <button
                                      className={`directory-file-btn${
                                        isActiveFile ? " active" : ""
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        gsap.fromTo(
                                          e.currentTarget,
                                          { scale: 0.98 },
                                          {
                                            scale: 1,
                                            duration: 0.2,
                                            ease: "back.out(1.5)",
                                          },
                                        );
                                        handleFileSelect(section, idx, fIdx);
                                      }}
                                      onMouseEnter={(e) =>
                                        handleFileHover(true, e.currentTarget)
                                      }
                                      onMouseLeave={(e) =>
                                        handleFileHover(false, e.currentTarget)
                                      }
                                    >
                                      {getFileIcon(file)}
                                      {file.name}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div
                    className="directory-content"
                    ref={contentRefs.current[section]}
                  >
                    {selectedFile && selectedFile.type === "info" ? (
                      <div className="project-info-container">
                        {selectedProject.image && (
                          <div className="project-image-wrap">
                            <img
                              key={selectedProject.image}
                              className="project-image"
                              src={assetUrl(selectedProject.image)}
                              alt={selectedProject.name}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="project-content">
                          <h4 className="project-title">
                            {selectedProject.name}
                          </h4>

                          <p className="project-description">
                            {selectedFile.content || "Project description"}
                          </p>
                          <div className="project-meta">
                            <ul className="project-tags">
                              {selectedProject.tags &&
                                selectedProject.tags.map((tag, i) => (
                                  <li key={i} className="tag-pill">
                                    {tag}
                                  </li>
                                ))}
                            </ul>

                            <div className="project-links">
                              {selectedProject.dataset && (
                                <a
                                  href={selectedProject.dataset}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Dataset"
                                  className="icon-link dataset-link"
                                >
                                  <BsDatabase />
                                </a>
                              )}
                              {selectedProject.medium && (
                                <a
                                  href={selectedProject.medium}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Article"
                                  className="icon-link"
                                >
                                  <Icon name="Medium" />
                                </a>
                              )}
                              {selectedProject.website && (
                                <a
                                  href={selectedProject.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Live Site"
                                  className="icon-link website-link"
                                >
                                  <VscGlobe style={{ fontSize: "18px" }} />
                                </a>
                              )}
                              {selectedProject.github && (
                                <a
                                  href={selectedProject.github}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="GitHub"
                                  className="icon-link github-link"
                                >
                                  <Icon name="GitHub" />
                                </a>
                              )}
                              {selectedProject.tableau && (
                                <a
                                  href={selectedProject.tableau}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Dashboard"
                                  className="icon-link tableau-link"
                                >
                                  <Icon name="Tableau" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="code-viewer-container">
                        <div className="code-header">
                          <span className="file-name">
                            {selectedFile?.name}
                          </span>
                          <div className="code-language-badge">
                            {selectedFile?.language || "code"}
                          </div>
                        </div>
                        <Suspense fallback={<div className="code-viewer" />}>
                          <CodeViewer
                            code={selectedFile?.content || ""}
                            language={selectedFile?.language || "javascript"}
                            type={selectedFile?.type || "code"}
                          />
                        </Suspense>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
