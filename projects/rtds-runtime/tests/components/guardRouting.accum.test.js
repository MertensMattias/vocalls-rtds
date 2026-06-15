/**
 * Contract test — guardRouting per-attempt report accumulation (guardRouting.js).
 *
 * The guard is a GUI-exit (registerRtdsExit("guard","guard_routing")), so it has
 * NO runtime twin. This test exercises the component's OWN node bodies in an
 * isolated sandbox, driving the per-attempt cycle by hand:
 *
 *     dialGuard(130) -> [set __transferResult] -> appendLog(150) -> renderReport(400)
 *
 * and finally prepareMsg(200). The source of truth is guardRouting.js (the
 * canonical live file) — every readNodeAttr / loadMasterCode call passes
 * 'guardRouting'.
 *
 * What it proves:
 *   - report data (rtEmailTo / rtEmailBody) is accumulated PER ATTEMPT, so a
 *     mid-dial hangup (renderReport never reached for the current guard) still
 *     leaves a complete report for the guards already resolved;
 *   - each attempt is staged success-optimistic at dial start and overwritten to
 *     the classified failure reason only if it failed (call-taken-then-dropped
 *     correctly reads as success);
 *   - the normal path is equivalent to the legacy once-at-end render;
 *   - SMS end-state rules (lone-success skip, success-guard exclusion) are intact;
 *   - cross-leg accumulation still concatenates a second guard invocation.
 *
 * See rtds/components/guardRouting.js and _harness.loadMasterCode / readNodeAttr.
 */

var h = require('./_harness');
var vm = require('vm');

var COMPONENT = 'guardRouting';

// Node bodies use top-level `var`/`return`, so wrap before vm-eval (mirrors
// say.test.js). __dialedCount / __emailHeaderWritten / __legPrefix* are assigned
// WITHOUT var inside the bodies, so they write to the sandbox global — which is
// exactly the session-scoped semantics production relies on.
function runBody(sb, code) {
    vm.runInContext('(function () {\n' + code + '\n})();', sb);
}
function runNode(sb, id) {
    runBody(sb, h.readNodeAttr(COMPONENT, id, 'Code'));
}

// A redirect result __classifyRedirect maps: 4->no_reaction, 1->rejected,
// 0->rejected_voicebox, anything else->success.
function transfer(status) {
    return { Details: { ClientSpecific: { Party2: { Status: status } } } };
}
var STATUS = { noReaction: 4, rejected: 1, voicebox: 0, success: 9 };

// Build a sandbox with the real master-Code helpers and the loop state that
// init/getGuards would otherwise seed (we skip those — no env lib, no HTTP).
function makeSandbox(params, guardList, varObjSeed) {
    var sb = h.loadMasterCode(COMPONENT, { varObj: varObjSeed || {} });
    sb.__rtParams = params;
    sb.__guardList = guardList;
    sb.__guardCount = guardList.length;
    sb.__guardIndex = 0;
    sb.__guardLog = [];
    sb.__guardPickedUp = false;
    sb.__transferResult = null;
    sb.__voicemailCapture = '';
    sb.__currentGuardPhone = '';
    sb.__diversion = '';
    // per-attempt accumulation state (init id=7 seeds these in production)
    sb.__dialedCount = 0;
    sb.__legRendered = false;
    sb.__legPrefixEmailBody = '';
    sb.__legPrefixEmailTo = '';
    sb.__legPrefixSmsBody = '';
    sb.__legPrefixSmsTo = '';
    sb.__rtOutcome = 'nextStep';
    return sb;
}

// One full attempt: dialGuard stages success-optimistic, redirect sets the
// result, appendLog resolves the outcome, renderReport re-renders BOTH channels
// (email + sms). status === null models a mid-redirect hangup: dialGuard ran
// (recipient + a provisional success line are recorded) but the result never
// arrived, so appendLog / renderReport for THIS guard do not run.
function attempt(sb, status) {
    runNode(sb, '130');                 // moment (a): push success-optimistic
    if (status === null) { return; }    // hangup during redirect
    sb.__transferResult = transfer(status);
    runNode(sb, '150');                 // overwrite outcome + loop control
    runNode(sb, '400');                 // moment (b): render email + sms report
}

