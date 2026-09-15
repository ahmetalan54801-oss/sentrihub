export default function StatusBadge({ status }) {
  return (
    <span className="badge" style={{ background: `var(--status-${status || "new"})` }}>
      {(status || "new").replace("_", " ")}
    </span>
  );
}
