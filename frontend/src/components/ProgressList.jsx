export default function ProgressList({ items, total }) {
  return (
    <div className="progress-list">
      {items.map((item) => {
        const percent = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <div className="bar-row" key={item.label}>
            <div className="bar-label">
              <span>{item.label}</span>
              <span>
                {item.value} ({percent}%)
              </span>
            </div>
            <div
              className="bar-track"
              role="meter"
              aria-label={item.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={`bar-fill tone-${item.tone}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
