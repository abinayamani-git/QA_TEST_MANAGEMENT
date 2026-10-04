import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { EMPTY_TEST_CASE, PRIORITIES, TEST_STATUSES } from "../constants";
import {
  createTestCase,
  deleteTestCase,
  getErrorMessage,
  getProjects,
  getTestCases,
  projectName,
  updateTestCase,
} from "../services/api";

export default function TestCases() {
  const [params] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [cases, setCases] = useState([]);
  const [filters, setFilters] = useState({
    project_id: params.get("project") || "",
    search: "",
    status: "",
    priority: "",
    module: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_TEST_CASE);
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
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.module.trim()) query.module = filters.module.trim();
      getTestCases(query)
        .then((data) => {
          setCases(data);
          setError("");
        })
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters]);

  const openCreate = () => {
    setForm({ ...EMPTY_TEST_CASE, project_id: filters.project_id || projects[0]?.id || "" });
    setFormError("");
    setModal("create");
  };

  const openEdit = (item) => {
    setForm({
      project_id: item.project_id,
      title: item.title,
      module: item.module,
      priority: item.priority,
      preconditions: item.preconditions,
      test_steps: item.test_steps,
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
      setFormError("Test case title is required.");
      return;
    }
    if (!form.project_id) {
      setFormError("Choose a project before saving the test case.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      project_id: Number(form.project_id),
      title: form.title.trim(),
    };
    try {
      if (modal === "create") await createTestCase(payload);
      else await updateTestCase(modal.id, payload);
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
      await updateTestCase(item.id, { status });
      setCases((current) => current.map((row) => (row.id === item.id ? { ...row, status } : row)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await deleteTestCase(pendingDelete.id);
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
        <p>Write test cases, execute them, and record Pass, Fail, Blocked, or Not Run.</p>
        <button type="button" className="primary" onClick={openCreate} disabled={projects.length === 0}>
          New test case
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
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Title, module, or steps"
            aria-label="Search test cases"
          />
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {TEST_STATUSES.map((status) => (
              <option key={status}>{status}</option>
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
          Module
          <input
            value={filters.module}
            onChange={(event) => setFilters({ ...filters, module: event.target.value })}
            placeholder="Authentication"
          />
        </label>
      </div>
      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="loading">Loading test cases…</p> : null}
      {!loading && projects.length === 0 ? (
        <EmptyState
          title="Create a project first"
          text="Test cases belong to a project."
          action={
            <Link className="button primary" to="/projects">
              Go to projects
            </Link>
          }
        />
      ) : null}
      {!loading && projects.length > 0 && cases.length === 0 ? (
        <EmptyState title="No test cases match" text="Change the filters or create a new test case." />
      ) : null}
      {cases.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Module</th>
                <th>Priority</th>
                <th>Execution status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{projectName(projects, item.project_id)}</td>
                  <td>{item.module || "—"}</td>
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
                      {TEST_STATUSES.map((status) => (
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
              <dt>Module</dt>
              <dd>{modal.module || "—"}</dd>
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
              <dt>Preconditions</dt>
              <dd>{modal.preconditions || "—"}</dd>
            </div>
            <div>
              <dt>Test steps</dt>
              <dd>{modal.test_steps || "—"}</dd>
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
        <Modal title={modal === "create" ? "New test case" : "Edit test case"} onClose={() => !saving && setModal(null)} wide>
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
                  {TEST_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                Module
                <input value={form.module} onChange={(event) => updateField("module", event.target.value)} maxLength={120} />
              </label>
            </div>
            <label>
              Title
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} maxLength={200} required autoFocus />
            </label>
            <label>
              Preconditions
              <textarea value={form.preconditions} onChange={(event) => updateField("preconditions", event.target.value)} rows={3} />
            </label>
            <label>
              Test steps
              <textarea value={form.test_steps} onChange={(event) => updateField("test_steps", event.target.value)} rows={4} />
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
                {saving ? "Saving…" : "Save test case"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal title="Delete test case" onClose={() => !saving && setPendingDelete(null)}>
          <p>
            Delete <strong>{pendingDelete.title}</strong>?
          </p>
          <div className="form-actions">
            <button type="button" onClick={() => setPendingDelete(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="danger" onClick={confirmDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete test case"}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
