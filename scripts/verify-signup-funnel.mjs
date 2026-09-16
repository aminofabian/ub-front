// End-to-end verification of the signup -> activation funnel, at the API level.
//
//   node scripts/verify-signup-funnel.mjs --api https://staging.example --host shop.example --tenant <uuid>
//
// What this can prove from outside the deployment:
//   1. the verification link the API builds is a URL a browser can open
//      (https, tenant host, NO internal port)                      <- F9 regression
//   2. an unverified account cannot sign in, and says so in the
//      wording the frontend keys its recovery UI on               <- F1/F3 contract
//   3. the token from that link activates the account, and the
//      account can then sign in                                   <- the funnel itself
//   4. a duplicate signup returns the 409 detail the recovery UI
//      matches on                                                  <- F3 contract
//
// What it CANNOT prove, and says so at the end:
//   * that mail is actually delivered (needs the inbox + the boot log)
//   * the OTP path, the browser surfaces, and anything role-dependent
//
// It CREATES a disposable account per run. Point it at staging, not production.
// Flags:
//   --api <base>        API base URL (or $API_BASE_URL). Default http://localhost:5050
//   --tenant <uuid>     value for X-Tenant-Id
//   --host <host>       value for X-Tenant-Host (the browser's Host)
//   --expect-host <h>   host the verification link must carry. Default: --host
//   --keep              skip the reminder to delete the disposable account
const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith("--") ? next : true;
};

const apiBase = String(
  flag("api", process.env.API_BASE_URL ?? "http://localhost:5050"),
).replace(/\/+$/, "");
const tenantId = flag("tenant", process.env.TENANT_ID ?? "");
const tenantHost = flag("host", process.env.TENANT_HOST ?? "");
const expectHost = flag("expect-host", tenantHost || "");
const keep = flag("keep", false) === true;

if (!tenantId && !tenantHost) {
  console.error(
    "Refusing to run without tenant context.\n" +
      "Pass --tenant <uuid> and/or --host <shop host>: the API answers 400 " +
      "(Tenant context missing) without one, and every assertion below would " +
      "fail for the wrong reason.",
  );
  process.exit(2);
}

const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);
const note = (msg) => notes.push(msg);

const headers = (extra = {}) => {
  const h = { Accept: "application/json", "Content-Type": "application/json" };
  if (tenantId) h["X-Tenant-Id"] = String(tenantId);
  if (tenantHost) h["X-Tenant-Host"] = String(tenantHost);
  return { ...h, ...extra };
};

async function call(method, path, body) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json = null;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body; keep the text for the error message */
    }
  }
  return { status: res.status, json, text, res };
}

const stamp = Date.now();
const email = `funnel-check+${stamp}@example.com`;
const password = `Check-${stamp}-pass`;

console.log(`Signup funnel check against ${apiBase}`);
console.log(
  `tenant: ${tenantId || "(none)"}   host: ${tenantHost || "(none)"}` +
    (expectHost ? `   link must point at: ${expectHost}` : ""),
);
console.log(`disposable account: ${email}\n`);

// ---------------------------------------------------------------------------
// 0. Reachability
// ---------------------------------------------------------------------------
try {
  const ping = await call("GET", "/api/v1/public/host/selfserve-countries");
  if (ping.status >= 500) {
    fail(`API reachable but unhealthy: GET selfserve-countries -> ${ping.status}`);
  } else {
    console.log(`  ok   API reachable (selfserve-countries -> ${ping.status})`);
  }
} catch (error) {
  fail(`cannot reach ${apiBase}: ${error?.message ?? error}`);
  console.error(problems.join("\n"));
  process.exit(1);
}

