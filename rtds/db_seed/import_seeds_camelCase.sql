-- format-disabled: hand-aligned VALUES tuples + box comments. Do NOT auto-format.
-- (Enforced by .vscode/settings.json: format-on-save off for [sql].)
/* ============================================================================
   CAMELCASE CONTRACT VARIANT -- generated from the PascalCase originals.

   This file is one of THREE that together define a camelCase RTDS contract
   and MUST be used as a set (mixing with the PascalCase scripts will fail
   dictionary lookups):
       import_seeds_camelCase.sql
       import_flow_from_json_camelCase.sql
       export_flow_to_json_camelCase.sql

   Casing rule: lower-camelCase for every JSON key (header + operation fields),
   every operation TYPE value, and every attribute/param NAME. A single leading
   capital is lower-cased; a leading run of capitals (acronym) is fully
   lower-cased except the capital that begins the next word. So
   'NextStep_Success'->'nextStep_Success', 'SetVariables'->
   'setVariables', 'ANIConfirmation'->'aniConfirmation',
   'OutboundANI'->'outboundANI'. DB column names, language keys (NL/FR),
   datatype names (string/int/bit) and runtime ${...} tokens are NOT changed.
   ============================================================================ */

/* ============================================================================
   import_seeds_camelCase.sql  --  NALLO_APP.rtds

   Seed the DICTIONARY (catalogue) for every operation TYPE used by the Vocalls
   flows "DIGIPOLIS - LPA_LTSU_GUARD" (sourceId +3257351115) and
   "DIGIPOLIS - LPA_LTSU_GUARD_TUI" (sourceId +3257351122), so those types and
   their configurable attributes are available within RTDS (GUI builder +
   import/export + runtime type resolution).

       setVariables   -- session-variable writer (replaces SetAttributes)
       guard          -- guard / on-call dial-out
       guardTui       -- self-service guard activate/deactivate line
       sendMail       -- mail dispatch
       sendSms        -- SMS dispatch
       disconnect     -- end the interaction

   NOTE: the operation TYPE names are camelCase and suffix-free. They formerly
   carried a temporary '_vocalls' suffix to avoid colliding with existing RTDS
   operation types during migration; the migration has settled and the suffix
   was dropped here AND in insert_flow_on_sourceId.sql.

   This is the CATALOGUE counterpart to seed_operations_vocalls.sql (which
   inserts the per-flow Operation/Attribute INSTANCES). It writes ONLY to the
   lookup tables and never touches rtds.Operation or rtds.Attribute:

       rtds.Dic_OperationType       (SECTION 0 fixed IDs + SECTION 2 by-name)
       rtds.Dic_PromptApplication   (SECTION 0, fixed IDs)
       rtds.Dic_PromptLanguage      (SECTION 0, fixed IDs)
       rtds.Dic_AttributeType       (string | int | bit)
       rtds.Dic_Attribute

   ----------------------------------------------------------------------------
   HOW TO USE
   ----------------------------------------------------------------------------
   1. (Optional) edit the catalogue data block in SECTION 1.
   2. Run the whole file once against the NALLO_APP database.
   3. Re-run any time -- idempotent (find-or-create + sync). Missing catalogue
      rows are inserted. Existing Dic_Attribute rows for types in SECTION 1 are
      updated when DataType or GUI flags drift from the seed. Rows outside this
      seed's @OperationType list are never touched. Nothing is deleted.

   ----------------------------------------------------------------------------
   FIDELITY / CASING  (do not "fix" these)
   ----------------------------------------------------------------------------
   - Type and attribute names are camelCase, matching the import payload in
     insert_flow_on_sourceId.sql. Types are suffix-free ('setVariables', 'guard',
     'sendMail', 'sendSms', 'disconnect'); attribute names follow the same rule
     ('nextStep_Success', 'smsAccountId', ...). RTDS dictionary lookups match by
     exact, case-sensitive value, so the dictionary and the payload MUST line up;
     they were reconciled together.
   - These camelCase types are intentionally DISTINCT from the legacy PascalCase
     RTDS operation types (e.g. 'Disconnect' in seed_operations.sql). SECTION 0
     seeds them at the production IDs via IDENTITY_INSERT so data-table FKs
     resolve; SECTION 1/2 re-assert them by name (idempotent).
   - DataTypes follow the published contract and are NOT altered:
       bit    : active, dialGuard, recordVoicemail, acceptCallMenu,
                sendSms, sendMail
       int    : configId, timeout, priority, smsAccountId
       string : everything else (including all nextStep* keys)

   ----------------------------------------------------------------------------
   SETVARIABLES SESSION VARIABLES
   ----------------------------------------------------------------------------
   SetVariables writes named session variables. Although these are conceptually
   dynamic, the import's UNKNOWN_PARAM check validates EVERY param against
   Dic_Attribute, so the variables this flow uses are catalogued explicitly here
   alongside the control keys 'active' and 'nextStep': 'routingId',
   'isHelpdeskCall', 'iVREvent', dotted paths like 'auth.verified', plus flow
   keys 'customerName', 'customerProject', 'ivrEvent', 'ivrAction'. If another flow
   introduces a new SetVariables variable, add a matching row here or the import
   will THROW 54016 for that key.

   The 'disconnect' in this contract has Params: {} -- it ends the call and has
   no nextStep. Only the universal 'active' control flag is seeded by
   convention. A prompt-playing disconnect would additionally expose 'prompt'
   (and 'applicationId'); add those rows if your Disconnect variant plays audio.

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
   SECTION 0 -- STRUCTURAL DICTIONARIES (OperationType / PromptApplication /
                PromptLanguage)
   ----------------------------------------------------------------------------
   Seeds the three self-contained lookup tables that carry no FK into the data
   tables and do not reference each other. Reworked from the PascalCase
   production seed (seed_rtds_dictionaries_minimal.sql, May 2026 snapshot) into
   this camelCase contract: every operation TYPE Name is camelCased and the
   temporary '_vocalls' suffix is dropped (SetAttributes -> setVariables,
   PlayPrompt -> playPrompt, Schedule -> checkSchedule, GuardTUI -> guardTui,
   SendSMS -> sendSms, RESTGet -> restGet, ...). Prompt-application names and
   language keys (NL/FR/...) are DATA, not type strings -- left verbatim, like
   the language keys elsewhere in this file.

   SET IDENTITY_INSERT preserves the production IDs exactly so existing FKs from
   the data tables (Operation.DicOperationTypeID, Prompt.DicPromptApplicationID
   / DicPromptLanguageID) keep resolving. INSERT ... WHERE NOT EXISTS BY ID is
   idempotent: existing rows (matched by ID) are left untouched, missing rows
   are inserted. Nothing here is deleted (no @clearFirst path -- this file is
   purely additive).

   NOTE: SECTION 1/2 below ALSO find-or-create Dic_OperationType BY NAME (without
   IDENTITY_INSERT). That is harmless and idempotent: the camelCase names seeded
   here already exist by the time SECTION 2 runs, so its INSERT ... WHERE NOT
   EXISTS matches them and inserts nothing.
   ============================================================================ */

