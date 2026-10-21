import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import ProjectList from "../components/ProjectList";

const initialDefaultData = {
  siteProfile: {
    greeting: "Hi there! I'm ",
    name: "Aranya Kishor Das",
    subtitle: "AI Researcher & Robotics Enthusiast",
    subtitle_suffix: "dedicated to Intelligent Systems.",
    description:
      "From building RC cars in highschool to leading UIU Robotics and researching AI, I'm driven by a passion for creating smarter solutions through Deep Learning and Robotics.",
    cv_url: "/assets/My_CV.pdf",
    show_robot: true,
    show_stars: true,
  },
  about: {
    title: "About Me",
    profile_image: "/assets/Aranya Kishor Das.png",
    paragraphs: [
      "I am an undergraduate research assistant and a robotics enthusiast, and the President of the UIU Robotics Club at United International University, following a childhood spark for electronics that expanded into web development, deep learning, and artificial intelligence. Driven by a passion for solving puzzles and building things, my background spans computer science, design, and multiple academic achievements. Outside of my technical work and leadership roles, I enjoy playing video games, exploring designs, and collecting cool tech products.",
    ],
    timeline_link_text: "View my timeline to learn more about my unique journey",
    contact_button_text: "Get in Touch",
  },
  projects: ProjectList,
  experiences: [
    {
      company: "United International University",
      job_title: "Undergraduate Assistant",
      duration: "Feb 2024 - Present",
      location: "Dhaka, Bangladesh",
      descriptions: [
        "Served as an Undergraduate Assistant.",
        "Created RoboNeT, the first-ever open-source robotics, networking, IoT & data communication repository in Bangladesh.",
        "Facilitated hands-on labs and mentoring for students in robotics and embedded systems.",
      ],
      sort_order: 1,
    },
    {
      company: "UIU Robotics Club",
      job_title: "President",
      duration: "Nov 2025 - Present",
      location: "Dhaka, Bangladesh",
      descriptions: [
        "Strategic Leadership: Directing the organization's overarching strategy, operations, and corporate partnerships to drive success in national competitions.",
        "Team Mentorship: Actively mentoring sub-team leads across the Software, Hardware, and R&D divisions.",
        "Technical Training: Planning and executing advanced technical training series, such as \"RoboNeT in Practice.\"",
        "Financial & Corporate Management: Managing comprehensive finances and securing corporate sponsorships.",
        "Event Oversight: Directing the execution of large-scale initiatives, including CSE Fest, the Global Robotics and Innovation Competition, and the World Robot Olympiad.",
      ],
      sort_order: 2,
    },
    {
      company: "Self-Employed",
      job_title: "Freelance Full-Stack Developer",
      duration: "Dec 2024 - Aug 2026",
      location: "Remote",
      descriptions: [
        "Built custom web apps and e-commerce platforms using Tailwind CSS, PHP, React, and MySQL.",
        "Delivered end-to-end commercial solutions such as Dacca Delights bakery platform.",
      ],
      sort_order: 3,
    },
    {
      company: "Crossroads Initiative",
      job_title: "Technical Support",
      duration: "Nov 2020 - Jun 2022",
      location: "Dhaka, Bangladesh",
      descriptions: [
        "Directed the development of community-focused web and mobile applications while managing and delivering IT solutions for internal operations and students",
      ],
      sort_order: 4,
    },
  ],
  timeline: [
    {
      title: "Early Curiosity",
      description: "Fascinated by computers and RC cars in Class 8, discovering microcontrollers like Arduino and ESP.",
      year: "2015",
      type: "idea",
      sort_order: 1,
    },
    {
      title: "Tech Exploration",
      description: "Explored competitive programming, web development, graphics design, and video editing.",
      year: "2015 - 2019",
      type: "career",
      sort_order: 2,
    },
    {
      title: "Global Offers & Pivots",
      description: "Received 19 university admission offers across the USA and Switzerland; enrolled at UIU.",
      year: "2020 - 2021",
      type: "education",
      sort_order: 3,
    },
    {
      title: "Deep Dive in AI & Robotics",
      description: "Joined UIU Robotics, began publishing research, and focused on Deep Learning.",
      year: "2022 - 2024",
      type: "research",
      sort_order: 4,
    },
    {
      title: "President & Lead Researcher",
      description: "Became President of UIU Robotics and Undergraduate Assistant under Dr. Mohammad Nurul Huda.",
      year: "2024 - 2025",
      type: "startup",
      sort_order: 5,
    },
    {
      title: "Present & Future Horizons",
      description: "Pursuing higher research in AI, intelligent robotics, and scalable systems.",
      year: "2025 - Present",
      type: "statistics",
      sort_order: 6,
    },
  ],
  techStack: [
    { name: "MySQL", icon_name: "SiMysql", color: "#00758F", category: "Database", sort_order: 1 },
    { name: "Java", icon_name: "SiOpenjdk", color: "#007396", category: "Language", sort_order: 2 },
    { name: "Python", icon_name: "SiPython", color: "#FFD43B", category: "Language", sort_order: 3 },
    { name: "Pandas", icon_name: "SiPandas", color: "#150458", category: "Data", sort_order: 4 },
    { name: "NumPy", icon_name: "SiNumpy", color: "#013243", category: "Data", sort_order: 5 },
    { name: "Git", icon_name: "SiGit", color: "#F1502F", category: "Tools", sort_order: 6 },
    { name: "Jupyter", icon_name: "SiJupyter", color: "#F37626", category: "Tools", sort_order: 7 },
    { name: "Figma", icon_name: "SiFigma", color: "#F24E1E", category: "Design", sort_order: 8 },
    { name: "Illustrator", icon_name: "SiAdobeillustrator", color: "#FF9A00", category: "Design", sort_order: 9 },
    { name: "Photoshop", icon_name: "SiAdobephotoshop", color: "#31A8FF", category: "Design", sort_order: 10 },
    { name: "Github", icon_name: "SiGithub", color: "#696868ff", category: "Tools", sort_order: 11 },
    { name: "Html5", icon_name: "SiHtml5", color: "#E34F26", category: "Frontend", sort_order: 12 },
    { name: "Css3", icon_name: "SiCss3", color: "#1572B6", category: "Frontend", sort_order: 13 },
    { name: "Tailwindcss", icon_name: "SiTailwindcss", color: "#06B6D4", category: "Frontend", sort_order: 14 },
    { name: "Javascript", icon_name: "SiJavascript", color: "#F7DF1E", category: "Frontend", sort_order: 15 },
    { name: "Jira", icon_name: "SiJira", color: "#2684FF", category: "Tools", sort_order: 16 },
    { name: "Tinkercad", icon_name: "SiTinkercad", color: "#0066B6", category: "Hardware", sort_order: 17 },
    { name: "C++", icon_name: "SiCplusplus", color: "#00599C", category: "Language", sort_order: 18 },
    { name: "C", icon_name: "SiC", color: "#A8B9CC", category: "Language", sort_order: 19 },
    { name: "React", icon_name: "SiReact", color: "#61DAFB", category: "Frontend", sort_order: 20 },
    { name: "Next.js", icon_name: "SiNextdotjs", color: "#686767ff", category: "Frontend", sort_order: 21 },
    { name: "Flutter", icon_name: "SiFlutter", color: "#02569B", category: "Mobile", sort_order: 22 },
  ],
  settings: {
    socials: {
      github: "https://github.com/aranya170",
      linkedin: "https://www.linkedin.com/in/aranya170",
      email: "aranya.akd@gmail.com",
    },
    footer: {
      copyrightText: "© {year} Aranya Kishor Das. All rights reserved.",
    },
  },
};

