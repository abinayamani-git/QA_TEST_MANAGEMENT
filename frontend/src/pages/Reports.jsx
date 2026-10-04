import { useEffect, useState } from "react";
import ProgressList from "../components/ProgressList";
import StatCard from "../components/StatCard";
import { DEFECT_STATUSES, SEVERITIES } from "../constants";
import { downloadCsv, getErrorMessage, getProjects, getReports } from "../services/api";

const EMPTY = {
  total_test_cases: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  not_run: 0,
  pass_percentage: 0,
  fail_percentage: 0,
  blocked_percentage: 0,
  not_run_percentage: 0,
  total_defects: 0,
  defect_summary: {},
  severity_summary: {},
};

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [report, setReport] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = projectId ? { project_id: projectId } : undefined;
    getReports(params)
      .then((data) => {
        setReport(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [projectId]);

  const exportFile = async (kind) => {
    setExporting(kind);
    setError("");
    try {
      const params = projectId ? { project_id: projectId } : undefined;
      if (kind === "cases") {
        await downloadCsv("/api/reports/export/test-cases", "test-cases.csv", params);
      } else {
        await downloadCsv("/api/reports/export/defects", "defects.csv", params);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting("");
    }
  };

  return (
    <section>
      <div className="page-toolbar">
        <label>
          Project
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Report project">
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row-actions">
          <button type="button" className="primary" onClick={() => exportFile("cases")} disabled={exporting !== ""}>
            {exporting === "cases" ? "Exporting…" : "Export test cases CSV"}
          </button>
          <button type="button" onClick={() => exportFile("defects")} disabled={exporting !== ""}>
            {exporting === "defects" ? "Exporting…" : "Export defects CSV"}
          </button>
        </div>
      </div>
      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="loading">Loading report…</p> : null}
      <div className="stat-grid">
        <StatCard label="Pass percentage" value={`${report.pass_percentage}%`} hint={`${report.passed} passed`} />
        <StatCard label="Fail percentage" value={`${report.fail_percentage}%`} hint={`${report.failed} failed`} />
        <StatCard label="Blocked percentage" value={`${report.blocked_percentage}%`} hint={`${report.blocked} blocked`} />
        <StatCard label="Not run percentage" value={`${report.not_run_percentage}%`} hint={`${report.not_run} not run`} />
      </div>
      <div className="split">
        <article className="panel">
          <div className="panel-heading">
            <h2>Test execution summary</h2>
          </div>
          <ProgressList
            total={report.total_test_cases}
            items={[
              { label: "Pass", value: report.passed, tone: "pass" },
              { label: "Fail", value: report.failed, tone: "fail" },
              { label: "Blocked", value: report.blocked, tone: "blocked" },
              { label: "Not Run", value: report.not_run, tone: "pending" },
            ]}
          />
        </article>
        <article className="panel">
          <div className="panel-heading">
            <h2>Defect summary</h2>
          </div>
          <ProgressList
            total={report.total_defects}
            items={DEFECT_STATUSES.map((status) => ({
              label: status,
              value: report.defect_summary?.[status] || 0,
              tone: status === "Closed" ? "pass" : status === "Open" || status === "Reopened" ? "fail" : "blocked",
            }))}
          />
        </article>
        <article className="panel">
          <div className="panel-heading">
            <h2>Severity summary</h2>
          </div>
          <ProgressList
            total={report.total_defects}
            items={SEVERITIES.map((severity) => ({
              label: severity,
              value: report.severity_summary?.[severity] || 0,
              tone: severity === "Minor" ? "pass" : severity === "Major" ? "blocked" : "fail",
            }))}
          />
        </article>
      </div>
    </section>
  );
}