var GUARDS3 = [
    { name: 'Alice', phone: '+3210', email: 'alice@x.be' },
    { name: 'Bob', phone: '+3220', email: 'bob@x.be' },
    { name: 'Carol', phone: '+3230', email: 'carol@x.be' }
];

describe('guardRouting per-attempt accumulation (guardRouting.v2)', function () {

    it('normal path: rtEmailBody equals legacy header + blocks (+ no footer when no voicemail)', function () {
        var sb = makeSandbox(
            { sendMail: true, sendSms: false, configName: 'KW', recordVoicemail: false },
            GUARDS3,
            { ani: '+32478' }
        );
        attempt(sb, STATUS.noReaction);
        attempt(sb, STATUS.rejected);
        attempt(sb, STATUS.success);
        runNode(sb, '200');                                   // prepareMsg

        // Legacy reference: header + __buildAttemptBlocks(full log). recordVoicemail
        // is false, so prepareMsg appends no footer.
        var legacyHeader = 'KW -- caller +32478\n\n';
        var legacyBody = legacyHeader + sb.__buildAttemptBlocks(sb.__guardLog);
        expect(sb.varObj.rtEmailBody).toBe(legacyBody);
        // rtEmailTo = the guards actually dialed (all three resolved here).
        expect(sb.varObj.rtEmailTo).toBe('alice@x.be;bob@x.be;carol@x.be');
    });

    it('success-optimistic then overwrite: a failed dial flips success -> no_reaction in body', function () {
        var sb = makeSandbox(
            { sendMail: true, configName: 'KW' },
            [GUARDS3[0]],
            { ani: '+32478' }
        );
        // After dialGuard only: entry staged 'success'.
        runNode(sb, '130');
        expect(sb.__guardLog[0].outcome).toBe('success');
        // appendLog with a no_reaction result overwrites the entry in place.
        sb.__transferResult = transfer(STATUS.noReaction);
        runNode(sb, '150');
        expect(sb.__guardLog[0].outcome).toBe('no_reaction');
        expect(sb.__guardLog.length).toBe(1);                 // no duplicate push
        // renderReport reflects the overwritten reason.
        runNode(sb, '400');
        expect(sb.varObj.rtEmailBody.indexOf('Reason: no_reaction')).toBeGreaterThan(-1);
        expect(sb.varObj.rtEmailBody.indexOf('Reason: success')).toBe(-1);
    });

    it('call taken then dropped before classify: entry stays success', function () {
        var sb = makeSandbox({ sendMail: true, configName: 'KW' }, [GUARDS3[0]], { ani: '+32478' });
        runNode(sb, '130');                                   // pickup, then hangup before result
        // appendLog / renderReport never run for this guard.
        expect(sb.__guardLog[0].outcome).toBe('success');
        expect(sb.__dialedCount).toBe(1);
    });

    it('interruption at attempt 2: BOTH channels hold attempt-1, recipients hold the dialed guards', function () {
        var sb = makeSandbox(
            { sendMail: true, sendSms: true, configName: 'KW' },
            [GUARDS3[0], GUARDS3[1]],
            { ani: '+32478' }
        );
        attempt(sb, STATUS.noReaction);                       // guard 1 resolves + renders both channels
        attempt(sb, null);                                    // guard 2: hangup during redirect

        // EMAIL: rendered after attempt 1 -> contains Alice's resolved block.
        expect(sb.varObj.rtEmailBody.indexOf('To: Alice')).toBeGreaterThan(-1);
        expect(sb.varObj.rtEmailBody.indexOf('Reason: no_reaction')).toBeGreaterThan(-1);
        expect(sb.varObj.rtEmailTo).toBe('alice@x.be');
        // SMS: the whole point of this change -- rtSms* also survive interruption.
        // Alice failed (no_reaction), so she is an SMS recipient (not excluded).
        expect(sb.varObj.rtSmsBody.indexOf('To: Alice')).toBeGreaterThan(-1);
        expect(sb.varObj.rtSmsTo).toBe('+3210');
        // Bob was staged success-optimistic (moment a) but never rendered.
        expect(sb.__guardLog.length).toBe(2);
        expect(sb.__guardLog[1].outcome).toBe('success');
        // No footer (prepareMsg skipped on interruption).
        expect(sb.varObj.rtEmailBody.indexOf('voicemail')).toBe(-1);
        expect(sb.varObj.rtSmsBody.indexOf('voicemail')).toBe(-1);
    });

    it('cross-leg: a second guard invocation concatenates onto leg 1 with no second header', function () {
        var shared = { ani: '+32478' };
        // Leg 1
        var sb1 = makeSandbox({ sendMail: true, configName: 'KW' }, [GUARDS3[0]], shared);
        attempt(sb1, STATUS.noReaction);
        var leg1Body = sb1.varObj.rtEmailBody;
        var leg1To = sb1.varObj.rtEmailTo;
        expect(leg1Body.indexOf('KW -- caller +32478')).toBe(0);   // header present once

        // Leg 2 reuses the SAME varObj (cross-leg session vars persist).
        var sb2 = makeSandbox({ sendMail: true, configName: 'KW' }, [GUARDS3[1]], sb1.varObj);
        attempt(sb2, STATUS.rejected);

        // Leg 2 render appended after leg 1, and did NOT re-emit the header.
        expect(sb2.varObj.rtEmailBody.indexOf(leg1Body)).toBe(0);
        expect(sb2.varObj.rtEmailBody.indexOf('To: Bob')).toBeGreaterThan(leg1Body.length - 1);
        // Header appears exactly once across both legs.
        var headerCount = sb2.varObj.rtEmailBody.split('KW -- caller +32478').length - 1;
        expect(headerCount).toBe(1);
        // Recipients accumulate across legs.
        expect(sb2.varObj.rtEmailTo).toBe(leg1To + ';bob@x.be');
    });

    it('SMS end-state: lone success skips SMS (per-attempt); email still populated', function () {
        var sb = makeSandbox(
            { sendMail: true, sendSms: true, configName: 'KW' },
            [GUARDS3[0]],
            { ani: '+32478' }
        );
        attempt(sb, STATUS.success);                          // renderReport (id=400) applies the skip
        // Lone guard answered -> renderReport leaves SMS empty for this leg.
        expect(sb.varObj.rtSmsTo).toBe('');
        expect(sb.varObj.rtSmsBody).toBe('');
        // Email is still populated.
        expect(sb.varObj.rtEmailTo).toBe('alice@x.be');
        expect(sb.varObj.rtEmailBody.indexOf('To: Alice')).toBeGreaterThan(-1);
        // prepareMsg footer must not resurrect an SMS body from an empty leg.
        runNode(sb, '200');
        expect(sb.varObj.rtSmsBody).toBe('');
    });

    it('SMS end-state: success guard excluded from rtSmsTo (per-attempt), included in rtEmailTo', function () {
        var sb = makeSandbox(
            { sendMail: true, sendSms: true, configName: 'KW' },
            [GUARDS3[0], GUARDS3[1]],
            { ani: '+32478' }
        );
        attempt(sb, STATUS.noReaction);   // Alice fails
        attempt(sb, STATUS.success);      // Bob answers -> excluded from SMS at render time
        // SMS excludes the success guard's phone (Bob); rendered per-attempt.
        expect(sb.varObj.rtSmsTo).toBe('+3210');
        // SMS body still lists every attempt (shared attempt blocks).
        expect(sb.varObj.rtSmsBody.indexOf('To: Alice')).toBeGreaterThan(-1);
        expect(sb.varObj.rtSmsBody.indexOf('To: Bob')).toBeGreaterThan(-1);
        // Email includes both dialed guards.
        expect(sb.varObj.rtEmailTo).toBe('alice@x.be;bob@x.be');
    });

    it('SMS normal-path equivalence: body = header + attempt blocks (no footer w/o voicemail)', function () {
        var sb = makeSandbox(
            { sendMail: false, sendSms: true, configName: 'KW', recordVoicemail: false },
            [GUARDS3[0], GUARDS3[1]],
            { ani: '+32478' }
        );
        attempt(sb, STATUS.noReaction);
        attempt(sb, STATUS.rejected);
        runNode(sb, '200');
        var legacy = 'KW -- caller +32478\n\n' + sb.__buildAttemptBlocks(sb.__guardLog);
        expect(sb.varObj.rtSmsBody).toBe(legacy);
        expect(sb.varObj.rtSmsTo).toBe('+3210;+3220');
    });
});
