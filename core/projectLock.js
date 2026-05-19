'use strict';

/**
 * core/projectLock.js — per-project pipeline lockfile primitive.
 *
 * Prevents two concurrent `vocalls build|update` invocations from racing on
 * the same project's state.json. The lockfile lives at
 * `<projectDir>/.vocalls/pipeline.lock` and contains JSON with the holding
 * process's pid and an ISO start timestamp.
 *
 * Public API:
 *   acquire(projectDir) -> release()
 *
 * Cross-platform: atomic tmp+rename writes (mirrors core/state-io.js#mutate)
 * and `process.kill(pid, 0)` for liveness probes — both work identically on
 * Windows and POSIX.
 */

const fs = require('fs');
const path = require('path');

const LOCK_FILE = '.vocalls/pipeline.lock';

function lockPathFor(projectDir) {
    return path.join(projectDir, LOCK_FILE);
}

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeLockAtomic(lockfilePath) {
    const payload = {
        pid: process.pid,
        startedAt: new Date().toISOString(),
    };
    const tmpPath = lockfilePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    fs.renameSync(tmpPath, lockfilePath);
}

function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        if (err.code === 'ESRCH') return false;
        // EPERM means the process exists but we lack permission to signal it.
        if (err.code === 'EPERM') return true;
        // Any other error: treat as alive to be safe (don't steal a lock we
        // can't prove is dead).
        return true;
    }
}

function readExistingLock(lockfilePath) {
    const raw = fs.readFileSync(lockfilePath, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(
            `projectLock: malformed lockfile at ${lockfilePath}: ${err.message}. ` +
                `Inspect and delete the file manually if no pipeline is running.`
        );
    }
    if (!parsed || typeof parsed.pid !== 'number') {
        throw new Error(
            `projectLock: malformed lockfile at ${lockfilePath} (missing numeric pid). ` +
                `Inspect and delete the file manually if no pipeline is running.`
        );
    }
    return parsed;
}

function acquire(projectDir) {
    if (!projectDir || typeof projectDir !== 'string') {
        throw new Error('projectLock.acquire: projectDir is required (string)');
    }
    const lockfilePath = lockPathFor(projectDir);
    ensureDir(lockfilePath);

    if (fs.existsSync(lockfilePath)) {
        const existing = readExistingLock(lockfilePath);
        if (isPidAlive(existing.pid)) {
            throw new Error(
                `Pipeline lockfile held by PID ${existing.pid} at ${lockfilePath}. ` +
                    `If the process is no longer running, delete the lockfile.`
            );
        }
        // Stale lock — recorded PID is dead. Fall through and overwrite.
    }

    writeLockAtomic(lockfilePath);

    let released = false;
    return function release() {
        if (released) return;
        released = true;
        try {
            fs.unlinkSync(lockfilePath);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
    };
}

module.exports = {
    acquire,
};
