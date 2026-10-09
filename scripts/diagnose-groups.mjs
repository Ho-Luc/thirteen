#!/usr/bin/env node
/**
 * diagnose-groups.mjs — read-only Appwrite diagnostics for "groups not loading".
 *
 * Usage:
 *   node scripts/diagnose-groups.mjs user  <userId>        # why does this user see what they see?
 *   node scripts/diagnose-groups.mjs name  <userName>      # find every userId for a person (orphaned-account check)
 *   node scripts/diagnose-groups.mjs group <groupId|shareKey>
 *   node scripts/diagnose-groups.mjs health                # database-wide integrity + permission checks
 *
 * Config (read from .env.local, then .env, then the shell environment):
 *   EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_PROJECT_ID, EXPO_PUBLIC_APPWRITE_DATABASE_ID,
 *   EXPO_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_GROUP_MEMBERS_COLLECTION_ID
 *   APPWRITE_API_KEY  — server key with scopes: databases.read, collections.read, documents.read, users.read
 *                       NEVER prefix with EXPO_PUBLIC_ (that would bundle it into the app).
 *
 * Install once:  npm i -D node-appwrite
 * This script only reads. It never writes, updates, or deletes anything.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Client, Databases, Users, Query } from 'node-appwrite';

// ---------- config ----------
function loadEnvFile(file) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const val = m[2].replace(/^['"]|['"]$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const cfg = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  groups: process.env.EXPO_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID,
  members: process.env.EXPO_PUBLIC_APPWRITE_GROUP_MEMBERS_COLLECTION_ID,
  apiKey: process.env.APPWRITE_API_KEY,
};
const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing config: ${missing.join(', ')}. See header of this file.`);
  process.exit(1);
}

const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId).setKey(cfg.apiKey);
const db = new Databases(client);
const users = new Users(client);

// Must match the limits in services/groupsService.tsx
const APP_CREATED_LIMIT = 50;
const APP_MEMBERSHIP_LIMIT = 100;

// ---------- output helpers ----------
const c = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = c(31), yellow = c(33), green = c(32), dim = c(2), bold = c(1);
const findings = [];
const problem = (msg) => { findings.push(['PROBLEM', msg]); console.log(red(`  ✗ ${msg}`)); };
const warn = (msg) => { findings.push(['WARN', msg]); console.log(yellow(`  ! ${msg}`)); };
const ok = (msg) => console.log(green(`  ✓ ${msg}`));
const info = (msg) => console.log(`  ${msg}`);
const section = (t) => console.log(`\n${bold(t)}`);
const fmtDate = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '—');

// ---------- data helpers ----------
async function listAll(collectionId, queries = []) {
  const out = [];
  let cursor;
  for (;;) {
    const q = [...queries, Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await db.listDocuments(cfg.databaseId, collectionId, q);
    out.push(...res.documents);
    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return out;
}

async function getGroupsByIds(ids) {
  const found = [];
  for (let i = 0; i < ids.length; i += 25) {
    const batch = ids.slice(i, i + 25);
    const res = await db.listDocuments(cfg.databaseId, cfg.groups, [Query.equal('$id', batch), Query.limit(25)]);
    found.push(...res.documents);
  }
  return found;
}

async function getUserSafe(userId) {
  try { return await users.get(userId); } catch (e) { return { error: e }; }
}

function canAnyUserRead(perms) {
  return perms.some((p) => /^read\("(any|users|users\/verified)"\)$/.test(p));
}

// ---------- commands ----------
async function cmdUser(userId) {
  section(`Appwrite account ${userId}`);
  const u = await getUserSafe(userId);
  if (u.error) {
    problem(`users.get failed (${u.error.code ?? ''} ${u.error.message}). This userId does not exist (deleted, or wrong project).`);
  } else {
    info(`created ${fmtDate(u.$createdAt)} · last access ${fmtDate(u.accessedAt)} · status ${u.status ? 'active' : 'BLOCKED'}`);
    info(`email ${u.email || dim('(anonymous)')} · name ${u.name || dim('(none)')}`);
    if (!u.status) problem('Account is blocked — all client requests will fail.');
    const prev = u.prefs?.previousUserIds;
    if (Array.isArray(prev) && prev.length) {
      problem(`This device lost earlier session(s). Previous userId(s): ${prev.join(', ')}`);
      for (const p of prev) info(`    recover with: node scripts/merge-user.mjs --from ${p} --to ${userId}`);
    }
    const ageHrs = (Date.now() - new Date(u.$createdAt)) / 36e5;
    if (!u.email && ageHrs < 72) warn('Anonymous account created in the last 72h. If this person had groups before, they were probably issued a NEW anonymous user (reinstall, cleared storage, or account.get() failure). Run: name "<their display name>"');
  }

  section('What the app sees (same queries as groupsService.getUserGroups)');
  const createdApp = await db.listDocuments(cfg.databaseId, cfg.groups, [Query.equal('createdBy', userId), Query.limit(APP_CREATED_LIMIT)]);
  const membApp = await db.listDocuments(cfg.databaseId, cfg.members, [Query.equal('userId', userId), Query.limit(APP_MEMBERSHIP_LIMIT)]);
  const joinedApp = await getGroupsByIds([...new Set(membApp.documents.map((m) => m.groupId))]);
  const appIds = new Set([...createdApp.documents, ...joinedApp].map((g) => g.$id));
  info(`created: ${createdApp.documents.length} · memberships: ${membApp.documents.length} · groups shown: ${appIds.size}`);

  section('Full truth (paginated, no limits)');
  const created = await listAll(cfg.groups, [Query.equal('createdBy', userId)]);
  const memberships = await listAll(cfg.members, [Query.equal('userId', userId)]);
  const memberGroupIds = [...new Set(memberships.map((m) => m.groupId))];
  const memberGroups = await getGroupsByIds(memberGroupIds);
  const existing = new Set(memberGroups.map((g) => g.$id));
  const allIds = new Set([...created, ...memberGroups].map((g) => g.$id));
  info(`created: ${created.length} · memberships: ${memberships.length} · distinct real groups: ${allIds.size}`);

  if (created.length > APP_CREATED_LIMIT) problem(`Created ${created.length} groups but app only fetches ${APP_CREATED_LIMIT}.`);
  if (memberships.length > APP_MEMBERSHIP_LIMIT) problem(`${memberships.length} memberships but app only fetches ${APP_MEMBERSHIP_LIMIT}.`);
  const hidden = [...allIds].filter((id) => !appIds.has(id));
  if (hidden.length) problem(`${hidden.length} group(s) exist for this user but the app's queries miss them: ${hidden.join(', ')}`);

  const orphans = memberships.filter((m) => !existing.has(m.groupId));
  if (orphans.length) warn(`${orphans.length} membership(s) point at deleted groups: ${orphans.map((o) => o.groupId).join(', ')}`);

  const dupCounts = memberships.reduce((acc, m) => ((acc[m.groupId] = (acc[m.groupId] || 0) + 1), acc), {});
  const dups = Object.entries(dupCounts).filter(([, n]) => n > 1);
  if (dups.length) warn(`Duplicate memberships: ${dups.map(([g, n]) => `${g}×${n}`).join(', ')}`);

  const noCreatorMembership = created.filter((g) => !memberGroupIds.includes(g.$id));
  if (noCreatorMembership.length) warn(`Creator has no membership row in ${noCreatorMembership.length} group(s) (createGroup swallows that failure): ${noCreatorMembership.map((g) => g.$id).join(', ')}`);

  section('Read permissions (client uses this user\'s session, not an API key)');
  const unreadable = [];
  for (const g of [...created, ...memberGroups]) {
    if (g.$permissions.length && !canAnyUserRead(g.$permissions) && !g.$permissions.includes(`read("user:${userId}")`)) unreadable.push(g.$id);
  }
  for (const m of memberships) {
    if (m.$permissions.length && !canAnyUserRead(m.$permissions) && !m.$permissions.includes(`read("user:${userId}")`)) unreadable.push(`member:${m.$id}`);
  }
  if (unreadable.length) warn(`Docs with document-level perms that may not grant this user read (only matters if collection-level read doesn't cover it — see 'health'): ${unreadable.slice(0, 10).join(', ')}${unreadable.length > 10 ? '…' : ''}`);
  else ok('No document-level permission conflicts found.');

  section('Groups');
  const byId = new Map([...created, ...memberGroups].map((g) => [g.$id, g]));
  if (!byId.size) info(dim('(none)'));
  for (const g of byId.values()) {
    const role = g.createdBy === userId ? 'creator' : 'member';
    info(`${g.$id}  ${g.shareKey}  ${role.padEnd(7)}  ${g.name}  ${appIds.has(g.$id) ? '' : red('[NOT SHOWN IN APP]')}`);
  }
  const names = [...new Set(memberships.map((m) => m.userName).filter(Boolean))];
  if (names.length) info(dim(`\nuserName on memberships: ${names.join(', ')} — use with: name "<userName>"`));
}

async function cmdName(name) {
  section(`Memberships with userName matching "${name}" (case-insensitive, full scan)`);
  const all = await listAll(cfg.members);
  const needle = name.toLowerCase();
  const hits = all.filter((m) => (m.userName || '').toLowerCase().includes(needle));
  if (!hits.length) return info(dim('No matches.'));

  const byUser = new Map();
  for (const m of hits) {
    if (!byUser.has(m.userId)) byUser.set(m.userId, []);
    byUser.get(m.userId).push(m);
  }
  for (const [uid, ms] of byUser) {
    const u = await getUserSafe(uid);
    const meta = u.error ? red('account missing') : `created ${fmtDate(u.$createdAt)} · last access ${fmtDate(u.accessedAt)}`;
    info(`${bold(uid)}  ${meta}`);
    for (const m of ms) info(dim(`    group ${m.groupId}  as "${m.userName}"  joined ${fmtDate(m.joinedAt || m.$createdAt)}`));
  }
  if (byUser.size > 1) {
    warn(`${byUser.size} different userIds share this name. If it's one person, they lost their old anonymous session; the most recently accessed userId is their current device, older ones hold their "missing" groups.`);
  }
}

async function cmdGroup(idOrKey) {
  let g;
  try { g = await db.getDocument(cfg.databaseId, cfg.groups, idOrKey); } catch { /* try shareKey */ }
  if (!g) {
    const res = await db.listDocuments(cfg.databaseId, cfg.groups, [Query.equal('shareKey', idOrKey.toUpperCase())]);
    if (res.total > 1) problem(`${res.total} groups share key ${idOrKey}: ${res.documents.map((d) => d.$id).join(', ')} — joins go to the first one only.`);
    g = res.documents[0];
  }
  if (!g) return problem(`No group with id or shareKey "${idOrKey}".`);

  section(`Group ${g.$id} — "${g.name}" (key ${g.shareKey})`);
  info(`created ${fmtDate(g.$createdAt)} by ${g.createdBy}`);
  info(dim(`permissions: ${g.$permissions.join(' ') || '(none — collection-level only)'}`));
  const creator = await getUserSafe(g.createdBy);
  if (creator.error) warn('Creator account no longer exists.');

  const ms = await listAll(cfg.members, [Query.equal('groupId', g.$id)]);
  section(`Members (${ms.length})`);
  const seen = new Map();
  for (const m of ms) seen.set(m.userId, (seen.get(m.userId) || 0) + 1);
  for (const m of ms) {
    const flags = [m.userId === g.createdBy ? 'creator' : '', seen.get(m.userId) > 1 ? red('DUP') : ''].filter(Boolean).join(' ');
    info(`${m.userId}  "${m.userName}"  joined ${fmtDate(m.joinedAt || m.$createdAt)}  ${flags}`);
  }
  if (!ms.some((m) => m.userId === g.createdBy)) warn('Creator has no membership row.');
}

