import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { createProject, deleteProject, formatDate, getErrorMessage, getProjects, updateProject } from "../services/api";

const EMPTY_FORM = { name: "", description: "" };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = () => {
    setLoading(true);
    getProjects()
      .then((data) => {
        setProjects(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal("create");
  };

  const openEdit = (project) => {
    setForm({ name: project.name, description: project.description });
    setFormError("");
    setModal(project);
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const save = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError("Project name is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = { name, description: form.description.trim() };
      if (modal === "create") {
        await createProject(payload);
      } else {
        await updateProject(modal.id, payload);
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError("");
    try {
      await deleteProject(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="page-toolbar">
        <p>Create a project, then add test cases and defects inside it.</p>
        <button type="button" className="primary" onClick={openCreate}>
          New project
        </button>
      </div>
      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="loading">Loading projects…</p> : null}
      {!loading && projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          text="Start with one product or release. Sample data appears automatically the first time the backend starts with an empty database."
          action={
            <button type="button" className="primary" onClick={openCreate}>
              Create the first project
            </button>
          }
        />
      ) : null}
      <div className="card-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <h2>{project.name}</h2>
            <p>{project.description || "No description"}</p>
            <p className="meta">Created {formatDate(project.created_at)}</p>
            <div className="row-actions">
              <Link className="button" to={`/test-cases?project=${project.id}`}>
                Open
              </Link>
              <button type="button" onClick={() => openEdit(project)}>
                Edit
              </button>
              <button type="button" className="danger" onClick={() => setPendingDelete(project)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {modal ? (
        <Modal title={modal === "create" ? "New project" : "Edit project"} onClose={closeModal}>
          <form onSubmit={save} className="form">
            {formError ? (
              <div className="alert" role="alert">
                {formError}
              </div>
            ) : null}
            <label htmlFor="project-name">
              Name
              <input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={200}
                required
                autoFocus
              />
            </label>
            <label htmlFor="project-description">
              Description
              <textarea
                id="project-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={4}
                maxLength={5000}
              />
            </label>
            <div className="form-actions">
              <button type="button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save project"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal title="Delete project" onClose={() => !saving && setPendingDelete(null)}>
          <p>
            Delete <strong>{pendingDelete.name}</strong>? Its test cases and defects will also be removed.
          </p>
          <div className="form-actions">
            <button type="button" onClick={() => setPendingDelete(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="danger" onClick={confirmDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete project"}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
