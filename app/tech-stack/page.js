export default function TechStackPage() {
  return (
    <section className="grid-2">
      <div className="panel">
        <h3>Core Technologies</h3>
        <p>
          We selected a stack that is secure, scalable, and aligned with the team
          skills already in place.
        </p>
        <ul className="list">
          <li>Next.js UI shell for fast, accessible experiences.</li>
          <li>Event-driven services with secure API gateways.</li>
          <li>Lakehouse analytics with automated cataloging.</li>
        </ul>
      </div>
      <div className="panel">
        <h3>Platform Tooling</h3>
        <div className="tags">
          <span className="tag">TypeScript</span>
          <span className="tag">Node.js</span>
          <span className="tag">PostgreSQL</span>
          <span className="tag">Kafka</span>
          <span className="tag">Terraform</span>
          <span className="tag">Observability</span>
        </div>
        <p>
          The delivery toolchain ensures automated testing, rapid deployments,
          and continuous monitoring.
        </p>
      </div>
    </section>
  );
}