async function cmdHealth() {
  section('Collection configuration');
  for (const [label, id] of [['groups', cfg.groups], ['groupMembers', cfg.members]]) {
    const col = await db.getCollection(cfg.databaseId, id);
    const perms = col.$permissions || [];
    info(`${label}: enabled=${col.enabled} documentSecurity=${col.documentSecurity}`);
    info(dim(`  ${perms.join(' ') || '(no collection-level permissions)'}`));
    if (!col.enabled) problem(`${label} collection is DISABLED.`);
    if (!canAnyUserRead(perms) && !col.documentSecurity) problem(`${label}: no collection-level read for users and documentSecurity is off — anonymous sessions can't list anything.`);
    else if (!canAnyUserRead(perms)) warn(`${label}: reads depend entirely on per-document permissions.`);

    const idxAttrs = (col.indexes || []).flatMap((i) => i.attributes);
    const needed = label === 'groups' ? ['createdBy', 'shareKey'] : ['userId', 'groupId'];
    for (const a of needed) if (!idxAttrs.includes(a)) warn(`${label}: no index on "${a}" (queries filter on it).`);
  }

  section('Data integrity');
  const groups = await listAll(cfg.groups);
  const members = await listAll(cfg.members);
  const gIds = new Set(groups.map((g) => g.$id));
  info(`${groups.length} groups · ${members.length} memberships`);

  const orphans = members.filter((m) => !gIds.has(m.groupId));
  orphans.length ? warn(`${orphans.length} memberships reference deleted groups.`) : ok('No orphaned memberships.');

  const pairCount = {};
  for (const m of members) pairCount[`${m.userId}|${m.groupId}`] = (pairCount[`${m.userId}|${m.groupId}`] || 0) + 1;
  const dupPairs = Object.entries(pairCount).filter(([, n]) => n > 1);
  dupPairs.length ? warn(`${dupPairs.length} user/group pairs have duplicate memberships.`) : ok('No duplicate memberships.');

  const keyCount = {};
  for (const g of groups) keyCount[g.shareKey] = (keyCount[g.shareKey] || 0) + 1;
  const dupKeys = Object.entries(keyCount).filter(([, n]) => n > 1);
  dupKeys.length ? problem(`Duplicate shareKeys: ${dupKeys.map(([k]) => k).join(', ')}`) : ok('All shareKeys unique.');

  const memberSet = new Set(members.map((m) => `${m.userId}|${m.groupId}`));
  const noCreator = groups.filter((g) => !memberSet.has(`${g.createdBy}|${g.$id}`));
  noCreator.length ? warn(`${noCreator.length} groups have no creator membership row.`) : ok('Every group has a creator membership.');

  const perUser = {};
  for (const m of members) perUser[m.userId] = (perUser[m.userId] || 0) + 1;
  const heavy = Object.entries(perUser).filter(([, n]) => n > APP_MEMBERSHIP_LIMIT);
  if (heavy.length) problem(`Users over the app's ${APP_MEMBERSHIP_LIMIT}-membership fetch limit: ${heavy.map(([u, n]) => `${u}(${n})`).join(', ')}`);

  const nameToIds = {};
  for (const m of members) if (m.userName) (nameToIds[m.userName] ||= new Set()).add(m.userId);
  const multi = Object.entries(nameToIds).filter(([n, s]) => s.size > 1 && !/^(anonymous|you)/i.test(n));
  if (multi.length) warn(`Names used by multiple userIds (possible lost anonymous sessions): ${multi.map(([n, s]) => `"${n}"×${s.size}`).join(', ')}`);
}

// ---------- main ----------
const [cmd, arg] = process.argv.slice(2);
const run = { user: cmdUser, name: cmdName, group: cmdGroup, health: cmdHealth }[cmd];
if (!run || (cmd !== 'health' && !arg)) {
  console.log('Usage: node scripts/diagnose-groups.mjs <user <userId> | name <userName> | group <groupId|shareKey> | health>');
  process.exit(1);
}
try {
  await run(arg);
  const p = findings.filter(([t]) => t === 'PROBLEM').length;
  const w = findings.filter(([t]) => t === 'WARN').length;
  console.log(`\n${p ? red(`${p} problem(s)`) : green('0 problems')}, ${w ? yellow(`${w} warning(s)`) : '0 warnings'}`);
  process.exit(p ? 2 : 0);
} catch (e) {
  console.error(red(`\nAppwrite error ${e.code ?? ''}: ${e.message}`));
  if (e.code === 401) console.error('Check APPWRITE_API_KEY and its scopes (databases.read, collections.read, documents.read, users.read).');
  process.exit(1);
}
