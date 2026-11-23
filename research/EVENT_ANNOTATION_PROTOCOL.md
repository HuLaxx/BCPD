# Independent change-point annotation protocol (PRE-REGISTRATION REQUIRED)

This defines how future ground truth may be collected **before** measuring model accuracy. It contains no invented event dates and is **not** proof that a market event implies a statistical change in returns.

## Separate research targets

**Mean-shift target:** a durable change in expected weekly log returns.  
**Variance-shift target:** a durable change in dispersion of weekly log returns.

These are distinct hypotheses. A news headline, market crash, price maximum, or economic policy announcement is **not automatically** a verified statistical change-point. Financial market series may have gradual shifts, mixed types and uncertain dates. The operational definition must be registered *before* detector alerts are viewed.

## Pre-registration and blindness

- Define each market, time span, source adjustments, UTC week-end convention, minimum duration of sustained change, tolerance in weeks, uncertainty interval, and no-event sampling rule.
- Annotators may use independent original market documents and externally verified market context, but **must not see BOCPD, CUSUM or variance alarm timestamps** while creating labels.
- Require **two independent reviewers** per case, followed by adjudication of disagreements; record reviewer identities or stable pseudonyms, dates, reviewer agreement and the registered rule version.
- Reviewers must annotate **both positive events and no-change intervals**. A file containing only conspicuous crashes cannot support false-positive estimates.
- Preserve source URLs / paper references / document hashes and the raw immutable event-register file under controlled access. Verify the legal and scientific fitness of each source.
- Split into locked historical windows before applying the models. Do not alter labels, thresholds or tolerances based on held-out model errors.

## Data contract

Separate CSV files for *mean* and *variance* labels, each with exactly these required fields (additional registered metadata may be stored in a separate provenance record):

~~~csv
date,source
~~~

Dates must be parseable as ISO 8601, must map to observed Saturday-ending UTC return weeks, and cannot be duplicates within a given event category. Each \`source\` must identify an independently reviewable source, never a detector's own output or a synthetic price shock represented as real market history.

An independent **label manifest** should record:

- \`label_schema\`, \`asset\`, \`target\` (\`mean\` / \`variance\`), \`source_csv_sha256\`;
- \`registered_methodology_version\`, \`registration_timestamp\`, \`label_window_start\`, \`label_window_end\`;
- independent reviewers, concordance and adjudication;
- how "no detectable regime change" weeks were identified and confirmed;
- completeness and unresolved uncertainty, including the proportion of non-annotatable weeks.

Current CLI flags \`--mean-events\` and \`--variance-events\` support **exploratory only** sourced labels. Their output explicitly retains \`model_accuracy_verified: false\`. Do not publish precision, recall, false-positive rates, measured improvements, or "real-time validated" claims until the annotation process, complete coverage, label validity and methodology have been reviewed independently.

## Better alternatives / independent controls

Use simulations with known structural change points to unit-test statistical behavior—but **never** call synthetic inputs historical validation. For actual markets, separately documented regime intervals from licensed and reviewed methods may serve as a comparison, provided they are genuinely independent of the models being evaluated and don't bake in the same algorithm's assumptions.

## Scientific decision gate

Only after two independently sourced (or explicitly scientifically justified) and audited categories exist, and all model settings are frozen, should the project report:

- event precision and recall, event F1, true vs false alarms;
- post-event detection delay (alerts before events do **not** count);
- calibration drift, sensitivity, no-change controls and uncertainty;
- model-vs-matched-baseline changes using the **same** label and observation rules.

Even then, any numerical advantage must be reported with the evaluated population, dates, uncertainty and limitations.
