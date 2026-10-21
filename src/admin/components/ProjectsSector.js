import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { usePortfolio } from "../../context/PortfolioContext";
import {
  VscAdd,
  VscEdit,
  VscTrash,
  VscCloudUpload,
  VscSave,
  VscClose,
  VscFileCode,
} from "react-icons/vsc";

export default function ProjectsSector() {
  const { refreshPortfolio } = usePortfolio();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [alert, setAlert] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State for Create/Edit Modal
  const [formState, setFormState] = useState({
    category: "Software",
    name: "",
    image: "",
    github: "",
    website: "",
    medium: "",
    tableau: "",
    dataset: "",
    tags: [],
    sort_order: 1,
    files: [{ name: "README.md", type: "info", content: "", language: "markdown", sort_order: 1 }],
  });

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.getProjects();
      if (res && res.success) {
        setProjects(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormState({
      category: activeCategory === "All" ? "Software" : activeCategory,
      name: "",
      image: "",
      github: "",
      website: "",
      medium: "",
      tableau: "",
      dataset: "",
      tags: [],
      sort_order: projects.length + 1,
      files: [
        {
          name: "README.md",
          type: "info",
          content: "Project description and overview...",
          language: "markdown",
          sort_order: 1,
        },
      ],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    let tags = project.tags;
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        tags = [];
      }
    }
    setFormState({
      category: project.category || "Software",
      name: project.name || "",
      image: project.image || "",
      github: project.github || "",
      website: project.website || "",
      medium: project.medium || "",
      tableau: project.tableau || "",
      dataset: project.dataset || "",
      tags: tags || [],
      sort_order: project.sort_order || 1,
      files:
        project.files && project.files.length > 0
          ? project.files
          : [{ name: "README.md", type: "info", content: "", language: "markdown", sort_order: 1 }],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) return;
    try {
      await api.deleteProject(id);
      setAlert({ type: "success", text: `Deleted project "${name}"` });
      loadProjects();
      refreshPortfolio();
    } catch (err) {
      alert("Failed to delete project: " + err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await api.uploadFile(file);
      if (res && res.success) {
        setFormState((prev) => ({ ...prev, image: res.url }));
        setAlert({ type: "success", text: "Thumbnail uploaded successfully!" });
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      const val = e.target.value.trim();
      if (!formState.tags.includes(val)) {
        setFormState((prev) => ({ ...prev, tags: [...prev.tags, val] }));
      }
      e.target.value = "";
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormState((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleAddFile = () => {
    setFormState((prev) => ({
      ...prev,
      files: [
        ...prev.files,
        {
          name: "new_file.md",
          type: "info",
          content: "",
          language: "markdown",
          sort_order: prev.files.length + 1,
        },
      ],
    }));
  };

  const handleUpdateFile = (index, field, value) => {
    const updated = [...formState.files];
    updated[index] = { ...updated[index], [field]: value };
    setFormState((prev) => ({ ...prev, files: updated }));
  };

  const handleRemoveFile = (index) => {
    setFormState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, formState);
        setAlert({ type: "success", text: `Updated "${formState.name}"` });
      } else {
        await api.createProject(formState);
        setAlert({ type: "success", text: `Created new project "${formState.name}"` });
      }
      setIsModalOpen(false);
      loadProjects();
      refreshPortfolio();
    } catch (err) {
      alert("Failed to save project: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const defaultCategories = ["Software", "Research", "Hardware"];
  const existingCategories = Array.from(new Set(projects.map((p) => p.category).filter(Boolean)));
  const allCategoriesList = Array.from(new Set([...defaultCategories, ...existingCategories]));
  const categories = ["All", ...allCategoriesList];

  const filteredProjects =
    activeCategory === "All"
      ? projects
      : projects.filter(
          (p) => (p.category || "Software").toLowerCase() === activeCategory.toLowerCase()
        );

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h3 className="admin-card-title">Projects & Interactive Code Viewer Sector</h3>
          <div className="admin-card-subtitle">
            Manage Software, Research and Hardware projects, attached code files, and notebooks.
          </div>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreateModal}>
          <VscAdd /> Add New Project
        </button>
      </div>

      {alert && (
        <div className={`admin-alert admin-alert-${alert.type}`}>
          <span>{alert.text}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: "none", border: "none", color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`admin-btn ${
              activeCategory === cat ? "admin-btn-primary" : "admin-btn-secondary"
            } admin-btn-sm`}
          >
            {cat} (
            {cat === "All"
              ? projects.length
              : projects.filter(
                  (p) => (p.category || "").toLowerCase() === cat.toLowerCase()
                ).length}
            )
          </button>
        ))}
      </div>

      {/* Projects Table */}
      {loading ? (
        <div style={{ padding: 20, color: "#8b949e" }}>Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "#8b949e" }}>
          No projects found in category "{activeCategory}". Click "Add New Project" to create one.
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Img</th>
                <th>Name</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Attached Files</th>
                <th>Links</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 6,
                          background: "#1e2638",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#8b949e",
                        }}
                      >
                        <VscFileCode />
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#8b949e" }}>
                      Order: #{p.sort_order}
                    </div>
                  </td>
                  <td>
                    <span
                      className="admin-tag"
                      style={{ background: "rgba(88, 166, 255, 0.15)", color: "#58a6ff" }}
                    >
                      {p.category || "Software"}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: 200 }}>
                      {(Array.isArray(p.tags) ? p.tags : []).slice(0, 3).map((tag, i) => (
                        <span key={i} className="admin-tag">
                          {tag}
                        </span>
                      ))}
                      {(p.tags || []).length > 3 && (
                        <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>
                          +{p.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem", color: "#c9d1d9" }}>
                      {(p.files || []).length} files:{" "}
                      <span style={{ color: "#64d98a" }}>
                        {(p.files || []).map((f) => f.name).join(", ")}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, fontSize: "0.82rem", flexWrap: "wrap" }}>
                      {p.github && (
                        <a
                          href={p.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#58a6ff" }}
                        >
                          GitHub
                        </a>
                      )}
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#64d98a" }}
                        >
                          Live Site
                        </a>
                      )}
                      {p.medium && (
                        <a
                          href={p.medium}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#f0883e" }}
                        >
                          Article
                        </a>
                      )}
                      {p.tableau && (
                        <a
                          href={p.tableau}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#e3b341" }}
                        >
                          Tableau
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => openEditModal(p)}
                        title="Edit Project"
                      >
                        <VscEdit /> Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => handleDelete(p.id, p.name)}
                        title="Delete Project"
                      >
                        <VscTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Create/Edit Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal" style={{ maxWidth: 750 }}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#fff" }}>
                {editingProject ? `Edit Project: ${editingProject.name}` : "Add New Project"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8b949e",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                <VscClose />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="admin-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Category</label>
                    <select
                      className="admin-select"
                      value={formState.category}
                      onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    >
                      {allCategoriesList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Sort Order</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={formState.sort_order}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          sort_order: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Project Title</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="Project Title"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Project Thumbnail Image URL or Upload</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="text"
                      className="admin-input"
                      value={formState.image}
                      onChange={(e) => setFormState({ ...formState, image: e.target.value })}
                      placeholder="/assets/uiu_robotics.png or https://..."
                    />
                    <label
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      <VscCloudUpload /> {uploading ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="admin-form-group">
                    <label className="admin-label">GitHub Repository Link</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={formState.github}
                      onChange={(e) => setFormState({ ...formState, github: e.target.value })}
                      placeholder="https://github.com/..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Live Website / Demo Link</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={formState.website}
                      onChange={(e) => setFormState({ ...formState, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Medium Article Link</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={formState.medium}
                      onChange={(e) => setFormState({ ...formState, medium: e.target.value })}
                      placeholder="https://medium.com/..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Tableau Dashboard Link</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={formState.tableau}
                      onChange={(e) => setFormState({ ...formState, tableau: e.target.value })}
                      placeholder="https://public.tableau.com/..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Dataset Link</label>
                    <input
                      type="url"
                      className="admin-input"
                      value={formState.dataset}
                      onChange={(e) => setFormState({ ...formState, dataset: e.target.value })}
                      placeholder="https://kaggle.com/..."
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Tags / Technologies (Press Enter to add)</label>
                  <div className="admin-tags-input-container">
                    {formState.tags.map((tag, i) => (
                      <span key={i} className="admin-tag-editable">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>
                          ✕
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="admin-tag-inner-input"
                      placeholder="Add tag and press Enter..."
                      onKeyDown={handleAddTag}
                    />
                  </div>
                </div>

                {/* Attached Code / Info Files */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>
                        Attached Files & Code Tabs ({formState.files.length})
                      </h4>
                      <div style={{ fontSize: "0.78rem", color: "#8b949e" }}>
                        Files render as interactive sidebar tabs in the code viewer.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={handleAddFile}
                    >
                      <VscAdd /> Add File
                    </button>
                  </div>

                  {formState.files.map((file, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        background: "#0d1117",
                        border: "1px solid #30363d",
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "#8b949e", display: "block" }}>
                            Filename
                          </label>
                          <input
                            type="text"
                            className="admin-input"
                            style={{ padding: "6px 10px" }}
                            value={file.name}
                            onChange={(e) => handleUpdateFile(fIdx, "name", e.target.value)}
                            placeholder="README.md / query.sql / model.ipynb"
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "#8b949e", display: "block" }}>
                            Type
                          </label>
                          <select
                            className="admin-select"
                            style={{ padding: "6px 10px" }}
                            value={file.type}
                            onChange={(e) => handleUpdateFile(fIdx, "type", e.target.value)}
                          >
                            <option value="info">Info / Overview</option>
                            <option value="code">Code Snippet</option>
                            <option value="notebook">Notebook / Iframe Link</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", color: "#8b949e", display: "block" }}>
                            Language
                          </label>
                          <input
                            type="text"
                            className="admin-input"
                            style={{ padding: "6px 10px" }}
                            value={file.language || "markdown"}
                            onChange={(e) => handleUpdateFile(fIdx, "language", e.target.value)}
                            placeholder="markdown / sql / python / js"
                          />
                        </div>
                        <div style={{ alignSelf: "flex-end" }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => handleRemoveFile(fIdx)}
                            title="Remove File"
                            disabled={formState.files.length === 1}
                          >
                            <VscTrash />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.75rem", color: "#8b949e", display: "block" }}>
                          {file.type === "notebook"
                            ? "Iframe / NBViewer URL"
                            : "File Content / Markdown Description / SQL Query"}
                        </label>
                        <textarea
                          className="admin-textarea"
                          rows={file.type === "code" ? 6 : 3}
                          value={file.content || ""}
                          onChange={(e) => handleUpdateFile(fIdx, "content", e.target.value)}
                          placeholder={
                            file.type === "notebook"
                              ? "https://nbviewer.org/..."
                              : file.type === "code"
                              ? "SELECT * FROM dataset..."
                              : "Project overview and description..."
                          }
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={saving}
                >
                  <VscSave /> {saving ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
