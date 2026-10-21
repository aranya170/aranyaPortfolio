const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { pool, testConnection } = require("../config/db");
const seedData = require("./seedData");

async function initDatabase(force = false) {
  console.log("----------------------------------------------------");
  console.log("Checking PostgreSQL database connection...");
  const connected = await testConnection();

  if (!connected) {
    console.warn("⚠️  PostgreSQL is not reachable with current config.");
    console.warn("ℹ️  Server will operate in resilient mode with local persistent storage.");
    console.warn("💡 To connect live PostgreSQL, set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE in server/.env");
    return false;
  }

  console.log("✅ Successfully connected to PostgreSQL!");

  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    if (force) {
      // Admin accounts and visitor messages are deliberately kept across a reseed
      console.log("Resetting content tables...");
      await pool.query(`
        DROP TABLE IF EXISTS project_files CASCADE;
        DROP TABLE IF EXISTS projects CASCADE;
        DROP TABLE IF EXISTS site_profile CASCADE;
        DROP TABLE IF EXISTS about_section CASCADE;
        DROP TABLE IF EXISTS experiences CASCADE;
        DROP TABLE IF EXISTS timeline_events CASCADE;
        DROP TABLE IF EXISTS tech_stack CASCADE;
        DROP TABLE IF EXISTS site_settings CASCADE;
      `);
    }

    // Execute schema
    await pool.query(schemaSql);
    console.log("✅ PostgreSQL schema applied successfully.");

    // Check if admin exists
    const adminCheck = await pool.query("SELECT COUNT(*) FROM admin_users");
    if (parseInt(adminCheck.rows[0].count, 10) === 0) {
      if (process.env.ADMIN_PASSWORD) {
        console.log("Seeding admin user from ADMIN_* env vars...");
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await pool.query(
          "INSERT INTO admin_users (username, email, password_hash) VALUES ($1, $2, $3)",
          [
            process.env.ADMIN_USERNAME || seedData.admin.username,
            process.env.ADMIN_EMAIL || seedData.admin.email,
            hashedPassword,
          ]
        );
        console.log("✅ Admin user created.");
      } else {
        console.log("No admin user yet. Create one via the admin page's register form (first account only).");
      }
    }

    // Check if site_profile exists
    const profileCheck = await pool.query("SELECT COUNT(*) FROM site_profile");
    if (parseInt(profileCheck.rows[0].count, 10) === 0) {
      console.log("Seeding site profile...");
      const p = seedData.siteProfile;
      await pool.query(
        `INSERT INTO site_profile (greeting, name, subtitle, subtitle_suffix, description, cv_url, show_robot, show_stars)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [p.greeting, p.name, p.subtitle, p.subtitle_suffix, p.description, p.cv_url, p.show_robot, p.show_stars]
      );
    }

    // Check if about_section exists
    const aboutCheck = await pool.query("SELECT COUNT(*) FROM about_section");
    if (parseInt(aboutCheck.rows[0].count, 10) === 0) {
      console.log("Seeding about section...");
      const a = seedData.about;
      await pool.query(
        `INSERT INTO about_section (title, profile_image, paragraphs, timeline_link_text, contact_button_text)
         VALUES ($1, $2, $3, $4, $5)`,
        [a.title, a.profile_image, JSON.stringify(a.paragraphs), a.timeline_link_text, a.contact_button_text]
      );
    }

    // Check if projects exist
    const projectsCheck = await pool.query("SELECT COUNT(*) FROM projects");
    if (parseInt(projectsCheck.rows[0].count, 10) === 0) {
      console.log("Seeding projects and project files...");
      for (const proj of seedData.projects) {
        const projRes = await pool.query(
          `INSERT INTO projects (category, name, image, github, website, medium, tableau, dataset, tags, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            proj.category || "Software",
            proj.name,
            proj.image || null,
            proj.github || null,
            proj.website || null,
            proj.medium || null,
            proj.tableau || null,
            proj.dataset || null,
            JSON.stringify(proj.tags || []),
            proj.sort_order || 1,
          ]
        );
        const projectId = projRes.rows[0].id;

        if (proj.files && proj.files.length > 0) {
          for (const file of proj.files) {
            await pool.query(
              `INSERT INTO project_files (project_id, name, type, content, language, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                projectId,
                file.name,
                file.type || "info",
                file.content || "",
                file.language || "markdown",
                file.sort_order || 0,
              ]
            );
          }
        }
      }
    }

    // Check if experiences exist
    const expCheck = await pool.query("SELECT COUNT(*) FROM experiences");
    if (parseInt(expCheck.rows[0].count, 10) === 0) {
      console.log("Seeding experience items...");
      for (const exp of seedData.experiences) {
        const title = exp.job_title || exp.role || "Role";
        const descs = exp.descriptions || exp.bullets || [];
        await pool.query(
          `INSERT INTO experiences (company, job_title, duration, descriptions, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [exp.company, title, exp.duration || "Present", JSON.stringify(descs), exp.sort_order || 1]
        );
      }
    }

    // Check if timeline exists
    const timelineCheck = await pool.query("SELECT COUNT(*) FROM timeline_events");
    if (parseInt(timelineCheck.rows[0].count, 10) === 0) {
      console.log("Seeding timeline milestones...");
      for (const t of seedData.timeline) {
        await pool.query(
          `INSERT INTO timeline_events (title, description, year, type, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [t.title, t.description, t.year || t.timeframe || "", t.type || "idea", t.sort_order || 1]
        );
      }
    }

    // Check if tech_stack exists
    const techCheck = await pool.query("SELECT COUNT(*) FROM tech_stack");
    if (parseInt(techCheck.rows[0].count, 10) === 0) {
      console.log("Seeding tech stack tools...");
      for (const tech of seedData.techStack) {
        await pool.query(
          `INSERT INTO tech_stack (name, category, icon_name, color, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [tech.name, tech.category || "General", tech.icon_name, tech.color, tech.sort_order || 1]
        );
      }
    }

    // Check if site_settings exist
    const settingsCheck = await pool.query("SELECT COUNT(*) FROM site_settings");
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      console.log("Seeding site settings...");
      for (const [key, value] of Object.entries(seedData.settings)) {
        await pool.query(
          `INSERT INTO site_settings (setting_key, setting_value)
           VALUES ($1, $2)`,
          [key, JSON.stringify(value)]
        );
      }
    }

    console.log("🎉 Database initialization and seeding complete!");
    console.log("----------------------------------------------------");
    return true;
  } catch (err) {
    console.error("❌ Database initialization error:", err);
    return false;
  }
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  initDatabase(force).then(() => {
    process.exit(0);
  });
}

module.exports = { initDatabase };
