/* ============================================================================
   seed_operations_vocalls_dictionary.sql  --  NALLO_APP.rtds

   Seed the DICTIONARY (catalogue) for every operation TYPE used by the Vocalls
   flows "DIGIPOLIS - LPA_LTSU_GUARD" (sourceId +3257351115) and
   "DIGIPOLIS - LPA_LTSU_GUARD_TUI" (sourceId +3257351122), so those types and
   their configurable attributes are available within RTDS (GUI builder +
   import/export + runtime type resolution).

       SetVariables_vocalls   -- session-variable writer (replaces SetAttributes)
       Guard_vocalls          -- guard / on-call dial-out
       GuardTui_vocalls       -- self-service guard activate/deactivate line
       SendMail_vocalls       -- mail dispatch
       SendSms_vocalls        -- SMS dispatch
       Disconnect_vocalls     -- end the interaction

   NOTE: the operation TYPE names carry a temporary '_vocalls' suffix to avoid
   colliding with existing RTDS operation types during migration. Drop the
   suffix here AND in insert_flow_on_sourceId.sql once the migration settles.

   This is the CATALOGUE counterpart to seed_operations_vocalls.sql (which
   inserts the per-flow Operation/Attribute INSTANCES). It writes ONLY to the
   lookup tables and never touches rtds.Operation or rtds.Attribute:

       rtds.Dic_OperationType
       rtds.Dic_AttributeType   (string | integer | boolean)
       rtds.Dic_Attribute

   ----------------------------------------------------------------------------
   HOW TO USE
   ----------------------------------------------------------------------------
   1. (Optional) edit the catalogue data block in SECTION 1.
   2. Run the whole file once against the NALLO_APP database.
   3. Re-run any time -- idempotent (find-or-create). Existing dictionary rows
      are left untouched; only missing rows are inserted. Nothing is updated or
      deleted, so manual tuning of existing definitions is safe.

   ----------------------------------------------------------------------------
   FIDELITY / CASING  (do not "fix" these)
   ----------------------------------------------------------------------------
   - Type and attribute names are PascalCase, matching the import payload in
     insert_flow_on_sourceId.sql. Types carry the temporary '_vocalls' suffix
     ('SetVariables_vocalls', 'Guard_vocalls', 'SendMail_vocalls',
     'SendSms_vocalls', 'Disconnect_vocalls'); attribute names do not
     ('NextStep_Success', 'SmsAccountId', ...). RTDS dictionary lookups match by
     exact, case-sensitive value, so the dictionary and the payload MUST line up;
     they were reconciled together.
   - The '_vocalls'-suffixed types are intentionally DISTINCT from any existing
     RTDS operation types (e.g. the unsuffixed 'Disconnect' in seed_operations.sql
     or lowercase 'disconnect' in seed_operations_disconnect.sql). Drop the suffix
     on both sides once the migration settles.
   - DataTypes follow the published contract and are NOT altered:
       boolean : Active, DialGuard, RecordVoicemail, AcceptCallMenu,
                 SendSms, SendMail
       integer : ConfigId, Timeout, Priority, SmsAccountId
       string  : everything else (including all NextStep* keys)

   ----------------------------------------------------------------------------
   SETVARIABLES SESSION VARIABLES
   ----------------------------------------------------------------------------
   SetVariables writes named session variables. Although these are conceptually
   dynamic, the import's UNKNOWN_PARAM check validates EVERY param against
   Dic_Attribute, so the variables this flow uses are catalogued explicitly here
   alongside the control keys 'Active' and 'NextStep': 'RoutingId',
   'CustomerName', 'CustomerProject', 'IvrEvent', 'IvrAction'. If another flow
   introduces a new SetVariables variable, add a matching row here or the import
   will THROW 54016 for that key.

   The 'Disconnect' in this contract has Params: {} -- it ends the call and has
   no NextStep. Only the universal 'Active' control flag is seeded by
   convention. A prompt-playing disconnect would additionally expose 'Prompt'
   (and 'ApplicationID'); add those rows if your Disconnect variant plays audio.

   Target: Microsoft SQL Server (T-SQL).
   Convention mirrors seed_operations_guard_mail_sms.sql.
   ============================================================================ */

