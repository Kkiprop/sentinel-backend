export default function StatCard({ label, value, tone = "default", icon = null, meta = "" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-header">
        <p className="stat-label">{label}</p>
        {icon ? <span className="stat-icon">{icon}</span> : null}
      </div>
      <p className="stat-value">{value}</p>
      {meta ? <p className="stat-meta">{meta}</p> : null}
    </article>
  );
}
