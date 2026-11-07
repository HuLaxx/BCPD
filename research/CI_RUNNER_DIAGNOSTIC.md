# GitHub Actions release blocker — run fails before job execution

Observed on the draft research PR at 2026-11-07/08 UTC:

- Python research workflow and Next.js quality workflow both report \`failure\` after just seconds.
- GitHub's workflow-run job metadata shows \`steps: []\` and an empty \`runner_name\`. There is no Python test output or Next.js compiler output.
- GitHub job log download was unavailable from the connected tool (404 blob-not-found).
- That symptom is consistent with a **pre-execution scheduling or GitHub account/workflow infrastructure issue**. The available evidence is insufficient to prove a specific cause.

## Owner-side investigation, in order

1. In GitHub open **HuLaxx/BCPD → Actions → failed run**, expand the run's checks and inspect any banner or annotation explaining why GitHub could not schedule a runner.
2. Check **Settings → Actions → General**: workflow permissions, whether GitHub-hosted Actions are allowed, and repository/org policy restrictions.
3. Review organization/account **billing, usage limits and spending caps** for GitHub Actions; failures before runner allocation can be caused by resource eligibility.
4. Check GitHub's service status for the timestamp of the run if multiple repositories have similar pre-execution failures.
5. After account eligibility is restored, use **Re-run jobs**. The repository's Python tests require Python 3.11, use no third-party packages, and should produce visible step logs.

## Local release gate, independent of GitHub availability

From the repository root, with Python 3.11+:

~~~bash
python -m unittest discover -s research/tests -v
python -m research.stress_test --seeds 3 --out artifacts/synthetic-stress.json
~~~

Run the Next.js quality checks separately with Node.js 22 and access to npm:

~~~bash
npm install --no-audit --no-fund
npm run verify
~~~

**No claim of passing CI, ready-to-merge status or end-to-end production readiness should be made until those commands pass and the pull-request checks are green.** Never disable a failing check merely to obtain a green badge.
