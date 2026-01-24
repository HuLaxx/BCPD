export default function DemoPage() {
  return (
    <section className="grid-2">
      <div className="panel">
        <h3>Demo Experience</h3>
        <p>
          The demo walks through end-to-end workflows: intake, validation,
          scoring, and insights. Each step is visible and easy to narrate.
        </p>
        <ul className="list">
          <li>Guided story with live system highlights.</li>
          <li>Interactive dashboard for stakeholder questions.</li>
          <li>Exportable reports for post-demo follow-ups.</li>
        </ul>
      </div>
      <div className="panel">
        <h3>Demo Script</h3>
        <p>
          <strong>1.</strong> Introduce the mission and show the live intake queue.
        </p>
        <p>
          <strong>2.</strong> Highlight automated checks and the audit trail view.
        </p>
        <p>
          <strong>3.</strong> Open dashboards and explain the KPI refresh cadence.
        </p>
        <p>
          <strong>4.</strong> Close with the roadmap and next-phase timeline.
        </p>
      </div>
    </section>
  );
}
