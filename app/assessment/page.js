const scoring = [
  {
    title: 'Clarity & Structure',
    weight: '20%',
    details:
      'Is the module easy to follow with a clear objective, flow, and next steps?'
  },
  {
    title: 'Accuracy & Evidence',
    weight: '20%',
    details:
      'Are facts sourced, current, and free of unsupported claims or bias?'
  },
  {
    title: 'Actionability',
    weight: '15%',
    details:
      'Does the content provide concrete actions, owners, and timelines?'
  },
  {
    title: 'User Impact',
    weight: '15%',
    details:
      'Does it speak to stakeholder needs, risks, and measurable outcomes?'
  },
  {
    title: 'Consistency & Tone',
    weight: '10%',
    details:
      'Is the messaging aligned with our mission and written in a neutral tone?'
  },
  {
    title: 'Design & Accessibility',
    weight: '10%',
    details:
      'Are visuals legible, accessible, and supporting the message?'
  },
  {
    title: 'Innovation & Improvement',
    weight: '10%',
    details:
      'Does it introduce meaningful improvements or measurable efficiency gains?'
  }
];

const ratingScale = [
  {
    score: '5',
    label: 'Exceptional',
    description: 'Best-in-class, no gaps, ready for executive delivery.'
  },
  {
    score: '4',
    label: 'Strong',
    description: 'Minor refinements needed, clear value delivered.'
  },
  {
    score: '3',
    label: 'Needs Improvement',
    description: 'Meets baseline but has gaps that impact clarity or trust.'
  },
  {
    score: '2',
    label: 'Weak',
    description: 'Missing key details, inconsistent, or hard to follow.'
  },
  {
    score: '1',
    label: 'Unacceptable',
    description: 'Inaccurate, biased, or unclear; must be rebuilt.'
  }
];

export default function AssessmentPage() {
  return (
    <section className="stack">
      <div className="panel">
        <h3>Rigorous Grading for Mail Modules</h3>
        <p>
          Use this rubric to apply an honest, non-biased, and strict rating for
          every mail module. Each module should be scored on the weighted
          criteria below, then averaged for a final grade.
        </p>
        <div className="score-highlight">
          <div>
            <p className="eyebrow">Goal</p>
            <h4>Unbiased, evidence-led scoring</h4>
          </div>
          <span className="pill">0-5 scale</span>
        </div>
      </div>

      <div className="panel">
        <h3>Weighted Criteria</h3>
        <div className="rubric-grid">
          {scoring.map((item) => (
            <div key={item.title} className="rubric-card">
              <div className="rubric-header">
                <h4>{item.title}</h4>
                <span className="pill">{item.weight}</span>
              </div>
              <p>{item.details}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Rating Scale</h3>
        <div className="scale-grid">
          {ratingScale.map((item) => (
            <div key={item.score} className="scale-card">
              <span className="score">{item.score}</span>
              <div>
                <h4>{item.label}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>How to Apply</h3>
        <ul className="list">
          <li>Score each criterion independently using the 1-5 scale.</li>
          <li>Multiply by weight and sum for a final grade out of 5.</li>
          <li>Capture evidence for every score to prevent bias.</li>
          <li>List remediation actions for any area below 4.</li>
        </ul>
      </div>
    </section>
  );
}
