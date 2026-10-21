import React, { useState, useEffect } from 'react';
import { GitHubCalendar } from 'react-github-calendar'; 
import '../styles/GitHubContributions.css';

const GitHubContributions = () => {
  const [stats, setStats] = useState({ repos: 0, followers: 0 });
  const username = "aranya170";

  useEffect(() => {
    fetch(`https://api.github.com/users/${username}`)
      .then(res => res.json())
      .then(data => {
        setStats({
          repos: data.public_repos || 0,
          followers: data.followers || 0
        });
      })
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  // Updated theme to match the vibrant green in your screenshot
  const theme = {
    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#4ade80'],
  };

  return (
    <section id="github" className="gh-contrib-container">
      <div className="section-header">
        <h2 className="section-title">GitHub</h2>
      </div>

      <div className="gh-content">
        <span className="gh-tag">Open Source</span>
        <p className="gh-subtitle">My journey in the open-source galaxy</p>

        <div className="gh-stats-row">
          <div className="stat-item">
            <span className="stat-value">{stats.repos}</span>
            <span className="stat-label">Repositories</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.followers}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>

        <div className="gh-graph-card">
          <GitHubCalendar 
            username={username}
            theme={theme}
            fontSize={12}
            blockSize={12}
            blockMargin={4}
            showWeekdayLabels
          />
        </div>

        <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="gh-footer-link">
           Follow @{username} on GitHub →
        </a>
      </div>
    </section>
  );
};

export default GitHubContributions;