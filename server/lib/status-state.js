const fs = require('fs');
const path = require('path');

const BLOB_PATH = 'urp-status-monitor-state.json';
const LOCAL_PATH = path.join(process.cwd(), 'data', 'monitor-state.json');

function snapshotFromStatus(status) {
  const sites = {};
  for (const s of status.sites || []) {
    sites[s.id] = s.status;
  }
  return {
    sites,
    fivem: status.fivem?.enabled ? status.fivem.status : null,
    updatedAt: status.checkedAt,
  };
}

async function loadFromBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { head } = require('@vercel/blob');
    const meta = await head(BLOB_PATH, { token });
    if (!meta?.url) return null;
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function loadLocal() {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function saveToBlob(state) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    const { put } = require('@vercel/blob');
    await put(BLOB_PATH, JSON.stringify(state), {
      access: 'public',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return true;
  } catch (err) {
    console.error('status-state blob save:', err);
    return false;
  }
}

function saveLocal(state) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(state, null, 2));
    return true;
  } catch {
    return false;
  }
}

async function loadPreviousState() {
  return (await loadFromBlob()) || loadLocal() || null;
}

async function savePreviousState(state) {
  const blobOk = await saveToBlob(state);
  if (!blobOk) saveLocal(state);
}

module.exports = {
  snapshotFromStatus,
  loadPreviousState,
  savePreviousState,
};
