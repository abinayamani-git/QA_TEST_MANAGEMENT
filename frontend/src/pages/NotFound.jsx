import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="empty-state">
      <h2>Page not found</h2>
      <p>That address is not part of the QA workspace.</p>
      <Link className="button primary" to="/dashboard">
        Back to dashboard
      </Link>
    </section>
  );
}
