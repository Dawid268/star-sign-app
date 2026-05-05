#!/usr/bin/env node

const args = process.argv.slice(2);

const getArgValue = (flag, fallback) => {
  const index = args.findIndex((item) => item === flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return fallback;
};

const hasFlag = (flag) => args.includes(flag);

const baseUrl = getArgValue(
  '--url',
  process.env.AICO_AUDIT_URL || 'http://localhost:1337'
);
const endpoint = getArgValue(
  '--endpoint',
  process.env.AICO_AUDIT_ENDPOINT || '/ai-content-orchestrator/audit/preflight'
);
const bearerToken = getArgValue(
  '--token',
  process.env.AICO_AUDIT_BEARER || ''
);
const allowWarnings =
  hasFlag('--allow-warnings') ||
  String(process.env.AICO_AUDIT_ACCEPT_WARNINGS || '').toLowerCase() ===
    'true';
const requireGo =
  hasFlag('--require-go') ||
  String(process.env.AICO_AUDIT_REQUIRE_GO || '').toLowerCase() === 'true';

if (!bearerToken) {
  console.error(
    '[aico-audit] missing bearer token. Set AICO_AUDIT_BEARER or pass --token.'
  );
  process.exit(3);
}

const url = `${baseUrl.replace(/\/$/, '')}${
  endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}`;

const headers = {
  'content-type': 'application/json',
};

if (bearerToken) {
  headers.authorization = `Bearer ${bearerToken}`;
}

let response;
try {
  response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ strict: true }),
  });
} catch (error) {
  console.error(`[aico-audit] request failed: ${String(error)}`);
  process.exit(3);
}

let body = null;
try {
  body = await response.json();
} catch (error) {
  console.error(`[aico-audit] invalid JSON response: ${String(error)}`);
  process.exit(3);
}

const decision = body?.data?.decision;

if (!decision) {
  console.error('[aico-audit] missing decision in response', body);
  process.exit(3);
}

console.log(`[aico-audit] decision=${decision}`);

if (!response.ok) {
  console.error(`[aico-audit] unexpected status=${response.status}`, body);
  process.exit(3);
}

if (decision === 'NO_GO') {
  console.error('[aico-audit] blocking deploy: decision=NO_GO');
  process.exit(2);
}

if (requireGo && decision !== 'GO') {
  console.error(
    `[aico-audit] blocking deploy: expected decision=GO, got ${decision}`
  );
  process.exit(2);
}

if (decision === 'GO_WITH_WARNINGS' && !allowWarnings) {
  console.error(
    '[aico-audit] blocking deploy: decision=GO_WITH_WARNINGS (allow via --allow-warnings)'
  );
  process.exit(2);
}

process.exit(0);
