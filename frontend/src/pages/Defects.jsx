import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { DEFECT_STATUSES, EMPTY_DEFECT, PRIORITIES, SEVERITIES } from "../constants";
import {
  createDefect,
  deleteDefect,
  getDefects,
  getErrorMessage,
  getProjects,
  projectName,
  updateDefect,
} from "../services/api";

export default function Defects() {
  const [projects, setProjects] = useState([]);
  const [defects, setDefects] = useState([]);
  const [filters, setFilters] = useState({
    project_id: "",
    search: "",
    severity: "",
    priority: "",
    status: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_DEFECT);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      const query = {};
      if (filters.project_id) query.project_id = filters.project_id;
      if (filters.search.trim()) query.search = filters.search.trim();
      if (filters.severity) query.severity = filters.severity;
      if (filters.priority) query.priority = filters.priority;
      if (filters.status) query.status = filters.status;
      getDefects(query)
        .then((data) => {
          setDefects(data);
          setError("");
        })
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters]);

  const openCreate = () => {
    setForm({ ...EMPTY_DEFECT, project_id: filters.project_id || projects[0]?.id || "" });
    setFormError("");
    setModal("create");
  };

  const openEdit = (item) => {
    setForm({
      project_id: item.project_id,
      title: item.title,
      description: item.description,
      severity: item.severity,
      priority: item.priority,
      steps_to_reproduce: item.steps_to_reproduce,
      expected_result: item.expected_result,
      actual_result: item.actual_result,
      status: item.status,
    });
    setFormError("");
    const next = { ...item };
    delete next.view;
    setModal(next);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!String(form.title).trim()) {
      setFormError("Defect title is required.");
      return;
    }
    if (!form.project_id) {
      setFormError("Choose a project before saving the defect.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = { ...form, project_id: Number(form.project_id), title: form.title.trim() };
    try {
      if (modal === "create") await createDefect(payload);
      else await updateDefect(modal.id, payload);
      setModal(null);
      setFilters((current) => ({ ...current }));
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item, status) => {
    setUpdatingId(item.id);
    setError("");
    try {
      await updateDefect(item.id, { status });
      setDefects((current) => current.map((row) => (row.id === item.id ? { ...row, status } : row)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await deleteDefect(pendingDelete.id);
      setPendingDelete(null);
      setFilters((current) => ({ ...current }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <section>
      <div className="page-toolbar">
        <p>Report defects from failed testing and move them through Open, In Progress, Fixed, Retest, Closed, or Reopened.</p>
        <button type="button" className="primary" onClick={openCreate} disabled={projects.length === 0}>
          New defect
        </button>
      </div>
      <div className="filters">
        <label>
          Project
          <select value={filters.project_id} onChange={(event) => setFilters({ ...filters, project_id: event.target.value })}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            aria-label="Search defects"
            value={filters.search}
            placeholder="Title or description"
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </label>
        <label>
          Severity
          <select value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value })}>
            <option value="">All severities</option>
            {SEVERITIES.map((severity) => (
              <option key={severity}>{severity}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {DEFECT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="loading">Loading defects…</p> : null}
      {!loading && projects.length === 0 ? (
        <EmptyState
          title="Create a project first"
          text="Defects are tracked against a project."
          action={
            <Link className="button primary" to="/projects">
              Go to projects
            </Link>
          }
        />
      ) : null}
      {!loading && projects.length > 0 && defects.length === 0 ? (
        <EmptyState title="No defects match" text="Change the filters or report a new defect." />
      ) : null}
      {defects.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {defects.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{projectName(projects, item.project_id)}</td>
                  <td>
                    <StatusBadge value={item.severity} />
                  </td>
                  <td>
                    <StatusBadge value={item.priority} />
                  </td>
                  <td>
                    <select
                      aria-label={`Status for ${item.title}`}
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(event) => changeStatus(item, event.target.value)}
                    >
                      {DEFECT_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="row-actions">
                    <button type="button" onClick={() => setModal({ ...item, view: true })}>
                      View
                    </button>
                    <button type="button" onClick={() => openEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => setPendingDelete(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {modal?.view ? (
        <Modal title={modal.title} onClose={() => setModal(null)} wide>
          <dl className="details">
            <div>
              <dt>Project</dt>
              <dd>{projectName(projects, modal.project_id)}</dd>
            </div>
            <div>
              <dt>Severity</dt>
              <dd>
                <StatusBadge value={modal.severity} />
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <StatusBadge value={modal.priority} />
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge value={modal.status} />
              </dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{modal.description || "—"}</dd>
            </div>
            <div>
              <dt>Steps to reproduce</dt>
              <dd>{modal.steps_to_reproduce || "—"}</dd>
            </div>
            <div>
              <dt>Expected result</dt>
              <dd>{modal.expected_result || "—"}</dd>
            </div>
            <div>
              <dt>Actual result</dt>
              <dd>{modal.actual_result || "—"}</dd>
            </div>
          </dl>
          <div className="form-actions">
            <button type="button" onClick={() => setModal(null)}>
              Close
            </button>
            <button type="button" className="primary" onClick={() => openEdit(modal)}>
              Edit
            </button>
          </div>
        </Modal>
      ) : null}

      {modal && !modal.view ? (
        <Modal title={modal === "create" ? "New defect" : "Edit defect"} onClose={() => !saving && setModal(null)} wide>
          <form onSubmit={save} className="form">
            {formError ? (
              <div className="alert" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="form-grid">
              <label>
                Project
                <select value={form.project_id} onChange={(event) => updateField("project_id", event.target.value)} required>
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Severity
                <select value={form.severity} onChange={(event) => updateField("severity", event.target.value)}>
                  {SEVERITIES.map((severity) => (
                    <option key={severity}>{severity}</option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
                  {PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                  {DEFECT_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Title
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} maxLength={200} required autoFocus />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={3} />
            </label>
            <label>
              Steps to reproduce
              <textarea
                value={form.steps_to_reproduce}
                onChange={(event) => updateField("steps_to_reproduce", event.target.value)}
                rows={4}
              />
            </label>
            <label>
              Expected result
              <textarea value={form.expected_result} onChange={(event) => updateField("expected_result", event.target.value)} rows={3} />
            </label>
            <label>
              Actual result
              <textarea value={form.actual_result} onChange={(event) => updateField("actual_result", event.target.value)} rows={3} />
            </label>
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save defect"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal title="Delete defect" onClose={() => !saving && setPendingDelete(null)}>
          <p>
            Delete <strong>{pendingDelete.title}</strong>?
          </p>
          <div className="form-actions">
            <button type="button" onClick={() => setPendingDelete(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="danger" onClick={confirmDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete defect"}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