SET XACT_ABORT ON;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'rtds')
    THROW 60060, 'Schema "rtds" not found. Aborting seed.', 1;
GO

DECLARE @now       datetime2   = SYSUTCDATETIME();
DECLARE @CreatedBy varchar(50) = 'rtds-seed';

BEGIN TRY
BEGIN TRANSACTION;

/* ============================================================================
   SECTION 1 -- THE CATALOGUE (edit here)
   ----------------------------------------------------------------------------
   @Attribute columns:
     OperationType  -> Dic_OperationType.Name (created if missing)
     AttributeName  -> Dic_Attribute.Name
     AttributeType  -> Dic_AttributeType.Name (string | integer | boolean)
     IsRequired     -> caller must supply (1)
     IsNext         -> value is a step id / branch target (NextStep* family)
     IsDisplayed    -> GUI shows the field by default
     IsEditable     -> GUI lets you edit the field by default
   ============================================================================ */

DECLARE @OperationType TABLE (Name varchar(255) NOT NULL PRIMARY KEY);

INSERT INTO @OperationType (Name) VALUES
    ('SetVariables_vocalls'),
    ('Guard_vocalls'),
    ('GuardTui_vocalls'),
    ('SendMail_vocalls'),
    ('SendSms_vocalls'),
    ('Disconnect_vocalls'),
    ('Say_vocalls'),
    ('PlayAudio_vocalls'),
    ('InternalTransfer_vocalls'),
    ('ExternalTransfer_vocalls'),
    /* ---- helpdesk-flow types (DA_HELDPESK + LPA_ICT_HELDPESK) ---- */
    ('PlayPrompt_vocalls'),
    ('PlayAudio_vocalls'),
    ('PlayTts_vocalls'),
    ('Menu_vocalls'),
    ('WorkgroupTransfer_vocalls'),
    ('ExternalTransfer_vocalls'),
    ('Condition_vocalls'),
    ('Emergency_vocalls'),
    ('Schedule_vocalls'),
    ('Callback_vocalls'),
    ('FlowJump_vocalls');

DECLARE @Attribute TABLE (
    OperationType  varchar(255)  NOT NULL,
    AttributeName  varchar(255)  NOT NULL,
    AttributeType  varchar(255)  NOT NULL,
    IsRequired     bit           NOT NULL,
    IsNext         bit           NOT NULL,
    IsDisplayed    bit           NOT NULL,
    IsEditable     bit           NOT NULL,
    PRIMARY KEY (OperationType, AttributeName)
);

