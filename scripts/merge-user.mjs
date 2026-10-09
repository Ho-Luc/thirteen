#!/usr/bin/env node
/**
 * merge-user.mjs — move everything owned by an old (lost) anonymous userId onto the user's current userId.
 *
 * Usage:
 *   node scripts/merge-user.mjs --from <oldUserId> --to <currentUserId>            # dry run (default, writes nothing)
 *   node scripts/merge-user.mjs --from <oldUserId> --to <currentUserId> --apply    # perform the merge
 *   node scripts/merge-user.mjs --undo backups/merge-<from>-<to>-<timestamp>.json  # restore from a backup
 *
 * What it moves (from → to):
 *   groupMembers     userId          — duplicate if `to` is already in that group → old row deleted
 *   groups           createdBy
 *   calendarEntries  userId          — same group+date conflict → keep the completed one, delete the other
 *   chatMessages     userId
 *
 * Before any write, every affected document is saved to backups/ so the merge can be undone.
 * The old Appwrite account itself is left untouched.
 *
 * Config: same .env.local / .env as diagnose-groups.mjs, plus
 *   EXPO_PUBLIC_APPWRITE_CALENDAR_ENTRIES_COLLECTION_ID, EXPO_PUBLIC_APPWRITE_CHAT_MESSAGES_COLLECTION_ID
 *   APPWRITE_ADMIN_API_KEY  — key WITH documents.write (or rows.write) in addition to the read scopes.
 *                             Kept separate from APPWRITE_API_KEY so the diagnostics key stays read-only.
 *                             Falls back to APPWRITE_API_KEY if unset. Revoke or expire it when you're done.
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
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
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
  calendar: process.env.EXPO_PUBLIC_APPWRITE_CALENDAR_ENTRIES_COLLECTION_ID,
  chat: process.env.EXPO_PUBLIC_APPWRITE_CHAT_MESSAGES_COLLECTION_ID,
  apiKey: process.env.APPWRITE_ADMIN_API_KEY || process.env.APPWRITE_API_KEY,
};
const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing config: ${missing.join(', ')}. See header of this file.`);
  process.exit(1);
}

const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId).setKey(cfg.apiKey);
const db = new Databases(client);
const users = new Users(client);

const COLLECTIONS = { groups: cfg.groups, members: cfg.members, calendar: cfg.calendar, chat: cfg.chat };
const SYSTEM_FIELDS = ['$id', '$createdAt', '$updatedAt', '$permissions', '$collectionId', '$databaseId', '$sequence', '$tenant'];

// ---------- helpers ----------
const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = c(31), yellow = c(33), green = c(32), dim = c(2), bold = c(1);
const fmtDate = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '—');

function parseArgs(argv) {
  const out = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--from') out.from = argv[++i];
    else if (a === '--to') out.to = argv[++i];
    else if (a === '--undo') out.undo = argv[++i];
    else { console.error(`Unknown argument: ${a}`); process.exit(1); }
  }
  return out;
}

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

async function getUserSafe(userId) {
  try { return await users.get(userId); } catch (e) { return { error: e }; }
}

function dataOnly(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) if (!SYSTEM_FIELDS.includes(k)) out[k] = v;
  return out;
}

// ---------- plan ----------
async function buildPlan(from, to) {
  const ops = []; // { kind: 'update'|'delete', coll, id, data?, reason, before }

  // groupMembers
  const [fromMembers, toMembers] = await Promise.all([
    listAll(cfg.members, [Query.equal('userId', from)]),
    listAll(cfg.members, [Query.equal('userId', to)]),
  ]);
  const toGroupIds = new Set(toMembers.map((m) => m.groupId));
  for (const m of fromMembers) {
    if (toGroupIds.has(m.groupId)) {
      ops.push({ kind: 'delete', coll: 'members', id: m.$id, reason: `already a member of ${m.groupId} under new id`, before: m });
    } else {
      ops.push({ kind: 'update', coll: 'members', id: m.$id, data: { userId: to }, reason: `membership in ${m.groupId}`, before: m });
      toGroupIds.add(m.groupId); // guards against duplicate old rows for the same group
    }
  }

  // groups.createdBy
  const created = await listAll(cfg.groups, [Query.equal('createdBy', from)]);
  for (const g of created) {
    ops.push({ kind: 'update', coll: 'groups', id: g.$id, data: { createdBy: to }, reason: `creator of "${g.name}"`, before: g });
  }

  // calendarEntries — one entry per user/group/date
  const [fromCal, toCal] = await Promise.all([
    listAll(cfg.calendar, [Query.equal('userId', from)]),
    listAll(cfg.calendar, [Query.equal('userId', to)]),
  ]);
  const toCalByKey = new Map(toCal.map((e) => [`${e.groupId}|${e.date}`, e]));
  for (const e of fromCal) {
    const key = `${e.groupId}|${e.date}`;
    const existing = toCalByKey.get(key);
    if (!existing) {
      ops.push({ kind: 'update', coll: 'calendar', id: e.$id, data: { userId: to }, reason: `calendar ${e.groupId} ${e.date}`, before: e });
      toCalByKey.set(key, e);
    } else if (e.completed && !existing.completed) {
      // old entry is "done", new one isn't — keep the old one's progress
      ops.push({ kind: 'delete', coll: 'calendar', id: existing.$id, reason: `conflict ${key}: drop incomplete new entry`, before: existing });
      ops.push({ kind: 'update', coll: 'calendar', id: e.$id, data: { userId: to }, reason: `conflict ${key}: keep completed old entry`, before: e });
      toCalByKey.set(key, e);
    } else {
      ops.push({ kind: 'delete', coll: 'calendar', id: e.$id, reason: `conflict ${key}: new id already has this day`, before: e });
    }
  }

  // chatMessages
  const chats = await listAll(cfg.chat, [Query.equal('userId', from)]);
  for (const m of chats) {
    ops.push({ kind: 'update', coll: 'chat', id: m.$id, data: { userId: to }, reason: `chat in ${m.groupId}`, before: m });
  }

  return { ops, counts: { fromMembers: fromMembers.length, toMembers: toMembers.length, created: created.length, fromCal: fromCal.length, chats: chats.length } };
}

function printPlan(ops) {
  const byColl = {};
  for (const op of ops) (byColl[op.coll] ||= []).push(op);
  const labels = { members: 'Memberships', groups: 'Groups created', calendar: 'Calendar entries', chat: 'Chat messages' };
  for (const coll of ['members', 'groups', 'calendar', 'chat']) {
    const list = byColl[coll] || [];
    const upd = list.filter((o) => o.kind === 'update').length;
    const del = list.filter((o) => o.kind === 'delete').length;
    console.log(`\n${bold(labels[coll])}: ${upd} to move${del ? `, ${yellow(`${del} to delete`)}` : ''}`);
    const shown = coll === 'calendar' || coll === 'chat' ? list.filter((o) => o.kind === 'delete') : list;
    for (const op of shown) console.log(`  ${op.kind === 'delete' ? yellow('delete') : green('move  ')} ${op.id}  ${dim(op.reason)}`);
  }
}

// ---------- apply / undo ----------
async function applyOps(ops, backupFile) {
  let done = 0;
  const failures = [];
  // Updates first, deletes last: if something fails midway, nothing the user had is gone yet.
  const ordered = [...ops.filter((o) => o.kind === 'update'), ...ops.filter((o) => o.kind === 'delete')];
  for (const op of ordered) {
    try {
      if (op.kind === 'update') await db.updateDocument(cfg.databaseId, COLLECTIONS[op.coll], op.id, op.data);
      else await db.deleteDocument(cfg.databaseId, COLLECTIONS[op.coll], op.id);
      done++;
      if (tty) process.stdout.write(`\r  ${done}/${ordered.length}`);
    } catch (e) {
      failures.push({ op, error: `${e.code ?? ''} ${e.message}` });
    }
  }
  if (tty) process.stdout.write('\n');
  if (failures.length) {
    console.log(red(`\n${failures.length} operation(s) failed:`));
    for (const f of failures) console.log(red(`  ${f.op.kind} ${f.op.coll}/${f.op.id}: ${f.error}`));
    console.log(`Re-running the same command is safe — it re-plans from current data. To roll back: node scripts/merge-user.mjs --undo ${backupFile}`);
  }
  return failures.length;
}

async function undo(file) {
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Restoring ${backup.ops.length} document(s) from ${file} (merge ${backup.from} → ${backup.to}, ${backup.createdAt})`);
  let failed = 0;
  for (const op of backup.ops) {
    const coll = COLLECTIONS[op.coll];
    const data = dataOnly(op.before);
    try {
      if (op.kind === 'update') {
        await db.updateDocument(cfg.databaseId, coll, op.id, data);
      } else {
        await db.createDocument(cfg.databaseId, coll, op.id, data, op.before.$permissions?.length ? op.before.$permissions : undefined);
      }
    } catch (e) {
      failed++;
      console.log(red(`  ${op.kind === 'update' ? 'revert' : 'recreate'} ${op.coll}/${op.id} failed: ${e.code ?? ''} ${e.message}`));
    }
  }
  console.log(failed ? red(`${failed} failed.`) : green('Undo complete.'));
  process.exit(failed ? 2 : 0);
}

// ---------- main ----------
const args = parseArgs(process.argv.slice(2));

try {
  if (args.undo) await undo(args.undo);

  if (!args.from || !args.to || args.from === args.to) {
    console.log('Usage: node scripts/merge-user.mjs --from <oldUserId> --to <currentUserId> [--apply]');
    console.log('       node scripts/merge-user.mjs --undo <backup.json>');
    process.exit(1);
  }

  const [fromUser, toUser] = await Promise.all([getUserSafe(args.from), getUserSafe(args.to)]);
  if (toUser.error) {
    console.error(red(`Target user ${args.to} not found (${toUser.error.message}). Refusing to merge into a missing account.`));
    process.exit(1);
  }
  console.log(bold('Merge'));
  console.log(`  from ${args.from}  ${fromUser.error ? dim('(account no longer exists)') : `created ${fmtDate(fromUser.$createdAt)} · last access ${fmtDate(fromUser.accessedAt)}`}`);
  console.log(`  to   ${args.to}  created ${fmtDate(toUser.$createdAt)} · last access ${fmtDate(toUser.accessedAt)}`);
  if (!fromUser.error && new Date(fromUser.accessedAt) > new Date(toUser.accessedAt)) {
    console.log(yellow('  ! The "from" account was used more recently than "to". Double-check the direction — you usually merge INTO the most recently used id.'));
  }

  const { ops } = await buildPlan(args.from, args.to);
  if (!ops.length) {
    console.log(green('\nNothing to move — the old id owns no data.'));
    process.exit(0);
  }
  printPlan(ops);

  if (!args.apply) {
    console.log(dim(`\nDry run — nothing written. Re-run with --apply to perform ${ops.length} operation(s).`));
    process.exit(0);
  }

  fs.mkdirSync('backups', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join('backups', `merge-${args.from}-${args.to}-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ from: args.from, to: args.to, createdAt: new Date().toISOString(), ops }, null, 2));
  console.log(`\nBackup written: ${backupFile}`);

  const failed = await applyOps(ops, backupFile);
  if (!failed) console.log(green(`\nMerged ${ops.length} operation(s). The user will see their groups the next time they open the app.`));
  process.exit(failed ? 2 : 0);
} catch (e) {
  console.error(red(`\nAppwrite error ${e.code ?? ''}: ${e.message}`));
  if (e.code === 401) console.error('The API key is missing a scope. Merging needs documents.write (or rows.write) plus the read scopes.');
  process.exit(1);
}
