export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-card">
          <h2>Welcome to the BCPD Capsule</h2>
          <p>
            This is the best build of our platform so far. It highlights the
            introduction, roadmap, and the improvements that keep our delivery
            resilient, auditable, and easy to scale.
          </p>
        </div>
        <div className="hero-card">
          <h2>Project Introduction</h2>
          <p>
            BCPD modernizes mission-critical workflows by unifying data, automating
            decisioning, and providing a frictionless demo path for stakeholders.
          </p>
        </div>
        <div className="hero-card">
          <h2>All the Improvements</h2>
          <ul className="list">
            <li>Unified data intake and validation in one place.</li>
            <li>Automated compliance checks and audit trails.</li>
            <li>Real-time dashboards with actionable insights.</li>
            <li>Scaled infrastructure ready for next phases.</li>
          </ul>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h3>What we are building</h3>
          <p>
            A secure platform with clear handoffs between data ingestion, risk
            services, and user-facing applications. The architecture is designed
            for reliability and rapid iteration.
          </p>
          <div className="tags">
            <span className="tag">Modular</span>
            <span className="tag">Secure-by-design</span>
            <span className="tag">AI-ready</span>
            <span className="tag">Fast delivery</span>
          </div>
        </div>
        <div className="panel">
          <h3>Roadmap</h3>
          <div className="timeline">
            <div className="timeline-item">
              <strong>Phase 1:</strong> Core ingestion + governance complete.
            </div>
            <div className="timeline-item">
              <strong>Phase 2:</strong> Agent workflow automation in progress.
            </div>
            <div className="timeline-item">
              <strong>Phase 3:</strong> Advanced analytics + external APIs.
            </div>
          </div>
        </div>
        <div className="panel">
          <h3>Rigorous Mail Module Grading</h3>
          <p>
            Every mail module is reviewed with a strict, unbiased rubric that
            scores clarity, accuracy, actionability, and user impact. This keeps
            improvements grounded in evidence and makes quality measurable.
          </p>
          <div className="tags">
            <span className="tag">Honest scoring</span>
            <span className="tag">Bias checks</span>
            <span className="tag">Clear remediation</span>
          </div>
        </div>
      </section>
    </>
  );
}