INSERT INTO @Attribute
    (OperationType, AttributeName, AttributeType, IsRequired, IsNext, IsDisplayed, IsEditable) VALUES

    /* ---- SetVariables ---- (session-variable writer; replaces SetAttributes)
       The fixed control keys (Active, NextStep) PLUS the session variables this
       flow writes are catalogued so the import's UNKNOWN_PARAM check passes and
       the values are stored. Add new variables here if a flow introduces them.
       Active stays optional (IsRequired = 0) but defaults to TRUE for
       SetVariables: legacy config rarely sets the key and historically always
       wrote, so absent = active here. Only an explicit Active:false skips. The
       dictionary has no default-value column, so the default lives in the
       runtime twin (executeSetVariables, getParam(...,true)) and the component
       (getValue(...,true)) — see rtds/specs/setVariables.spec.md.              */
    ('SetVariables_vocalls', 'Active',           'boolean', 0, 0, 1, 1),
    ('SetVariables_vocalls', 'NextStep',         'string',  1, 1, 1, 1),
    ('SetVariables_vocalls', 'RoutingId',        'string',  0, 0, 1, 1),
    ('SetVariables_vocalls', 'CustomerName',     'string',  0, 0, 1, 1),
    ('SetVariables_vocalls', 'CustomerProject',  'string',  0, 0, 1, 1),
    ('SetVariables_vocalls', 'IvrEvent',         'string',  0, 0, 1, 1),
    ('SetVariables_vocalls', 'IvrAction',        'string',  0, 0, 1, 1),
    ('SetVariables_vocalls', 'LogAttributes',    'string',  0, 0, 1, 1),

    /* ---- Guard ---- (guard / on-call dial-out)                                */
    ('Guard_vocalls', 'Active',            'boolean', 1, 0, 1, 1),
    ('Guard_vocalls', 'ConfigId',          'integer', 1, 0, 1, 1),
    ('Guard_vocalls', 'ConfigName',        'string',  1, 0, 1, 1),
    ('Guard_vocalls', 'DialGuard',         'boolean', 1, 0, 1, 1),
    ('Guard_vocalls', 'OutboundAni',       'string',  1, 0, 1, 1),
    ('Guard_vocalls', 'Diversion',         'string',  1, 0, 1, 1),
    ('Guard_vocalls', 'OnHoldAudioUrl',    'string',  1, 0, 1, 1),
    ('Guard_vocalls', 'Timeout',           'integer', 1, 0, 1, 1),
    ('Guard_vocalls', 'RecordVoicemail',   'boolean', 1, 0, 1, 1),
    ('Guard_vocalls', 'AcceptCallMenu',    'boolean', 1, 0, 1, 1),
    ('Guard_vocalls', 'AcceptCallMessage', 'string',  1, 0, 1, 1),
    ('Guard_vocalls', 'SendSms',           'boolean', 1, 0, 1, 1),
    ('Guard_vocalls', 'SendMail',          'boolean', 1, 0, 1, 1),
    ('Guard_vocalls', 'NextStep',          'string',  1, 1, 1, 1),
    ('Guard_vocalls', 'NextStep_Success',  'string',  1, 1, 1, 1),
    ('Guard_vocalls', 'NextStep_Failure',  'string',  1, 1, 1, 1),

    /* ---- GuardTUI ---- (self-service guard activate/deactivate line)
       Factored from rtds/components/guardTui.js (__configJSON
       + say nodes). The six spoken slots (Prompt, Result*) are plain text params
       here; multi-language via TtsMessages is deferred. ConfigName is carried for
       parity with the flow header but is not consumed by the component.          */
    ('GuardTui_vocalls', 'Active',             'boolean', 0, 0, 1, 1),
    ('GuardTui_vocalls', 'ConfigId',           'integer', 1, 0, 1, 1),
    ('GuardTui_vocalls', 'ConfigName',         'string',  0, 0, 1, 1),
    ('GuardTui_vocalls', 'PhoneNumberVar',     'string',  0, 0, 1, 1),
    ('GuardTui_vocalls', 'Timeout',            'integer', 0, 0, 1, 1),
    ('GuardTui_vocalls', 'Prompt',             'string',  1, 0, 1, 1),
    ('GuardTui_vocalls', 'ResultActivated',    'string',  1, 0, 1, 1),
    ('GuardTui_vocalls', 'ResultDeactivated',  'string',  1, 0, 1, 1),
    ('GuardTui_vocalls', 'ResultOnlyActive',   'string',  1, 0, 1, 1),
    ('GuardTui_vocalls', 'ResultDenied',       'string',  1, 0, 1, 1),
    ('GuardTui_vocalls', 'ResultError',        'string',  1, 0, 1, 1),
    ('GuardTui_vocalls', 'NextStep',           'string',  1, 1, 1, 1),
    ('GuardTui_vocalls', 'NextStep_Success',   'string',  1, 1, 1, 1),
    ('GuardTui_vocalls', 'NextStep_Denied',    'string',  1, 1, 1, 1),
    ('GuardTui_vocalls', 'NextStep_Failure',   'string',  1, 1, 1, 1),

    /* ---- SendMail ---- (mail dispatch)
       Cc / Bcc : semicolon lists; Priority 1 high / 2 normal / 3 low;
       Files    : semicolon URL list; Timeout : HTTP timeout (ms).               */
    ('SendMail_vocalls', 'Active',           'boolean', 0, 0, 1, 1),
    ('SendMail_vocalls', 'Subject',          'string',  1, 0, 1, 1),
    ('SendMail_vocalls', 'From',             'string',  1, 0, 1, 1),
    ('SendMail_vocalls', 'To',               'string',  1, 0, 1, 1),
    ('SendMail_vocalls', 'Cc',               'string',  0, 0, 1, 1),
    ('SendMail_vocalls', 'Bcc',              'string',  0, 0, 1, 1),
    ('SendMail_vocalls', 'Body',             'string',  1, 0, 1, 1),
    ('SendMail_vocalls', 'Priority',         'integer', 0, 0, 1, 1),
    ('SendMail_vocalls', 'Files',            'string',  0, 0, 1, 1),
    ('SendMail_vocalls', 'AttachmentNames',  'string',  0, 0, 1, 1),
    ('SendMail_vocalls', 'AttachmentData',   'string',  0, 0, 1, 1),
    ('SendMail_vocalls', 'CustomerKey',      'string',  0, 0, 1, 1),
    ('SendMail_vocalls', 'Timeout',          'integer', 0, 0, 1, 1),
    ('SendMail_vocalls', 'NextStep',         'string',  1, 1, 1, 1),
    ('SendMail_vocalls', 'NextStep_Success', 'string',  1, 1, 1, 1),
    ('SendMail_vocalls', 'NextStep_Failure', 'string',  1, 1, 1, 1),

    /* ---- SendSms ---- (SMS dispatch)
       SmsAccountId : numeric SMS account id; Timeout : HTTP timeout (ms).        */
    ('SendSms_vocalls', 'Active',           'boolean', 0, 0, 1, 1),
    ('SendSms_vocalls', 'SmsAccountId',     'integer', 1, 0, 1, 1),
    ('SendSms_vocalls', 'Routing',          'string',  0, 0, 1, 1),
    ('SendSms_vocalls', 'From',             'string',  1, 0, 1, 1),
    ('SendSms_vocalls', 'To',               'string',  1, 0, 1, 1),
    ('SendSms_vocalls', 'Body',             'string',  1, 0, 1, 1),
    ('SendSms_vocalls', 'Timeout',          'integer', 0, 0, 1, 1),
    ('SendSms_vocalls', 'NextStep',         'string',  1, 1, 1, 1),
    ('SendSms_vocalls', 'NextStep_Success', 'string',  1, 1, 1, 1),
    ('SendSms_vocalls', 'NextStep_Failure', 'string',  1, 1, 1, 1),

    /* ---- Disconnect ---- (ends the interaction)
       Params: {} in this contract -> no NextStep. Only the universal 'Active'
       control flag is catalogued by default. The helpdesk flows have a
       prompt-playing disconnect variant (e.g. 'RTDS: MaxQueue Disconnect',
       'RTDS: IVR Error'), so 'Prompt' and 'ApplicationId' are catalogued too.    */
    ('Disconnect_vocalls', 'Active',         'boolean', 0, 0, 1, 1),
    ('Disconnect_vocalls', 'Prompt',         'string',  0, 0, 1, 1),
    ('Disconnect_vocalls', 'ApplicationId',  'integer', 0, 0, 1, 1),

    /* ========================================================================
       HELPDESK-FLOW TYPES  (DA_HELDPESK +3233387777, LPA_ICT_HELDPESK +3233389999)
       ------------------------------------------------------------------------
       Attribute names and DataTypes are factored from the legacy source params.
       NOTE on 'ApplicationId': the importer special-cases a param literally
       named 'Application' -> attribute 'ApplicationID' (resolved to an integer
       id). The helpdesk flows instead use the literal key 'ApplicationId', so it
       is catalogued here verbatim as a plain integer attribute (no resolution).
       If you switch the flows to the resolving 'Application' form, drop these
       'ApplicationId' rows and rely on the importer's built-in 'ApplicationID'.
       NOTE on dynamic branch keys: 'Menu' uses per-choice 'NextStep_<digit>' and
       'Schedule' uses 'NextStep_Guard_<name>'. The dictionary is exact-match, so
       only the suffixes seen in these two flows are seeded. A new choice digit or
       guard name needs a matching row or the import THROWs 54016 for that key.
       Runtime status (rtds_2_runtime.js): PlayPrompt/PlayAudio/Menu/Workgroup-
       Transfer/ExternalTransfer/Callback have GUI-exit keys registered;
       Condition/Emergency/Schedule/FlowJump are NOT yet registered (runtime will
       skip to NextStep). Cataloguing here unblocks the IMPORT; wiring the
       unregistered four is separate work.
       ======================================================================== */

    /* ---- PlayPrompt ---- (TTS / prompt-library playback)                       */
    ('PlayPrompt_vocalls', 'Active',         'boolean', 0, 0, 1, 1),
    ('PlayPrompt_vocalls', 'ApplicationId',  'integer', 0, 0, 1, 1),
    ('PlayPrompt_vocalls', 'Prompt',         'string',  1, 0, 1, 1),
    ('PlayPrompt_vocalls', 'NextStep',       'string',  1, 1, 1, 1),

    /* ---- PlayAudio ---- (named audio-source playback)                          */
    ('PlayAudio_vocalls', 'Active',          'boolean', 0, 0, 1, 1),
    ('PlayAudio_vocalls', 'AudioSource',     'string',  1, 0, 1, 1),
    ('PlayAudio_vocalls', 'Timeout',         'integer', 0, 0, 1, 1),
    ('PlayAudio_vocalls', 'NextStep',        'string',  1, 1, 1, 1),

    /* ---- Menu ---- (DTMF menu; per-choice NextStep_<digit> branches)           */
    ('Menu_vocalls', 'Active',                  'boolean', 0, 0, 1, 1),
    ('Menu_vocalls', 'ApplicationId',           'integer', 0, 0, 1, 1),
    ('Menu_vocalls', 'StaticPrompt',            'string',  0, 0, 1, 1),
    ('Menu_vocalls', 'Timeout',                 'integer', 0, 0, 1, 1),
    ('Menu_vocalls', 'MaxTries',                'integer', 0, 0, 1, 1),
    ('Menu_vocalls', 'NextStep_0',              'string',  0, 1, 1, 1),
    ('Menu_vocalls', 'NextStep_DefaultChoice',  'string',  0, 1, 1, 1),
    ('Menu_vocalls', 'NextStep',                'string',  1, 1, 1, 1),

    /* ---- WorkgroupTransfer ---- (queue to an ACD workgroup)                    */
    ('WorkgroupTransfer_vocalls', 'Active',             'boolean', 0, 0, 1, 1),
    ('WorkgroupTransfer_vocalls', 'QueueName',          'string',  1, 0, 1, 1),
    ('WorkgroupTransfer_vocalls', 'Skills',             'string',  0, 0, 1, 1),
    ('WorkgroupTransfer_vocalls', 'Priority',           'integer', 0, 0, 1, 1),
    ('WorkgroupTransfer_vocalls', 'EscapeKey',          'integer', 0, 0, 1, 1),
    ('WorkgroupTransfer_vocalls', 'NextStep_EscapeKey', 'string',  0, 1, 1, 1),
    ('WorkgroupTransfer_vocalls', 'NextStep',           'string',  1, 1, 1, 1),

    /* ---- ExternalTransfer ---- (transfer to an external phone number)          */
    ('ExternalTransfer_vocalls', 'Active',              'boolean', 0, 0, 1, 1),
    ('ExternalTransfer_vocalls', 'PhoneNumber',         'string',  1, 0, 1, 1),
    ('ExternalTransfer_vocalls', 'OutboundANI',         'string',  0, 0, 1, 1),
    ('ExternalTransfer_vocalls', 'PerformCallAnalysis', 'string',  0, 0, 1, 1),
    ('ExternalTransfer_vocalls', 'DiversionReason',     'integer', 0, 0, 1, 1),
    ('ExternalTransfer_vocalls', 'Timeout',             'integer', 0, 0, 1, 1),
    ('ExternalTransfer_vocalls', 'NextStep_Busy',       'string',  0, 1, 1, 1),
    ('ExternalTransfer_vocalls', 'NextStep_RNA',        'string',  0, 1, 1, 1),
    ('ExternalTransfer_vocalls', 'NextStep',            'string',  1, 1, 1, 1),

    /* ---- Condition ---- (branch on an ACD statistic; NOT yet runtime-wired)    */
    ('Condition_vocalls', 'Active',          'boolean', 0, 0, 1, 1),
    ('Condition_vocalls', 'Statistic',       'string',  1, 0, 1, 1),
    ('Condition_vocalls', 'Workgroup',       'string',  1, 0, 1, 1),
    ('Condition_vocalls', 'Operator',        'string',  1, 0, 1, 1),
    ('Condition_vocalls', 'Value',           'string',  1, 0, 1, 1),
    ('Condition_vocalls', 'NextStep_True',   'string',  1, 1, 1, 1),
    ('Condition_vocalls', 'NextStep_False',  'string',  1, 1, 1, 1),

    /* ---- Emergency ---- (emergency-prompt check; NOT yet runtime-wired)        */
    ('Emergency_vocalls', 'Active',               'boolean', 0, 0, 1, 1),
    ('Emergency_vocalls', 'EmergencyId',          'string',  1, 0, 1, 1),
    ('Emergency_vocalls', 'NextStep_Transfer',    'string',  0, 1, 1, 1),
    ('Emergency_vocalls', 'NextStep_Disconnect',  'string',  0, 1, 1, 1),
    ('Emergency_vocalls', 'NextStep_Continue',    'string',  0, 1, 1, 1),
    ('Emergency_vocalls', 'NextStep_Failure',     'string',  0, 1, 1, 1),
    ('Emergency_vocalls', 'NextStep',             'string',  1, 1, 1, 1),

    /* ---- Schedule ---- (open/closed/guard routing; NOT yet runtime-wired.
       Component checkSchedule.js exists. Guard branches are per-flow:
       Guard_ICT (LPA_ICT), Guard_Klantwacht/Guard_Systeemwacht (DA).)            */
    ('Schedule_vocalls', 'Active',                       'boolean', 0, 0, 1, 1),
    ('Schedule_vocalls', 'ApplicationId',                'integer', 0, 0, 1, 1),
    ('Schedule_vocalls', 'ScheduleID',                   'integer', 1, 0, 1, 1),
    ('Schedule_vocalls', 'NextStep_Open',                'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep_Closed',              'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep_Transfer',            'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep_Guard_ICT',           'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep_Guard_Klantwacht',    'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep_Guard_Systeemwacht',  'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep_Failure',             'string',  0, 1, 1, 1),
    ('Schedule_vocalls', 'NextStep',                     'string',  1, 1, 1, 1),

    /* ---- Callback ---- (queue callback; DA_HELDPESK only)                      */
    ('Callback_vocalls', 'Active',               'boolean', 0, 0, 1, 1),
    ('Callback_vocalls', 'ConfigId',             'integer', 1, 0, 1, 1),
    ('Callback_vocalls', 'CallbackOnANI',        'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'ANIConfirmation',      'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'AllowManualInput',     'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'ManualInputRetries',   'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'LocationFilter',       'string',  0, 0, 1, 1),
    ('Callback_vocalls', 'ANIClassifications',   'string',  0, 0, 1, 1),
    ('Callback_vocalls', 'ANIAttribute',         'string',  0, 0, 1, 1),
    ('Callback_vocalls', 'CustomSkills',         'string',  0, 0, 1, 1),
    ('Callback_vocalls', 'InheritSkills',        'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'CustomPriority',       'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'InheritPriority',      'integer', 0, 0, 1, 1),
    ('Callback_vocalls', 'PromptFolder',         'string',  0, 0, 1, 1),
    ('Callback_vocalls', 'Workgroup',            'string',  0, 0, 1, 1),
    ('Callback_vocalls', 'NextStep_Accepted',    'string',  0, 1, 1, 1),
    ('Callback_vocalls', 'NextStep_Rejected',    'string',  0, 1, 1, 1),
    ('Callback_vocalls', 'NextStep_Failure',     'string',  0, 1, 1, 1),
    ('Callback_vocalls', 'NextStep',             'string',  1, 1, 1, 1),

    /* ---- FlowJump ---- (jump to another routing table by SourceId; NOT yet
       runtime-wired. Only the target SourceId is carried.)                       */
    ('FlowJump_vocalls', 'Active',           'boolean', 0, 0, 1, 1),
    ('FlowJump_vocalls', 'SourceId',         'string',  1, 0, 1, 1);