if (tenantHost) {
  const resolved = await call(
    "GET",
    `/api/v1/public/host/resolve?host=${encodeURIComponent(String(tenantHost))}`,
  );
  if (resolved.status === 200) {
    console.log(`  ok   tenant resolves from host ${tenantHost}`);
  } else {
    fail(
      `host ${tenantHost} does not resolve to a tenant (HTTP ${resolved.status}). ` +
        "Sign up will fail with 'Tenant context missing' or 404.",
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Register -> INVITED + (maybe) the verification link
// ---------------------------------------------------------------------------
const registered = await call("POST", "/api/v1/auth/register", {
  name: "Funnel Check",
  email,
  password,
});
if (registered.status !== 201) {
  fail(
    `register -> ${registered.status} (expected 201). Body: ${registered.text.slice(0, 300)}`,
  );
} else {
  console.log(`  ok   register -> 201`);
}

const status = String(registered.json?.status ?? "").toLowerCase();
if (status === "invited") {
  console.log("  ok   new account is INVITED (the verification gate is on)");
} else if (status === "active") {
  note(
    "new account came back ACTIVE — `app.auth.email-verification-required` is " +
      "off (or a super-admin turned it off). The verification checks below do " +
      "not apply to this deployment.",
  );
} else {
  fail(`register returned unexpected status '${status}'`);
}

const link = String(registered.json?.verificationUrl ?? "").trim();

// ---------------------------------------------------------------------------
// 2. The link itself — the F9 regression check
// ---------------------------------------------------------------------------
if (link) {
  console.log("\n  verification link returned by the API:");
  console.log(`    ${link}`);
  let parsed = null;
  try {
    parsed = new URL(link);
  } catch {
    fail(`verification link is not a URL: ${link}`);
  }
  if (parsed) {
    if (parsed.protocol !== "https:" && !/^localhost|^127\.0\.0\.1/.test(parsed.hostname)) {
      fail(
        `link scheme is ${parsed.protocol} for a public host — a deployed link ` +
          "must be https (unless you are running plain-http on purpose).",
      );
    }
    // The F9 bug: the API's own listening port leaked into the browser URL.
    if (parsed.port && parsed.port !== "443" && parsed.port !== "80") {
      fail(
        `link carries port :${parsed.port}. The API's connection port (5050) ` +
          "must never appear in a user-facing URL — this is the F9 bug.",
      );
    }
    if (expectHost && parsed.hostname !== expectHost) {
      fail(
        `link host is '${parsed.hostname}', expected '${expectHost}'. The link ` +
          "must point at the shop's own host, not the apex or the API origin.",
      );
    }
    if (parsed.pathname !== "/verify-email") {
      fail(`link path is '${parsed.pathname}', expected '/verify-email'`);
    }
    if (!parsed.searchParams.get("token")) {
      fail("link has no `token` parameter");
    }
    if (problems.length === 0) {
      console.log(
        "  ok   link is https, on the shop host, port-free, with /verify-email?token=",
      );
    }
  }
} else {
  note(
    "no verificationUrl in the register response. That means " +
      "`app.auth.return-verification-link-in-register-response` is off AND a mail " +
      "provider is configured (an unconfigured provider now forces the link into " +
      "the response). So mail was *attempted* — but this script cannot see the " +
      "inbox or the provider's answer. Check the boot log line and a real inbox.",
  );
}

// ---------------------------------------------------------------------------
// 3. An unverified account cannot sign in, with the wording the UI keys on
// ---------------------------------------------------------------------------
const invitedLogin = await call("POST", "/api/v1/auth/login", { email, password });
if (status !== "invited") {
  if (invitedLogin.status === 200) {
    console.log("\n  ok   login -> 200 (verification not required; nothing to gate)");
  } else {
    fail(`login -> ${invitedLogin.status} (expected 200 when verification is off)`);
  }
} else if (invitedLogin.status === 403) {
  const detail = String(
    invitedLogin.json?.detail ?? invitedLogin.json?.message ?? invitedLogin.text ?? "",
  );
  if (/email not verified/i.test(detail)) {
    console.log(`\n  ok   unverified login -> 403 "${detail.slice(0, 80)}…"`);
    console.log(
      "  ok   wording still matches the frontend's isEmailNotVerifiedError()",
    );
  } else {
    fail(
      `unverified login -> 403 but the detail no longer matches ` +
        `/email not verified/i, which the frontend recovery UI depends on.\n` +
        `        got: ${detail.slice(0, 200)}`,
    );
  }
} else {
  fail(
    `unverified login -> ${invitedLogin.status} (expected 403). If this is 401, ` +
      "the API could not resolve the tenant from the request context.",
  );
}

// ---------------------------------------------------------------------------
// 4. Verify with the token, then sign in for real
// ---------------------------------------------------------------------------
const token = link ? new URL(link).searchParams.get("token") : null;
if (status === "invited" && token) {
  const verified = await call("POST", "/api/v1/auth/verify-email", { token });
  if (verified.status === 200) {
    const gotSession = Boolean(
      verified.json?.accessToken ||
        verified.json?.session ||
        verified.res.headers.get("set-cookie"),
    );
    if (gotSession) {
      console.log("\n  ok   verify-email -> 200 with a session (no second login needed)");
    } else {
      fail(
        "verify-email -> 200 but carried no session (no accessToken, claims or " +
          "Set-Cookie). The frontend would fall back to a sign-in form.",
      );
    }
  } else {
    fail(
      `verify-email -> ${verified.status} (expected 200). Body: ${verified.text.slice(0, 200)}`,
    );
  }

  const afterLogin = await call("POST", "/api/v1/auth/login", { email, password });
  if (afterLogin.status === 200) {
    console.log("  ok   login after verifying -> 200 (account is usable)");
  } else {
    fail(`login after verifying -> ${afterLogin.status} (expected 200)`);
  }

  // resolve-by-email uses findFirstSignInEligibleByEmail, which prefers an
  // active membership and falls back to an invited one — so an activated
  // account must always be found here.
  const byEmail = await call(
    "GET",
    `/api/v1/public/host/resolve-by-email?email=${encodeURIComponent(email)}`,
  );
  if (byEmail.status === 200) {
    console.log("  ok   resolve-by-email finds the activated account (apex can route it)");
  } else {
    fail(
      `resolve-by-email -> ${byEmail.status} for an ACTIVE account. The apex ` +
        "cannot route this user to their shop (landing 'find my shop by email').",
    );
  }
} else if (status === "invited" && !token) {
  note(
    "skipped the activate-and-sign-in checks: no token available without the " +
      "link. Re-run with `APP_AUTH_RETURN_VERIFICATION_LINK=true` on staging to " +
      "cover this end to end (turn it back off afterwards).",
  );
}

// ---------------------------------------------------------------------------
// 5. Duplicate signup — the 409 detail the recovery UI matches on
// ---------------------------------------------------------------------------
const dupe = await call("POST", "/api/v1/auth/register", {
  name: "Funnel Check",
  email,
  password,
});
if (dupe.status === 409) {
  const detail = String(dupe.json?.detail ?? dupe.json?.title ?? dupe.text ?? "");
  if (/account with this email already exists/i.test(detail)) {
    console.log("\n  ok   duplicate signup -> 409 with the wording the recovery UI keys on");
  } else {
    fail(
      "duplicate signup -> 409 but the detail no longer matches " +
        "/account with this email already exists/i, which the frontend " +
        `isAccountExistsError() depends on.\n        got: ${detail.slice(0, 200)}`,
    );
  }
} else {
  fail(`duplicate signup -> ${dupe.status} (expected 409). Body: ${dupe.text.slice(0, 200)}`);
}

// ---------------------------------------------------------------------------
// 6. Resend — must never 5xx, and must not leak more than register does
// ---------------------------------------------------------------------------
const resend = await call("POST", "/api/v1/auth/resend-verification", { email });
if (resend.status === 204 || resend.status === 200) {
  console.log(
    `  ok   resend-verification -> ${resend.status}` +
      (resend.status === 200 ? " (link exposed)" : " (no content — anti-enumeration)"),
  );
} else {
  fail(`resend-verification -> ${resend.status}. Body: ${resend.text.slice(0, 200)}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (!keep) {
  console.log(`\nA disposable account was created: ${email}`);
  console.log("Remove it with the super-admin tools if the deployment matters.");
}

if (notes.length) {
  console.log("\nNotes (not failures):");
  for (const n of notes) console.log(`  - ${n}`);
}

console.log("\nStill manual — this script cannot see an inbox, a log or a browser:");
console.log("  1. Backend boot log: `grep -i \"\\[mail\\]\" <log>`");
console.log("       'active provider: …'      -> mail is configured");
console.log("       'NO MAIL PROVIDER ACTIVE' -> nothing is sent; the API now");
console.log("                                   returns the link on register instead");
console.log("  2. Open the verification email: the URL must be the same shape this");
console.log("     script checked, and tapping it must land on /verify-email.");
console.log("  3. Browser surfaces — see docs/scopes/SIGNUP_ACTIVATION_FUNNEL_VERIFICATION.md");

if (problems.length) {
  console.log(`\nFAILED (${problems.length}):`);
  for (const p of problems) console.log(`  x ${p}`);
  process.exit(1);
}
console.log("\nOK: the API-level funnel behaves as the fixed funnel expects.");
