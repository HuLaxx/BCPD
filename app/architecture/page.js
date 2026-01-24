export default function ArchitecturePage() {
  return (
    <section className="grid-2">
      <div className="panel">
        <h3>Architecture Overview</h3>
        <p>
          The BCPD platform is organized around a resilient core. Data enters
          through secure ingestion, flows into a validated lakehouse, and then
          powers services through an API gateway.
        </p>
        <ul className="list">
          <li>Ingestion & validation layer with policy checks.</li>
          <li>Lakehouse storage for structured + unstructured data.</li>
          <li>Service mesh for orchestration and observability.</li>
        </ul>
      </div>
      <div className="panel">
        <h3>Key Architecture Decisions</h3>
        <div className="timeline">
          <div className="timeline-item">
            <strong>Capsule Core:</strong> isolates critical workflows and makes
            deployment upgrades safe.
          </div>
          <div className="timeline-item">
            <strong>Composable APIs:</strong> each team can ship without waiting on
            central releases.
          </div>
          <div className="timeline-item">
            <strong>Zero-trust perimeter:</strong> identity, audit, and encryption
            at every hop.
          </div>
        </div>
      </div>
    </section>
  );
}