/* ============================================================================
   SECTION 2 -- SEED THE DICTIONARY (no need to edit below this line)
   ============================================================================ */

IF EXISTS (
    SELECT 1 FROM @Attribute a
    WHERE NOT EXISTS (SELECT 1 FROM @OperationType o WHERE o.Name = a.OperationType)
)
    THROW 60061, 'An @Attribute.OperationType has no matching @OperationType.Name.', 1;

DECLARE @opTypeNew   int = 0;
DECLARE @attrTypeNew int = 0;
DECLARE @attrNew     int = 0;

/* -- 1. find-or-create Dic_OperationType ------------------------------------ */
INSERT INTO rtds.Dic_OperationType (Name, DateCreated, CreatedBy)
SELECT o.Name, @now, @CreatedBy
FROM   @OperationType o
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_OperationType d WHERE d.Name = o.Name);
SET @opTypeNew = @@ROWCOUNT;

/* -- 2. find-or-create Dic_AttributeType (string / integer / boolean) ------- */
INSERT INTO rtds.Dic_AttributeType (Name, DateCreated, CreatedBy)
SELECT DISTINCT a.AttributeType, @now, @CreatedBy
FROM   @Attribute a
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_AttributeType d WHERE d.Name = a.AttributeType);
SET @attrTypeNew = @@ROWCOUNT;