PRINT 'Seeding rtds.Dic_OperationType (camelCase contract) ...';

SET IDENTITY_INSERT rtds.Dic_OperationType ON;

INSERT INTO rtds.Dic_OperationType ([DicOperationTypeID], [Name], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
SELECT v.* FROM (VALUES
  (1,  N'setVariables',        N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (2,  N'playPrompt',          N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (3,  N'languageMenu',        N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (4,  N'checkSchedule',       N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (5,  N'emergency',           N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (21, N'guardRouting',        N'2022-04-20 11:47:56.5100000', N'GDG546',        NULL, NULL),
  (7,  N'menu',                N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (22, N'guardTui',            N'2022-04-20 11:48:35.3830000', N'GDG546',        NULL, NULL),
  (9,  N'workgroupTransfer',   N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (10, N'externalTransfer',    N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (11, N'guard',               N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (12, N'disconnect',          N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (13, N'playAudio',           N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (14, N'condition',           N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (15, N'skillUpdate',         N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (16, N'flowJump',            N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (17, N'restRequest',         N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (18, N'callerDataEntry',     N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (19, N'voicemailCallback',   N'2021-06-30 11:07:51.4330000', N'N-ALLO\EEN503', NULL, NULL),
  (20, N'callback',            N'2021-10-29 12:02:57.5000000', N'N-ALLO\GDG546', NULL, NULL),
  (23, N'sendSms',             N'2022-04-20 11:48:39.7930000', N'GDG546',        NULL, NULL),
  (24, N'sendEmail',           N'2022-04-20 11:48:43.1100000', N'GDG546',        NULL, NULL),
  (25, N'restGet',             N'2023-09-27 12:05:14.2930000', N'RZ6189',        NULL, NULL),
  (26, N'checkAttribute',      N'2023-11-27 15:42:49.9300000', N'GDG546',        NULL, NULL),
  (27, N'manageCallCapacity',  N'2025-03-11 12:52:49.2470000', N'GDG546',        NULL, NULL)
) AS v([DicOperationTypeID], [Name], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
WHERE NOT EXISTS (
    SELECT 1 FROM rtds.Dic_OperationType t WHERE t.[DicOperationTypeID] = v.[DicOperationTypeID]
);

SET IDENTITY_INSERT rtds.Dic_OperationType OFF;

PRINT 'Seeding rtds.Dic_PromptApplication ...';

SET IDENTITY_INSERT rtds.Dic_PromptApplication ON;

INSERT INTO rtds.Dic_PromptApplication ([DicPromptApplicationID], [Name], [FilePrefix], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
SELECT v.* FROM (VALUES
  (1,  N'Scheduler',     N'Scheduler', N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503', NULL, NULL),
  (2,  N'Callback',      N'CB',        N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503', NULL, NULL),
  (3,  N'Survey',        N'Survey',    N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503', NULL, NULL),
  (4,  N'PreQueue',      N'PreQueue',  N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503', NULL, NULL),
  (5,  N'Queue',         N'Queue',     N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503', NULL, NULL),
  (6,  N'AdHocMessages', N'AdHoc',     N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503', NULL, NULL),
  (7,  N'Menu',          N'Menu',      N'2021-07-23 11:26:02.6600000', N'N-ALLO\RZ6189', NULL, NULL),
  (12, N'Voicemail',     N'Voicemail', N'2021-11-09 14:02:36.2930000', N'N-ALLO\GDG546', NULL, NULL),
  (11, N'Welcome',       N'Welcome',   N'2021-10-22 11:49:45.7700000', N'N-ALLO\GDG546', NULL, NULL),
  (13, N'Info',          N'Info',      N'2021-11-22 15:52:00.6030000', N'N-ALLO\GDG546', NULL, NULL),
  (14, N'Exception',     N'Exception', N'2021-11-29 12:19:10.1300000', N'N-ALLO\GDG546', NULL, NULL),
  (15, N'Emergency',     N'Emergency', N'2022-06-09 09:35:39.9470000', N'GDG546',        NULL, NULL)
) AS v([DicPromptApplicationID], [Name], [FilePrefix], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
WHERE NOT EXISTS (
    SELECT 1 FROM rtds.Dic_PromptApplication t WHERE t.[DicPromptApplicationID] = v.[DicPromptApplicationID]
);

SET IDENTITY_INSERT rtds.Dic_PromptApplication OFF;

PRINT 'Seeding rtds.Dic_PromptLanguage ...';

SET IDENTITY_INSERT rtds.Dic_PromptLanguage ON;

INSERT INTO rtds.Dic_PromptLanguage ([DicPromptLanguageID], [Key], [Language], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
SELECT v.* FROM (VALUES
  (1, N'NL', N'Dutch',       N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503',     NULL,                            NULL),
  (2, N'FR', N'French',      N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503',     NULL,                            NULL),
  (3, N'EN', N'English',     N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503',     NULL,                            NULL),
  (4, N'DE', N'German',      N'2021-06-30 11:08:13.6400000', N'N-ALLO\EEN503',     NULL,                            NULL),
  (6, N'TF', N'TTS French',  N'2026-05-19 17:07:39.9500000', N'IJG577@engie.com',  N'2026-05-19 17:07:53.2966667',  N'IJG577@engie.com')
) AS v([DicPromptLanguageID], [Key], [Language], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
WHERE NOT EXISTS (
    SELECT 1 FROM rtds.Dic_PromptLanguage t WHERE t.[DicPromptLanguageID] = v.[DicPromptLanguageID]
);

SET IDENTITY_INSERT rtds.Dic_PromptLanguage OFF;

/* ============================================================================
   SECTION 1 -- THE CATALOGUE (edit here)
   ----------------------------------------------------------------------------
   @Attribute columns:
     OperationType  -> Dic_OperationType.Name (created if missing)
     AttributeName  -> Dic_Attribute.Name
     AttributeType  -> Dic_AttributeType.Name (string | int | bit)
     IsRequired     -> caller must supply (1)
     IsNext         -> value is a step id / branch target (NextStep* family)
     IsDisplayed    -> GUI shows the field by default
     IsEditable     -> GUI lets you edit the field by default
   ============================================================================ */

DECLARE @OperationType TABLE (Name varchar(255) NOT NULL PRIMARY KEY);

INSERT INTO @OperationType (Name) VALUES
    ('setVariables'),
    ('guard'),
    ('guardTui'),
    ('sendMail'),
    ('sendSms'),
    ('disconnect'),

    /* ---- helpdesk-flow types (DA_HELDPESK + LPA_ICT_HELDPESK) ---- */
    ('playAudio'),
    ('externalTransfer'),
    ('playPrompt'),
    ('menu'),
    ('workgroupTransfer'),

    ('condition'),
    ('emergency'),
    ('checkSchedule'),
    ('callback'),
    ('flowJump');

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
       The fixed control keys (active, nextStep) PLUS the session variables this
       flow writes are catalogued so the import's UNKNOWN_PARAM check passes and
       the values are stored. Add new variables here if a flow introduces them.
       active stays optional (IsRequired = 0) but defaults to TRUE for
       SetVariables: legacy config rarely sets the key and historically always
       wrote, so absent = active here. Only an explicit active:false skips. The
       dictionary has no default-value column, so the default lives in the
       runtime twin (executeSetVariables, getParam(...,true)) and the component
       (getValue(...,true)) — see rtds/specs/setVariables.spec.md.              */
    ('setVariables', 'active',           'bit', 0, 0, 1, 1),
    ('setVariables', 'nextStep',         'string',  1, 1, 1, 1),
    ('setVariables', 'routingId',        'string',  0, 0, 1, 1),
    ('setVariables', 'customerName',     'string',  0, 0, 1, 1),
    ('setVariables', 'customerProject',  'string',  0, 0, 1, 1),
    ('setVariables', 'ivrEvent',         'string',  0, 0, 1, 1),
    ('setVariables', 'ivrAction',        'string',  0, 0, 1, 1),
    ('setVariables', 'logAttributes',    'string',  0, 0, 1, 1),

    /* ---- Guard ---- (guard / on-call dial-out)                                */
    ('guard', 'active',            'bit', 1, 0, 1, 1),
    ('guard', 'configId',          'int', 1, 0, 1, 1),
    ('guard', 'configName',        'string',  1, 0, 1, 1),
    ('guard', 'dialGuard',         'bit', 1, 0, 1, 1),
    ('guard', 'outboundAni',       'string',  1, 0, 1, 1),
    ('guard', 'diversion',         'string',  1, 0, 1, 1),
    ('guard', 'onHoldAudioUrl',    'string',  1, 0, 1, 1),
    ('guard', 'timeout',           'int', 1, 0, 1, 1),
    ('guard', 'recordVoicemail',   'bit', 1, 0, 1, 1),
    ('guard', 'acceptCallMenu',    'bit', 1, 0, 1, 1),
    ('guard', 'acceptCallMessage', 'string',  1, 0, 1, 1),
    ('guard', 'sendSms',           'bit', 1, 0, 1, 1),
    ('guard', 'sendMail',          'bit', 1, 0, 1, 1),
    ('guard', 'nextStep',          'string',  1, 1, 1, 1),
    ('guard', 'nextStep_Success',  'string',  1, 1, 1, 1),
    ('guard', 'nextStep_Failure',  'string',  1, 1, 1, 1),

    /* ---- GuardTUI ---- (self-service guard activate/deactivate line)
       Factored from rtds/samples/sourceCode_guardTui.js (__configJSON + say
       nodes). Spoken slots are per-language Params (e.g. promptActivate_NL);
       the component resolves getValue(__rtParams, base + '_' + language).
       configName is carried for parity with the flow header but is not consumed
       by the component. Add *_FR / *_DE rows when a flow supports more langs.   */
    ('guardTui', 'active',                       'bit', 0, 0, 1, 1),
    ('guardTui', 'configId',                     'int', 1, 0, 1, 1),
    ('guardTui', 'configName',                   'string',  0, 0, 1, 1),
    ('guardTui', 'phoneNumberVar',               'string',  0, 0, 1, 1),
    ('guardTui', 'timeout',                      'int', 0, 0, 1, 1),
    ('guardTui', 'resultCurrentlyActivated_NL',  'string',  1, 0, 1, 1),
    ('guardTui', 'resultCurrentlyDeactivated_NL','string',  1, 0, 1, 1),
    ('guardTui', 'promptActivate_NL',            'string',  1, 0, 1, 1),
    ('guardTui', 'promptDeactivate_NL',          'string',  1, 0, 1, 1),
    ('guardTui', 'resultActivated_NL',           'string',  1, 0, 1, 1),
    ('guardTui', 'resultDeactivated_NL',         'string',  1, 0, 1, 1),
    ('guardTui', 'resultOnlyActive_NL',          'string',  1, 0, 1, 1),
    ('guardTui', 'resultDenied_NL',              'string',  1, 0, 1, 1),
    ('guardTui', 'resultError_NL',               'string',  1, 0, 1, 1),
    ('guardTui', 'nextStep',           'string',  1, 1, 1, 1),
    ('guardTui', 'nextStep_Success',   'string',  1, 1, 1, 1),
    ('guardTui', 'nextStep_Denied',    'string',  1, 1, 1, 1),
    ('guardTui', 'nextStep_Failure',   'string',  1, 1, 1, 1),

    /* ---- SendMail ---- (mail dispatch)
       cc / bcc : semicolon lists; priority 1 high / 2 normal / 3 low;
       files    : semicolon URL list; timeout : HTTP timeout (ms).               */
    ('sendMail', 'active',           'bit', 0, 0, 1, 1),
    ('sendMail', 'subject',          'string',  1, 0, 1, 1),
    ('sendMail', 'from',             'string',  1, 0, 1, 1),
    ('sendMail', 'to',               'string',  1, 0, 1, 1),
    ('sendMail', 'cc',               'string',  0, 0, 1, 1),
    ('sendMail', 'bcc',              'string',  0, 0, 1, 1),
    ('sendMail', 'body',             'string',  1, 0, 1, 1),
    ('sendMail', 'priority',         'int', 0, 0, 1, 1),
    ('sendMail', 'files',            'string',  0, 0, 1, 1),
    ('sendMail', 'attachmentNames',  'string',  0, 0, 1, 1),
    ('sendMail', 'attachmentData',   'string',  0, 0, 1, 1),
    ('sendMail', 'customerKey',      'string',  0, 0, 1, 1),
    ('sendMail', 'timeout',          'int', 0, 0, 1, 1),
    ('sendMail', 'nextStep',         'string',  1, 1, 1, 1),
    ('sendMail', 'nextStep_Success', 'string',  1, 1, 1, 1),
    ('sendMail', 'nextStep_Failure', 'string',  1, 1, 1, 1),

    /* ---- SendSms ---- (SMS dispatch)
       smsAccountId : numeric SMS account id; timeout : HTTP timeout (ms).        */
    ('sendSms', 'active',           'bit', 0, 0, 1, 1),
    ('sendSms', 'smsAccountId',     'int', 1, 0, 1, 1),
    ('sendSms', 'routing',          'string',  0, 0, 1, 1),
    ('sendSms', 'from',             'string',  1, 0, 1, 1),
    ('sendSms', 'to',               'string',  1, 0, 1, 1),
    ('sendSms', 'body',             'string',  1, 0, 1, 1),
    ('sendSms', 'timeout',          'int', 0, 0, 1, 1),
    ('sendSms', 'nextStep',         'string',  1, 1, 1, 1),
    ('sendSms', 'nextStep_Success', 'string',  1, 1, 1, 1),
    ('sendSms', 'nextStep_Failure', 'string',  1, 1, 1, 1),

    /* ---- Disconnect ---- (ends the interaction)
       Params: {} in this contract -> no nextStep. Only the universal 'active'
       control flag is catalogued by default. The helpdesk flows have a
       prompt-playing disconnect variant (e.g. 'RTDS: MaxQueue Disconnect',
       'RTDS: IVR Error'), so 'prompt' and 'applicationId' are catalogued too.    */
    ('disconnect', 'active',         'bit', 0, 0, 1, 1),
    ('disconnect', 'prompt',         'string',  0, 0, 1, 1),
    ('disconnect', 'applicationId',  'int', 0, 0, 1, 1),

    /* ========================================================================
       HELPDESK-FLOW TYPES  (DA_HELDPESK +3233387777, LPA_ICT_HELDPESK +3233389999)
       ------------------------------------------------------------------------
       Attribute names and DataTypes are factored from the legacy source params.
       NOTE on 'applicationId': the importer special-cases a param literally
       named 'Application' -> attribute 'ApplicationID' (resolved to an integer
       id). The helpdesk flows instead use the literal key 'applicationId', so it
       is catalogued here verbatim as a plain integer attribute (no resolution).
       If you switch the flows to the resolving 'Application' form, drop these
       'applicationId' rows and rely on the importer's built-in 'ApplicationID'.
       NOTE on dynamic branch keys: 'menu' uses per-choice 'nextStep_<digit>' and
       'checkSchedule' uses 'nextStep_Guard_<name>'. The dictionary is exact-match, so
       only the suffixes seen in these two flows are seeded. A new choice digit or
       guard name needs a matching row or the import THROWs 54016 for that key.
       Runtime status (rtds_2_runtime.js): PlayPrompt/PlayAudio/Menu/Workgroup-
       Transfer/ExternalTransfer/Callback have GUI-exit keys registered;
       Condition/Emergency/CheckSchedule/FlowJump are NOT yet registered (runtime
       will skip to nextStep). Cataloguing here unblocks the IMPORT; wiring the
       unregistered four is separate work.
       ======================================================================== */

    /* ---- PlayPrompt ---- (TTS / prompt-library playback)                       */
    ('playPrompt', 'active',         'bit', 0, 0, 1, 1),
    ('playPrompt', 'applicationId',  'int', 0, 0, 1, 1),
    ('playPrompt', 'prompt',         'string',  1, 0, 1, 1),
    ('playPrompt', 'nextStep',       'string',  1, 1, 1, 1),

    /* ---- PlayAudio ---- (named audio-source playback)                          */
    ('playAudio', 'active',          'bit', 0, 0, 1, 1),
    ('playAudio', 'audioSource',     'string',  1, 0, 1, 1),
    ('playAudio', 'timeout',         'int', 0, 0, 1, 1),
    ('playAudio', 'nextStep',        'string',  1, 1, 1, 1),

    /* ---- Menu ---- (DTMF menu; per-choice nextStep_<digit> branches)           */
    ('menu', 'active',                  'bit', 0, 0, 1, 1),
    ('menu', 'applicationId',           'int', 0, 0, 1, 1),
    ('menu', 'staticPrompt',            'string',  0, 0, 1, 1),
    ('menu', 'timeout',                 'int', 0, 0, 1, 1),
    ('menu', 'maxTries',                'int', 0, 0, 1, 1),
    ('menu', 'nextStep_0',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_1',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_2',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_3',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_4',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_5',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_6',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_7',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_8',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_9',              'string',  0, 1, 1, 1),
    ('menu', 'nextStep_DefaultChoice',  'string',  0, 1, 1, 1),
    ('menu', 'nextStep',                'string',  1, 1, 1, 1),

    /* ---- WorkgroupTransfer ---- (queue to an ACD workgroup)                    */
    ('workgroupTransfer', 'active',             'bit', 0, 0, 1, 1),
    ('workgroupTransfer', 'queueName',          'string',  1, 0, 1, 1),
    ('workgroupTransfer', 'skills',             'string',  0, 0, 1, 1),
    ('workgroupTransfer', 'priority',           'int', 0, 0, 1, 1),
    ('workgroupTransfer', 'escapeKey',          'int', 0, 0, 1, 1),
    ('workgroupTransfer', 'nextStep_EscapeKey', 'string',  0, 1, 1, 1),
    ('workgroupTransfer', 'nextStep',           'string',  1, 1, 1, 1),

    /* ---- ExternalTransfer ---- (transfer to an external phone number)          */
    ('externalTransfer', 'active',              'bit', 0, 0, 1, 1),
    ('externalTransfer', 'phoneNumber',         'string',  1, 0, 1, 1),
    ('externalTransfer', 'outboundANI',         'string',  0, 0, 1, 1),
    ('externalTransfer', 'performCallAnalysis', 'string',  0, 0, 1, 1),
    ('externalTransfer', 'diversionReason',     'int', 0, 0, 1, 1),
    ('externalTransfer', 'timeout',             'int', 0, 0, 1, 1),
    ('externalTransfer', 'nextStep_Busy',       'string',  0, 1, 1, 1),
    ('externalTransfer', 'nextStep_RNA',        'string',  0, 1, 1, 1),
    ('externalTransfer', 'nextStep',            'string',  1, 1, 1, 1),

    /* ---- Condition ---- (branch on an ACD statistic; NOT yet runtime-wired)    */
    ('condition', 'active',          'bit', 0, 0, 1, 1),
    ('condition', 'statistic',       'string',  1, 0, 1, 1),
    ('condition', 'workgroup',       'string',  1, 0, 1, 1),
    ('condition', 'operator',        'string',  1, 0, 1, 1),
    ('condition', 'value',           'string',  1, 0, 1, 1),
    ('condition', 'nextStep_True',   'string',  1, 1, 1, 1),
    ('condition', 'nextStep_False',  'string',  1, 1, 1, 1),

    /* ---- Emergency ---- (emergency-prompt check; NOT yet runtime-wired)        */
    ('emergency', 'active',               'bit', 0, 0, 1, 1),
    ('emergency', 'emergencyId',          'string',  1, 0, 1, 1),
    ('emergency', 'nextStep_Transfer',    'string',  0, 1, 1, 1),
    ('emergency', 'nextStep_Disconnect',  'string',  0, 1, 1, 1),
    ('emergency', 'nextStep_Continue',    'string',  0, 1, 1, 1),
    ('emergency', 'nextStep_Failure',     'string',  0, 1, 1, 1),
    ('emergency', 'nextStep',             'string',  1, 1, 1, 1),

    /* ---- CheckSchedule ---- (open/closed/guard routing; NOT yet runtime-wired.
       Component checkSchedule.js exists. Guard branches are per-flow:
       Guard_ICT (LPA_ICT), Guard_Klantwacht/Guard_Systeemwacht (DA).)            */
    ('checkSchedule', 'active',                       'bit', 0, 0, 1, 1),
    ('checkSchedule', 'applicationId',                'int', 0, 0, 1, 1),
    ('checkSchedule', 'scheduleId',                   'int', 1, 0, 1, 1),
    ('checkSchedule', 'nextStep_Open',                'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep_Closed',              'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep_Transfer',            'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep_Guard_ICT',           'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep_Guard_Klantwacht',    'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep_Guard_Systeemwacht',  'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep_Failure',             'string',  0, 1, 1, 1),
    ('checkSchedule', 'nextStep',                     'string',  1, 1, 1, 1),

    /* ---- Callback ---- (queue callback; DA_HELDPESK only)                      */
    ('callback', 'active',               'bit', 0, 0, 1, 1),
    ('callback', 'configId',             'int', 1, 0, 1, 1),
    ('callback', 'callbackOnANI',        'int', 0, 0, 1, 1),
    ('callback', 'aniConfirmation',      'int', 0, 0, 1, 1),
    ('callback', 'allowManualInput',     'int', 0, 0, 1, 1),
    ('callback', 'manualInputRetries',   'int', 0, 0, 1, 1),
    ('callback', 'locationFilter',       'string',  0, 0, 1, 1),
    ('callback', 'aniClassifications',   'string',  0, 0, 1, 1),
    ('callback', 'aniAttribute',         'string',  0, 0, 1, 1),
    ('callback', 'customSkills',         'string',  0, 0, 1, 1),
    ('callback', 'inheritSkills',        'int', 0, 0, 1, 1),
    ('callback', 'customPriority',       'int', 0, 0, 1, 1),
    ('callback', 'inheritPriority',      'int', 0, 0, 1, 1),
    ('callback', 'promptFolder',         'string',  0, 0, 1, 1),
    ('callback', 'workgroup',            'string',  0, 0, 1, 1),
    ('callback', 'nextStep_Accepted',    'string',  0, 1, 1, 1),
    ('callback', 'nextStep_Rejected',    'string',  0, 1, 1, 1),
    ('callback', 'nextStep_Failure',     'string',  0, 1, 1, 1),
    ('callback', 'nextStep',             'string',  1, 1, 1, 1),

    /* ---- FlowJump ---- (jump to another routing table by SourceId; NOT yet
       runtime-wired. Only the target SourceId is carried.)                       */
    ('flowJump', 'active',           'bit', 0, 0, 1, 1),
    ('flowJump', 'sourceId',         'string',  1, 0, 1, 1);

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
DECLARE @attrUpd     int = 0;

/* -- 1. find-or-create Dic_OperationType ------------------------------------ */
INSERT INTO rtds.Dic_OperationType (Name, DateCreated, CreatedBy)
SELECT o.Name, @now, @CreatedBy
FROM   @OperationType o
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_OperationType d WHERE d.Name = o.Name);
SET @opTypeNew = @@ROWCOUNT;

/* -- 2. rename legacy Dic_AttributeType names when the new name is absent -----
   Run before insert so a DB that only has boolean/integer is renamed in place
   instead of accumulating duplicate type rows. When both old and new rows
   already exist, step 5 repoints Dic_Attribute to the canonical type.          */
UPDATE d SET Name = 'bit'
FROM   rtds.Dic_AttributeType d
WHERE  d.Name = 'boolean'
AND    NOT EXISTS (SELECT 1 FROM rtds.Dic_AttributeType x WHERE x.Name = 'bit');

UPDATE d SET Name = 'int'
FROM   rtds.Dic_AttributeType d
WHERE  d.Name = 'integer'
AND    NOT EXISTS (SELECT 1 FROM rtds.Dic_AttributeType x WHERE x.Name = 'int');

/* -- 3. find-or-create Dic_AttributeType (string / int / bit) --------------- */
INSERT INTO rtds.Dic_AttributeType (Name, DateCreated, CreatedBy)
SELECT DISTINCT a.AttributeType, @now, @CreatedBy
FROM   @Attribute a
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_AttributeType d WHERE d.Name = a.AttributeType);
SET @attrTypeNew = @@ROWCOUNT;

/* -- 4. find-or-create Dic_Attribute (per operation type + attribute name) --- */
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

/* -- 4. sync existing Dic_Attribute when SECTION 1 catalogue values drift --- */
UPDATE d
SET    d.DicAttributeTypeID = at.DicAttributeTypeID,
       d.IsRequired         = a.IsRequired,
       d.IsNext             = a.IsNext,
       d.IsDisplayed        = a.IsDisplayed,
       d.IsEditable         = a.IsEditable
FROM   rtds.Dic_Attribute d
JOIN   rtds.Dic_OperationType ot ON ot.DicOperationTypeID = d.DicOperationTypeID
JOIN   @Attribute a
       ON  a.OperationType = ot.Name
       AND a.AttributeName = d.Name
JOIN   rtds.Dic_AttributeType at ON at.Name = a.AttributeType
WHERE  d.DicAttributeTypeID <> at.DicAttributeTypeID
    OR d.IsRequired         <> a.IsRequired
    OR d.IsNext             <> a.IsNext
    OR d.IsDisplayed        <> a.IsDisplayed
    OR d.IsEditable         <> a.IsEditable;
SET @attrUpd = @@ROWCOUNT;

COMMIT TRANSACTION;

PRINT 'RTDS vocalls dictionary seed complete.';
PRINT '  Dic_OperationType rows inserted: ' + CAST(@opTypeNew   AS varchar(10));
PRINT '  Dic_AttributeType rows inserted: ' + CAST(@attrTypeNew AS varchar(10));
PRINT '  Dic_Attribute     rows inserted: ' + CAST(@attrNew     AS varchar(10));
PRINT '  Dic_Attribute     rows updated:  ' + CAST(@attrUpd     AS varchar(10));
PRINT '  (0 on a line means that step had nothing to do.)';
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
WHERE   ot.Name IN ('setVariables', 'guard', 'guardTui', 'sendMail', 'sendSms', 'disconnect')
ORDER BY ot.Name, da.IsNext, da.Name;
*/
