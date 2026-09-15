export default function SeverityBadge({ severity }) {
  return (
    <span className="badge" style={{ background: `var(--sev-${severity || "info"})` }}>
      {severity || "info"}
    </span>
  );
}