/* -- 3. find-or-create Dic_Attribute (per operation type + attribute name) -- */
INSERT INTO rtds.Dic_Attribute
    (DicOperationTypeID, DicAttributeTypeID, Name,
     IsRequired, IsNext, IsDisplayed, IsEditable, DateCreated, CreatedBy)
SELECT ot.DicOperationTypeID,
       at.DicAttributeTypeID,
       a.AttributeName,
       a.IsRequired, a.IsNext, a.IsDisplayed, a.IsEditable,
       @now, @CreatedBy
FROM   @Attribute a
JOIN   rtds.Dic_OperationType ot ON ot.Name = a.OperationType
JOIN   rtds.Dic_AttributeType at ON at.Name = a.AttributeType
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_Attribute d
    WHERE  d.DicOperationTypeID = ot.DicOperationTypeID
    AND    d.Name               = a.AttributeName);
SET @attrNew = @@ROWCOUNT;

COMMIT TRANSACTION;

PRINT 'RTDS vocalls dictionary seed complete.';
PRINT '  Dic_OperationType rows inserted: ' + CAST(@opTypeNew   AS varchar(10));
PRINT '  Dic_AttributeType rows inserted: ' + CAST(@attrTypeNew AS varchar(10));
PRINT '  Dic_Attribute     rows inserted: ' + CAST(@attrNew     AS varchar(10));
PRINT '  (0 inserted on a column means it was already fully seeded.)';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

/* ============================================================================
   SECTION 3 -- VERIFY (optional, read-only; run after seeding)
   ============================================================================ */
/*
SELECT  ot.Name                              AS OperationType,
        da.Name                              AS Attribute,
        at.Name                              AS DataType,
        da.IsRequired, da.IsNext, da.IsDisplayed, da.IsEditable
FROM    rtds.Dic_OperationType ot
JOIN    rtds.Dic_Attribute     da ON da.DicOperationTypeID = ot.DicOperationTypeID
JOIN    rtds.Dic_AttributeType at ON at.DicAttributeTypeID = da.DicAttributeTypeID
WHERE   ot.Name IN ('SetVariables_vocalls', 'Guard_vocalls', 'GuardTui_vocalls', 'SendMail_vocalls', 'SendSms_vocalls', 'Disconnect_vocalls')
ORDER BY ot.Name, da.IsNext, da.Name;
*/