const CACHE_KEY = "portfolio_cache_v1";

// Last good API response, so returning visitors see real content instantly
// while the (sometimes sleeping) Render backend wakes up.
const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage full or blocked (private mode): the cache is only a nicety
  }
};

const mergeWithDefaults = (data, prev) => ({
  ...prev,
  siteProfile: data.siteProfile || prev.siteProfile,
  about: data.about || prev.about,
  projects:
    data.projects && Object.keys(data.projects).length > 0 ? data.projects : prev.projects,
  experiences:
    data.experiences && data.experiences.length > 0 ? data.experiences : prev.experiences,
  timeline: data.timeline && data.timeline.length > 0 ? data.timeline : prev.timeline,
  techStack: data.techStack && data.techStack.length > 0 ? data.techStack : prev.techStack,
  settings: data.settings || prev.settings,
});

const PortfolioContext = createContext({
  portfolio: initialDefaultData,
  loading: true,
  // "default" (built-in copy), "cache" (last visit) or "live" (fresh from the API)
  dataSource: "default",
  isBackendOnline: false,
  refreshPortfolio: () => {},
});

export const PortfolioProvider = ({ children }) => {
  const [cached] = useState(readCache);
  const [portfolio, setPortfolio] = useState(() =>
    cached ? mergeWithDefaults(cached, initialDefaultData) : initialDefaultData
  );
  const [dataSource, setDataSource] = useState(cached ? "cache" : "default");
  const [loading, setLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  const fetchPortfolioData = useCallback(async () => {
    try {
      const res = await api.getPortfolio();
      if (res && res.success && res.data) {
        setPortfolio((prev) => mergeWithDefaults(res.data, prev));
        writeCache(res.data);
        setDataSource("live");
        setIsBackendOnline(true);
      }
    } catch (err) {
      console.warn("Using default portfolio state due to:", err.message);
      setIsBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return (
    <PortfolioContext.Provider
      value={{
        portfolio,
        loading,
        dataSource,
        isBackendOnline,
        refreshPortfolio: fetchPortfolioData,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => useContext(PortfolioContext);

export default PortfolioContext;
