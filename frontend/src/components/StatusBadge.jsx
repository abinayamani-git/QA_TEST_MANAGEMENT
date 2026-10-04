export default function StatusBadge({ value }) {
  const tone = String(value || "unknown")
    .toLowerCase()
    .replace(/\s+/g, "-");
  return <span className={`badge badge-${tone}`}>{value}</span>;
}
