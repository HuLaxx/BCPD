export default function DataPage() {
  return (
    <section className="grid-2">
      <div className="panel">
        <h3>Data Flow</h3>
        <p>
          Data arrives from multiple partners and internal systems. Each stream
          is normalized, tagged, and enriched before landing in the lakehouse.
        </p>
        <ul className="list">
          <li>Automated schema detection and validation.</li>
          <li>PII handling with tokenization policies.</li>
          <li>Data quality scoring for every dataset.</li>
        </ul>
      </div>
      <div className="panel">
        <h3>Data Products</h3>
        <div className="timeline">
          <div className="timeline-item">
            <strong>Mission Readiness:</strong> curated readiness metrics and
            alerts.
          </div>
          <div className="timeline-item">
            <strong>Operational Insights:</strong> real-time workload monitoring
            and anomaly detection.
          </div>
          <div className="timeline-item">
            <strong>Executive Dashboards:</strong> summarized KPIs for leaders.
          </div>
        </div>
      </div>
    </section>
  );
}
