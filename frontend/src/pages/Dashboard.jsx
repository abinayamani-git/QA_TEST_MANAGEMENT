import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressList from "../components/ProgressList";
import StatCard from "../components/StatCard";
import { getDashboard, getErrorMessage } from "../services/api";

const EMPTY = {
  total_projects: 0,
  total_test_cases: 0,
  passed_test_cases: 0,
  failed_test_cases: 0,
  blocked_test_cases: 0,
  not_run_test_cases: 0,
  open_defects: 0,
  critical_defects: 0,
  closed_defects: 0,
  total_defects: 0,
};

export default function Dashboard() {
  const [stats, setStats] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    ["Total Projects", stats.total_projects, "Active QA projects"],
    ["Total Test Cases", stats.total_test_cases, "Across every project"],
    ["Passed Test Cases", stats.passed_test_cases, "Execution status: Pass"],
    ["Failed Test Cases", stats.failed_test_cases, "Needs a defect or fix"],
    ["Blocked Test Cases", stats.blocked_test_cases, "Cannot be executed"],
    ["Open Defects", stats.open_defects, "Status: Open"],
    ["Critical Defects", stats.critical_defects, "Severity: Critical"],
    ["Closed Defects", stats.closed_defects, "Status: Closed"],
  ];

  return (
    <section>
      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="loading">Loading dashboard…</p> : null}
      <div className="stat-grid">
        {cards.map(([label, value, hint]) => (
          <StatCard key={label} label={label} value={loading ? "—" : value} hint={hint} />
        ))}
      </div>
      <div className="split">
        <article className="panel">
          <div className="panel-heading">
            <h2>Test execution</h2>
            <Link to="/test-cases">Open test cases</Link>
          </div>
          <ProgressList
            total={stats.total_test_cases}
            items={[
              { label: "Pass", value: stats.passed_test_cases, tone: "pass" },
              { label: "Fail", value: stats.failed_test_cases, tone: "fail" },
              { label: "Blocked", value: stats.blocked_test_cases, tone: "blocked" },
              { label: "Not Run", value: stats.not_run_test_cases, tone: "pending" },
            ]}
          />
        </article>
        <article className="panel">
          <div className="panel-heading">
            <h2>Defect snapshot</h2>
            <Link to="/defects">Open defects</Link>
          </div>
          <ProgressList
            total={stats.total_defects}
            items={[
              { label: "Open", value: stats.open_defects, tone: "fail" },
              { label: "Critical severity", value: stats.critical_defects, tone: "blocked" },
              { label: "Closed", value: stats.closed_defects, tone: "pass" },
            ]}
          />
        </article>
      </div>
    </section>
  );
}
