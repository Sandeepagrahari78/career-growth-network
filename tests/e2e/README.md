# End-to-end tests

The pipeline already has an executable end-to-end smoke against the current
health-demo deployment artifact:

```bash
BASE_URL=http://127.0.0.1:3001 node tests/e2e/health-demo.e2e.mjs
```

It verifies `/health`, `/ready`, and a negative 404 path.

When the real web application is introduced, the web workspace must add a
Playwright `test:e2e` script and its user-journey tests. PR CI is structured so
the current HTTP smoke can be replaced/extended by the real browser journey
without changing the release model.

Required product journeys will include signup/login, Social Home, My Career,
proof/validation, Growth Profile, Network/Messaging, Communities and
Opportunities.
