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
   2. On a database that already has data, FIRST set @dryRun = 1 (MODE TOGGLE
      below) and run once: it does all the work inside the transaction, prints
      the would-be insert/update counts AND the full list of affected keys
      (SECTION 2b), then ROLLs BACK so nothing is persisted. Review the listing,
      then set @dryRun = 0 and run again to commit. The listing survives the
      rollback because the OUTPUT rows are captured into table variables, which
      are not transactional -- so a dry run shows exactly which keys WOULD be
      inserted or updated, not merely how many.
   3. Re-run any time -- idempotent (find-or-create + sync). Missing catalogue
      rows are inserted. Existing Dic_Attribute rows for types in SECTION 1 are
      updated when DataType or GUI flags drift from the seed. Rows outside this
      seed's @OperationType list are never touched. Nothing is deleted (at the
      default @reset = 0). @dryRun previews this safely; see MODE TOGGLE.

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
   alongside the control keys 'active' and 'nextStep': 'routingId', dotted paths
   like 'auth.verified', plus flow keys 'customerName', 'customerProject',
   'ivrEvent', 'ivrAction', and the session vars 'language', 'ani', 'dnis',
   'interactionStartTime', 'routingKey'. If another flow introduces a new
   SetVariables variable, add a matching row here or the import will THROW 54016
   for that key.

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

/* ----------------------------------------------------------------------------
   MODE TOGGLE
   ----------------------------------------------------------------------------
   @reset = 0  -->  INSERT/UPDATE only (idempotent: find-or-create + sync).
                    Existing rows are kept; ids are NOT renumbered. Safe to
                    re-run any time. This is the default.
   @reset = 1  -->  WIPE + RESEED the five dictionary tables first, then seed.
                    Gives contiguous ids from 1 in catalogue order (Dic_Attribute
                    follows @Attribute.Ord). REQUIREMENTS / WARNINGS:
                      * The data tables that FK into the dictionary
                        (rtds.Operation, rtds.Attribute, rtds.Prompt,
                        rtds.PromptVersion) MUST be empty, or the DELETEs fail
                        with a FK violation and the whole run rolls back. Use
                        @resetFull = 1 to clear Operation + Attribute for you.
                      * Needs ALTER (db_ddladmin/db_owner): both IDENTITY_INSERT
                        and DBCC CHECKIDENT require it.
                      * DBCC CHECKIDENT reseed is NOT transactional -- if a later
                        step throws and the tran rolls back, the row DELETEs are
                        undone but the reseed is not. Re-run once the cause is
                        fixed; a clean full run leaves everything consistent.

   @resetFull = 1 -> Everything @reset does (forces @reset = 1) AND wipes +
                    reseeds the flow INSTANCE tables rtds.Operation and
                    rtds.Attribute. The prompt subsystem is deliberately kept
                    independent and untouched: rtds.Prompt, rtds.PromptVersion
                    and rtds.PromptLibrary are NOT cleared, and neither is
                    rtds.RoutingTable. NOTE: because @reset still wipes the prompt
                    dictionaries (Dic_PromptApplication/Language), rtds.Prompt and
                    rtds.PromptVersion must still be empty for the run to succeed.
                    If you carry live prompt data, say so and the prompt
                    dictionaries can be scoped out of the wipe so the whole prompt
                    level stays fully independent.
   ---------------------------------------------------------------------------- */
DECLARE @reset     bit = 0;
DECLARE @resetFull bit = 0;

/* ----------------------------------------------------------------------------
   @dryRun = 1  -->  PREVIEW. Do everything inside the transaction exactly as a
                    real run would (all the INSERT/UPDATE/find-or-create work),
                    print the would-be insert/update counts, then ROLLBACK so the
                    database is left untouched. Use this FIRST on a database that
                    already has data to see precisely what the seed would change.
                    @dryRun = 0  -->  the run COMMITs (the normal seed). Default 0.

                    CAVEAT -- not everything is transactional. The seed's row
                    INSERT/UPDATEs (SECTION 0/1/2) ARE inside the tran and so are
                    fully undone by the dry-run ROLLBACK. But DBCC CHECKIDENT
                    (only reached when @reset = 1) is NOT transactional: if you
                    combine @dryRun = 1 with @reset = 1, the table DELETEs roll
                    back but the identity RESEEDs do NOT. So dry-run is intended
                    for the default @reset = 0 / @resetFull = 0 mode (the
                    non-destructive insert/update path). A guard below BLOCKS the
                    @dryRun = 1 + @reset = 1 combination rather than leave the
                    identity counters silently reseeded.
   ---------------------------------------------------------------------------- */
DECLARE @dryRun    bit = 0;

IF @resetFull = 1 SET @reset = 1;   -- a full reset implies the dictionary reset

IF @dryRun = 1 AND @reset = 1
    THROW 60062, 'DRY_RUN_WITH_RESET_UNSUPPORTED: @dryRun = 1 cannot be combined with @reset/@resetFull = 1 -- DBCC CHECKIDENT RESEED is not transactional and would not roll back. Run the dry-run with @reset = 0, or accept a real (committing) reset.', 1;

BEGIN TRY
BEGIN TRANSACTION;

IF @resetFull = 1
BEGIN
    PRINT 'RESET FULL enabled -- also clearing rtds.Operation + rtds.Attribute (prompts + routing tables left intact) ...';

    -- Clear flow instance data, children first, and BEFORE the dictionary wipe
    -- below: rtds.Attribute FKs Operation + Dic_Attribute; rtds.Operation FKs
    -- RoutingTable (kept) + Dic_OperationType. Prompt tables are not touched.
    DELETE FROM rtds.Attribute;
    DELETE FROM rtds.Operation;

    DBCC CHECKIDENT ('rtds.Attribute', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.Operation', RESEED, 0) WITH NO_INFOMSGS;
END

IF @reset = 1
BEGIN
    PRINT 'RESET enabled -- wiping + reseeding the five dictionary tables ...';

    -- Delete children before parents (Dic_Attribute FKs Dic_OperationType + Dic_AttributeType).
    DELETE FROM rtds.Dic_Attribute;
    DELETE FROM rtds.Dic_OperationType;
    DELETE FROM rtds.Dic_AttributeType;
    DELETE FROM rtds.Dic_PromptApplication;
    DELETE FROM rtds.Dic_PromptLanguage;

    -- Reseed so the next identity value is 1 (RESEED, 0 => first row gets 1).
    DBCC CHECKIDENT ('rtds.Dic_Attribute',         RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.Dic_OperationType',     RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.Dic_AttributeType',     RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.Dic_PromptApplication', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.Dic_PromptLanguage',    RESEED, 0) WITH NO_INFOMSGS;
END

/* ============================================================================
   SECTION 0 -- STRUCTURAL DICTIONARIES (OperationType / PromptApplication /
                PromptLanguage)
   ----------------------------------------------------------------------------
   Seeds the three self-contained lookup tables that carry no FK into the data
   tables and do not reference each other. Reworked from the PascalCase
   production seed (seed_rtds_dictionaries_minimal.sql, May 2026 snapshot) into
   this camelCase contract: every operation TYPE Name is camelCased and the
   temporary '_vocalls' suffix is dropped (SetAttributes -> setVariables,
   Schedule -> checkSchedule, GuardTUI -> guardTui, SendSMS -> sendSms, ...).
   Prompt-application names and language keys (NL/FR/...) are DATA, not type
   strings -- left verbatim, like the language keys elsewhere in this file.

   ID NUMBERING: the Dic_OperationType ids are a clean-DB collapse -- assigned
   fresh and CONTIGUOUS from 1, in listed order (NOT the historical scattered
   production op-type ids guardRouting 21, guardTui 22, ...). The
   Dic_PromptApplication ids, by contrast, are kept VERBATIM at their production
   values (scattered: ids 8/9/10 unused, Welcome=11, Voicemail=12, Info=13,
   Exception=14, Emergency=15) because the live flows reference prompt-apps by
   numeric id and a TTS-bearing op THROWs UNKNOWN_APPLICATION if the id is absent.
   So flow payloads use the production prompt-app ids directly (applicationId: 11
   Welcome, 14 Exception, ...); rtds/samples/n-allo_reception.json tracks the same
   production ids (Welcome 11, Voicemail 12).

   SEMANTIC RENAMES (deliberate, not casing fixes):
     - 'languageMenu' -> 'getLanguage'
     - 'playPrompt'   -> 'say'   (the single prompt-playing type)
     - 'playAudio'    -> 'play'
   The runtime registration (registerRtdsExit) and the Designer twin track these
   names in lockstep. This clean contiguous-ID seed inserts the new names directly
   by ID above, so no in-place rename step is needed.

   SET IDENTITY_INSERT lets this clean seed assign the contiguous ids explicitly.
   INSERT ... WHERE NOT EXISTS BY ID is idempotent: existing rows (matched by ID)
   are left untouched, missing rows are inserted. With @reset = 0 nothing here is
   deleted (purely additive); with @reset = 1 the MODE TOGGLE block above has
   already wiped + reseeded these tables, so the inserts land on fresh ids 1..N.

   NOTE: SECTION 1/2 below ALSO find-or-create Dic_OperationType BY NAME (without
   IDENTITY_INSERT). That is harmless and idempotent: the camelCase names seeded
   here already exist by the time SECTION 2 runs, so its INSERT ... WHERE NOT
   EXISTS matches them and inserts nothing.
   ============================================================================ */

PRINT 'Seeding rtds.Dic_OperationType (camelCase contract) ...';

SET IDENTITY_INSERT rtds.Dic_OperationType ON;

INSERT INTO rtds.Dic_OperationType ([DicOperationTypeID], [Name], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
SELECT v.* FROM (VALUES
  (1,  N'setVariables',        N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  -- (2,  N'checkVariable',       N'2023-11-27 15:42:49.9300000', N'rtds-seed', NULL, NULL),  -- no component
  (3,  N'say',                 N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  -- (4,  N'getLanguage',         N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  (5,  N'checkSchedule',       N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  -- (6,  N'emergency',           N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  -- (7,  N'guardRouting',        N'2022-04-20 11:47:56.5100000', N'rtds-seed', NULL, NULL),  -- legacy name; attrs under 'guard'
  (8,  N'menu',                N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  (9,  N'guardTui',            N'2022-04-20 11:48:35.3830000', N'rtds-seed', NULL, NULL),
  (10, N'guard',               N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  (11, N'disconnect',          N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  -- (12, N'play',                N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  -- (13, N'condition',           N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  -- (14, N'skillUpdate',         N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  (15, N'flowJump',            N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  -- (16, N'callerDataEntry',     N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  -- (17, N'voicemailCallback',   N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),  -- no component
  -- (18, N'callback',            N'2021-10-29 12:02:57.5000000', N'rtds-seed', NULL, NULL),  -- no component
  (19, N'sendSms',             N'2022-04-20 11:48:39.7930000', N'rtds-seed', NULL, NULL),
  -- (20, N'manageCallCapacity',  N'2025-03-11 12:52:49.2470000', N'rtds-seed', NULL, NULL),  -- no component
  (21, N'externalTransfer',    N'2021-06-30 11:07:51.4330000', N'rtds-seed', NULL, NULL),
  (22, N'internalTransfer',    N'2026-06-08 00:00:00.0000000', N'rtds-seed', NULL, NULL),
  (23, N'sendMail',            N'2026-06-12 08:47:21.8981290', N'rtds-seed', NULL, NULL)
  -- (24, N'workgroupTransfer',   N'2026-06-12 08:47:21.8981290', N'rtds-seed', NULL, NULL)   -- no component
) AS v([DicOperationTypeID], [Name], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
WHERE NOT EXISTS (
    SELECT 1 FROM rtds.Dic_OperationType t WHERE t.[DicOperationTypeID] = v.[DicOperationTypeID]
);

SET IDENTITY_INSERT rtds.Dic_OperationType OFF;

PRINT 'Seeding rtds.Dic_PromptApplication ...';

SET IDENTITY_INSERT rtds.Dic_PromptApplication ON;

-- PRODUCTION IDs (verbatim). These are the historical scattered ids from the live
-- NALLO_APP.rtds.Dic_PromptApplication, NOT a contiguous 1..N collapse: ids 8/9/10
-- are unused, Welcome=11, Voicemail=12, Info=13, Exception=14, Emergency=15. The
-- flows reference these ids directly (applicationId: 11 Welcome, 14 Exception, ...),
-- so they MUST line up with production or a TTS-bearing op THROWs UNKNOWN_APPLICATION.
-- Names/FilePrefixes are DATA, kept verbatim as production stores them (PascalCase);
-- import resolves by numeric id, not by name, so casing here is cosmetic.
INSERT INTO rtds.Dic_PromptApplication ([DicPromptApplicationID], [Name], [FilePrefix], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
SELECT v.* FROM (VALUES
  (1,  N'Scheduler',     N'Scheduler', N'2021-06-30 11:08:13.6400000', N'rtds-seed', NULL, NULL),
  (2,  N'Callback',      N'CB',        N'2021-06-30 11:08:13.6400000', N'rtds-seed', NULL, NULL),
  (3,  N'Survey',        N'Survey',    N'2021-06-30 11:08:13.6400000', N'rtds-seed', NULL, NULL),
  (4,  N'PreQueue',      N'PreQueue',  N'2021-06-30 11:08:13.6400000', N'rtds-seed', NULL, NULL),
  (5,  N'Queue',         N'Queue',     N'2021-06-30 11:08:13.6400000', N'rtds-seed', NULL, NULL),
  (6,  N'AdHocMessages', N'AdHoc',     N'2021-06-30 11:08:13.6400000', N'rtds-seed', NULL, NULL),
  (7,  N'Menu',          N'Menu',      N'2021-07-23 11:26:02.6600000', N'rtds-seed', NULL, NULL),
  (11, N'Welcome',       N'Welcome',   N'2021-10-22 11:49:45.7700000', N'rtds-seed', NULL, NULL),
  (12, N'Voicemail',     N'Voicemail', N'2021-11-09 14:02:36.2930000', N'rtds-seed', NULL, NULL),
  (13, N'Info',          N'Info',      N'2021-11-22 15:52:00.6030000', N'rtds-seed', NULL, NULL),
  (14, N'Exception',     N'Exception', N'2021-11-29 12:19:10.1300000', N'rtds-seed', NULL, NULL),
  (15, N'Emergency',     N'Emergency', N'2022-06-09 09:35:39.9470000', N'rtds-seed',        NULL, NULL),
  (16, N'Disconnect',    N'Disconnect',N'2026-06-22 16:20:35.5500000', N'GDG546@engie.com', NULL, NULL)
) AS v([DicPromptApplicationID], [Name], [FilePrefix], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
WHERE NOT EXISTS (
    SELECT 1 FROM rtds.Dic_PromptApplication t WHERE t.[DicPromptApplicationID] = v.[DicPromptApplicationID]
);

SET IDENTITY_INSERT rtds.Dic_PromptApplication OFF;

PRINT 'Seeding rtds.Dic_PromptLanguage ...';

SET IDENTITY_INSERT rtds.Dic_PromptLanguage ON;

INSERT INTO rtds.Dic_PromptLanguage ([DicPromptLanguageID], [Key], [Language], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
SELECT v.* FROM (VALUES
  (1, N'NL', N'Dutch',       N'2021-06-30 11:08:13.6400000', N'rtds-seed',  NULL,  NULL),
  (2, N'FR', N'French',      N'2021-06-30 11:08:13.6400000', N'rtds-seed',  NULL,  NULL),
  (3, N'EN', N'English',     N'2021-06-30 11:08:13.6400000', N'rtds-seed',  NULL,  NULL),
  (4, N'DE', N'German',      N'2021-06-30 11:08:13.6400000', N'rtds-seed',  NULL,  NULL)
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
     IsDisplayed    -> GUI shows the field (production: always 0)
     IsEditable     -> GUI lets you edit the field (production: always 0)
   ============================================================================ */

DECLARE @OperationType TABLE (Name varchar(255) NOT NULL PRIMARY KEY);

INSERT INTO @OperationType (Name) VALUES
    /* Active — shipped component and/or runtime GUI-exit */
    ('setVariables'),
    ('guard'),
    ('guardTui'),
    ('sendMail'),
    ('sendSms'),
    ('disconnect'),
    ('say'),
    ('menu'),
    ('externalTransfer'),
    ('checkSchedule'),
    ('flowJump'),
    ('internalTransfer');
    /* COMMENTED — no Vocalls component (uncomment type + @Attribute block to re-enable):
    ('play'),
    ('workgroupTransfer'),
    ('condition'),
    ('emergency'),
    ('callback'),
    ('getLanguage'),
    ('voicemailCallback');
    */

DECLARE @Attribute TABLE (
    Ord            int           IDENTITY(1,1) NOT NULL,  -- catalogue order (drives DicAttributeID assignment)
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
    ('setVariables', 'active',           'bit',     1, 0, 0, 0),
    ('setVariables', 'routingId',        'string',  0, 0, 0, 0),
    ('setVariables', 'customerName',     'string',  0, 0, 0, 0),
    ('setVariables', 'customerProject',  'string',  0, 0, 0, 0),
    ('setVariables', 'ivrEvent',         'string',  0, 0, 0, 0),
    ('setVariables', 'ivrAction',        'string',  0, 0, 0, 0),
    -- keysToLog: JSON array of varObj keys the KeyLog end-of-call POST snapshots
    -- (rtds_3_vocallsEnv.js).
    ('setVariables', 'keysToLog',        'string',  0, 0, 0, 0),
    -- session vars written by the flow (match live DB Dic_Attribute ids 178-182)
    ('setVariables', 'language',             'string',  0, 0, 0, 0),
    ('setVariables', 'ani',                  'string',  0, 0, 0, 0),
    ('setVariables', 'dnis',                 'string',  0, 0, 0, 0),
    ('setVariables', 'interactionStartTime', 'string',  0, 0, 0, 0),
    ('setVariables', 'routingKey',           'string',  0, 0, 0, 0),
    ('setVariables', 'nextStep',         'string',  1, 1, 0, 0),


    /* ---- Guard ---- (guard / on-call dial-out)                                */
    ('guard', 'active',            'bit', 1, 0, 0, 0),
    ('guard', 'configId',          'int', 1, 0, 0, 0),
    ('guard', 'configName',        'string',  1, 0, 0, 0),
    ('guard', 'dialGuard',         'bit', 1, 0, 0, 0),
    ('guard', 'outboundANI',       'string',  1, 0, 0, 0),
    ('guard', 'diversion',         'string',  1, 0, 0, 0),
    ('guard', 'onHoldAudioUrl',    'string',  1, 0, 0, 0),
    ('guard', 'timeout',           'int', 1, 0, 0, 0),
    ('guard', 'recordVoicemail',   'bit', 1, 0, 0, 0),
    ('guard', 'acceptCallMenu',    'bit', 1, 0, 0, 0),
    ('guard', 'acceptCallMessage', 'string',  1, 0, 0, 0),
    ('guard', 'sendSms',           'bit', 1, 0, 0, 0),
    ('guard', 'sendMail',          'bit', 1, 0, 0, 0),
    ('guard', 'nextStep_Success',  'string',  1, 1, 0, 0),
    ('guard', 'nextStep_Failure',  'string',  1, 1, 0, 0),
    ('guard', 'nextStep',          'string',  1, 1, 0, 0),


    /* ---- GuardTUI ---- (self-service guard activate/deactivate line)
       Factored from rtds/samples/sourceCode_guardTui.js (__configJSON + say
       nodes). Spoken slots are per-language Params (e.g. promptActivate_NL);
       the component resolves getValue(__rtParams, base + '_' + language).
       configName is carried for parity with the flow header but is not consumed
       by the component. Add *_FR / *_DE rows when a flow supports more langs.   */
    ('guardTui', 'active',                       'bit', 0, 0, 0, 0),
    ('guardTui', 'configId',                     'int', 1, 0, 0, 0),
    ('guardTui', 'configName',                   'string',  0, 0, 0, 0),
    ('guardTui', 'phoneNumberVar',               'string',  0, 0, 0, 0),
    ('guardTui', 'timeout',                      'int', 0, 0, 0, 0),
    ('guardTui', 'resultCurrentlyActivated_NL',  'string',  1, 0, 0, 0),
    ('guardTui', 'resultCurrentlyDeactivated_NL','string',  1, 0, 0, 0),
    ('guardTui', 'promptActivate_NL',            'string',  1, 0, 0, 0),
    ('guardTui', 'promptDeactivate_NL',          'string',  1, 0, 0, 0),
    ('guardTui', 'resultActivated_NL',           'string',  1, 0, 0, 0),
    ('guardTui', 'resultDeactivated_NL',         'string',  1, 0, 0, 0),
    ('guardTui', 'resultOnlyActive_NL',          'string',  1, 0, 0, 0),
    ('guardTui', 'resultDenied_NL',              'string',  1, 0, 0, 0),
    ('guardTui', 'resultError_NL',               'string',  1, 0, 0, 0),
    ('guardTui', 'nextStep_Success',   'string',  1, 1, 0, 0),
    ('guardTui', 'nextStep_Denied',    'string',  1, 1, 0, 0),
    ('guardTui', 'nextStep_Failure',   'string',  1, 1, 0, 0),
    ('guardTui', 'nextStep',           'string',  1, 1, 0, 0),


    ('sendMail', 'active',           'bit', 1, 0, 0, 0),
    ('sendMail', 'subject',          'string',  1, 0, 0, 0),
    ('sendMail', 'from',             'string',  1, 0, 0, 0),
    ('sendMail', 'to',               'string',  1, 0, 0, 0),
    ('sendMail', 'cc',               'string',  0, 0, 0, 0),
    ('sendMail', 'bcc',              'string',  0, 0, 0, 0),
    ('sendMail', 'body',             'string',  1, 0, 0, 0),
    ('sendMail', 'priority',         'int', 0, 0, 0, 0),
    ('sendMail', 'files',            'string',  0, 0, 0, 0),
    ('sendMail', 'attachmentNames',  'string',  0, 0, 0, 0),
    ('sendMail', 'attachmentData',   'string',  0, 0, 0, 0),
    ('sendMail', 'customerKey',      'string',  0, 0, 0, 0),
    ('sendMail', 'timeout',          'int', 0, 0, 0, 0),
    ('sendMail', 'nextStep_Success', 'string',  1, 1, 0, 0),
    ('sendMail', 'nextStep_Failure', 'string',  1, 1, 0, 0),
    ('sendMail', 'nextStep',         'string',  1, 1, 0, 0),


    /* ---- SendSms ---- (SMS dispatch)
       smsAccountId : numeric SMS account id; timeout : HTTP timeout (ms).        */
    ('sendSms', 'active',           'bit', 1, 0, 0, 0),
    ('sendSms', 'smsAccountId',     'int', 1, 0, 0, 0),
    ('sendSms', 'routing',          'string',  0, 0, 0, 0),
    ('sendSms', 'from',             'string',  1, 0, 0, 0),
    ('sendSms', 'to',               'string',  1, 0, 0, 0),
    ('sendSms', 'body',             'string',  1, 0, 0, 0),
    ('sendSms', 'timeout',          'int', 0, 0, 0, 0),
    ('sendSms', 'nextStep_Success', 'string',  1, 1, 0, 0),
    ('sendSms', 'nextStep_Failure', 'string',  1, 1, 0, 0),
    ('sendSms', 'nextStep',         'string',  1, 1, 0, 0),

    /* ---- Disconnect ---- (ends the interaction)
       Params: {} in this contract -> no nextStep. Only the universal 'active'
       control flag is catalogued by default. The helpdesk flows have a
       prompt-playing disconnect variant (e.g. 'RTDS: MaxQueue Disconnect',
       'RTDS: IVR Error'), so 'prompt' and 'applicationId' are catalogued too.    */
    ('disconnect', 'active',         'bit', 0, 0, 0, 0),
    ('disconnect', 'prompt',         'string',  0, 0, 0, 0),
    ('disconnect', 'applicationId',  'int', 0, 0, 0, 0),

    /* ========================================================================
       ACTIVE COMPONENT / RUNTIME TYPES (see @OperationType above)
       ------------------------------------------------------------------------
       NOTE on 'applicationId': the importer special-cases a param literally
       named 'Application' -> attribute 'ApplicationID' (resolved to an integer
       id). Flows that use the literal key 'applicationId' catalogue it verbatim
       as a plain integer attribute (no resolution).
       NOTE on dynamic branch keys: 'menu' uses per-choice 'nextStep_<digit>' and
       'checkSchedule' uses 'nextStep_Guard_<name>'. The dictionary is exact-match,
       so only the suffixes used in live flows are seeded. A new choice digit or
       guard name needs a matching row or the import THROWs 54016 for that key.
       Blocks for types without a shipped component are commented below — search
       for "COMMENTED — no Vocalls component".
       ======================================================================== */

    /* ---- Say ---- (TTS / prompt-library playback; formerly playPrompt)         */
    ('say', 'active',         'bit', 1, 0, 0, 0),
    ('say', 'applicationId',  'int', 0, 0, 0, 0),
    ('say', 'prompt',         'string',  1, 0, 0, 0),
    ('say', 'nextStep',       'string',  1, 1, 0, 0),

    /*
    ---- COMMENTED: play (no file in rtds/components) ----
    ('play', 'active',          'bit', 1, 0, 0, 0),
    ('play', 'audioSource',     'string',  1, 0, 0, 0),
    ('play', 'timeout',         'int', 0, 0, 0, 0),
    ('play', 'nextStep',        'string',  1, 1, 0, 0),
    */

    /* ---- Menu ---- (DTMF menu; gui_exit v2 component)
       Seeded STRICTLY from the shipped component rtds/components/menu.js
       (__configJSON), plus 'nextStep_DefaultChoice' which the component does not
       declare but every live flow supplies. Per-language TTS slots (guardTui
       pattern): staticMessage_<LANG>, menuChoiceMessage_<key>_<LANG>,
       noChoiceMessage_<LANG>, invalidChoiceMessage_<LANG>, maxTriesMessage_<LANG>.
       The legacy helpdesk keys 'staticPrompt' (wav filename), 'applicationId' and
       the unused 'nextStep_Failure' were REMOVED -- the prompt now comes from the
       staticMessage_<LANG> slots. The _v1 flow configs were stripped to match.
       Branch keys: nextStep_<key> (0-9, *, #), nextStep_DefaultChoice.
       Add *_DE / more langs when a flow supports them.                            */
    ('menu', 'active',                      'bit', 1, 0, 0, 0),
    ('menu', 'staticMessage_NL',            'string',  0, 0, 0, 0),
    ('menu', 'staticMessage_FR',            'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_0_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_1_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_2_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_3_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_4_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_5_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_6_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_7_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_8_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_9_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_*_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_#_NL',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_0_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_1_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_2_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_3_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_4_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_5_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_6_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_7_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_8_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_9_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_*_FR',      'string',  0, 0, 0, 0),
    ('menu', 'menuChoiceMessage_#_FR',      'string',  0, 0, 0, 0),
    ('menu', 'noChoiceMessage_NL',          'string',  0, 0, 0, 0),
    ('menu', 'noChoiceMessage_FR',          'string',  0, 0, 0, 0),
    ('menu', 'invalidChoiceMessage_NL',     'string',  0, 0, 0, 0),
    ('menu', 'invalidChoiceMessage_FR',     'string',  0, 0, 0, 0),
    ('menu', 'maxTriesMessage_NL',          'string',  0, 0, 0, 0),
    ('menu', 'maxTriesMessage_FR',          'string',  0, 0, 0, 0),
    ('menu', 'timeout',                     'int', 0, 0, 0, 0),
    ('menu', 'maxTries',                    'int', 0, 0, 0, 0),
    ('menu', 'nextStep_0',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_1',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_2',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_3',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_4',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_5',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_6',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_7',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_8',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_9',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_*',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_#',                  'string',  0, 1, 0, 0),
    ('menu', 'nextStep_DefaultChoice',      'string',  0, 1, 0, 0),
    ('menu', 'nextStep',                    'string',  1, 1, 0, 0),

    /*
    ---- COMMENTED: workgroupTransfer (no file in rtds/components) ----
    ('workgroupTransfer', 'active',             'bit', 1, 0, 0, 0),
    ('workgroupTransfer', 'queueName',          'string',  1, 0, 0, 0),
    ('workgroupTransfer', 'skills',             'string',  0, 0, 0, 0),
    ('workgroupTransfer', 'priority',           'int', 0, 0, 0, 0),
    ('workgroupTransfer', 'escapeKey',          'int', 0, 0, 0, 0),
    ('workgroupTransfer', 'nextStep_EscapeKey', 'string',  0, 1, 0, 0),
    ('workgroupTransfer', 'nextStep',           'string',  1, 1, 0, 0),
    */

    /* ---- ExternalTransfer ---- (transfer to an external phone number)
       Param vocabulary reconciled to the shipped component rtds/components/
       externalTransfer.js (__configJSON), the source of truth: blind/attend
       `redirect` primitive with a single not-accepted fallback. 'parameters'
       carries semicolon-delimited SIP headers; 'attendTransfer' (bit) picks the
       blind vs attend redirect node; the CLI is appended as P-Asserted-Identity
       via __appendPAssertedIdentity. Replaces the earlier call-analysis shape
       (performCallAnalysis / diversionReason / nextStep_Busy / nextStep_RNA),
       which the redirect primitive does not expose.
       CASING: the component's __configJSON declares 'outboundAni', but the seed
       casing rule, the 'guard' type, and every production flow use 'outboundANI'
       (acronym uppercase) and the importer is case-sensitive -- so the dictionary
       keeps 'outboundANI'. The component default is drift to fix there (same note
       as rtds/specs/guardRouting.spec.md).                                        */
    ('externalTransfer', 'active',           'bit', 1, 0, 0, 0),
    ('externalTransfer', 'phoneNumber',      'string',  1, 0, 0, 0),
    ('externalTransfer', 'outboundANI',      'string',  0, 0, 0, 0),
    ('externalTransfer', 'parameters',       'string',  0, 0, 0, 0),
    ('externalTransfer', 'attendTransfer',   'bit', 0, 0, 0, 0),
    ('externalTransfer', 'timeout',          'int', 0, 0, 0, 0),
    ('externalTransfer', 'nextStep_Failure', 'string',  0, 1, 0, 0),
    ('externalTransfer', 'nextStep',         'string',  1, 1, 0, 0),

    /*
    ---- COMMENTED: condition (no file in rtds/components) ----
    ('condition', 'active',          'bit', 1, 0, 0, 0),
    ('condition', 'statistic',       'string',  1, 0, 0, 0),
    ('condition', 'workgroup',       'string',  1, 0, 0, 0),
    ('condition', 'operator',        'string',  1, 0, 0, 0),
    ('condition', 'value',           'string',  1, 0, 0, 0),
    ('condition', 'nextStep_True',   'string',  1, 1, 0, 0),
    ('condition', 'nextStep_False',  'string',  1, 1, 0, 0),
    ('condition', 'nextStep',        'string',  1, 1, 0, 0),

    ---- COMMENTED: emergency (no file in rtds/components) ----
    ('emergency', 'active',               'bit', 1, 0, 0, 0),
    ('emergency', 'emergencyId',          'string',  1, 0, 0, 0),
    ('emergency', 'nextStep_Transfer',    'string',  0, 1, 0, 0),
    ('emergency', 'nextStep_Disconnect',  'string',  0, 1, 0, 0),
    ('emergency', 'nextStep_Continue',    'string',  0, 1, 0, 0),
    ('emergency', 'nextStep_Failure',     'string',  0, 1, 0, 0),
    ('emergency', 'nextStep',             'string',  1, 1, 0, 0),
    */

    /* ---- CheckSchedule ---- (open/closed/guard routing; GUI-exit registered).
       Component checkSchedule.js exists. The component branches dynamically on
       'nextStep_' + the API's returned action, so every action it can route to
       needs a row here (exact-match, else 54016). The shipped __configJSON emits
       Open/Closed/Transfer/ExternalTransfer/Disconnect/Failure; Guard branches are
       per-flow: Guard_ICT (LPA_ICT), Guard_Klantwacht/Guard_Systeemwacht (DA).)   */
    ('checkSchedule', 'active',                       'bit', 1, 0, 0, 0),
    ('checkSchedule', 'applicationId',                'int', 0, 0, 0, 0),
    ('checkSchedule', 'scheduleId',                   'int', 1, 0, 0, 0),
    ('checkSchedule', 'timeout',                      'int', 0, 0, 0, 0),
    ('checkSchedule', 'nextStep_Open',                'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Closed',              'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Transfer',            'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_ExternalTransfer',    'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Disconnect',          'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Guard_ICT',           'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Guard_Klantwacht',    'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Guard_Systeemwacht',  'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep_Failure',             'string',  0, 1, 0, 0),
    ('checkSchedule', 'nextStep',                     'string',  1, 1, 0, 0),

    /*
    ---- COMMENTED: callback (no file in rtds/components) ----
    ('callback', 'active',               'bit', 1, 0, 0, 0),
    ('callback', 'configId',             'int', 1, 0, 0, 0),
    ('callback', 'callbackOnANI',        'int', 1, 0, 0, 0),
    ('callback', 'aniConfirmation',      'int', 1, 0, 0, 0),
    ('callback', 'allowManualInput',     'int', 1, 0, 0, 0),
    ('callback', 'manualInputRetries',   'int', 1, 0, 0, 0),
    ('callback', 'locationFilter',       'string',  0, 0, 0, 0),
    ('callback', 'aniClassifications',   'string',  0, 0, 0, 0),
    ('callback', 'aniAttribute',         'string',  0, 0, 0, 0),
    ('callback', 'customSkills',         'string',  0, 0, 0, 0),
    ('callback', 'inheritSkills',        'int', 0, 0, 0, 0),
    ('callback', 'customPriority',       'int', 0, 0, 0, 0),
    ('callback', 'inheritPriority',      'int', 0, 0, 0, 0),
    ('callback', 'promptFolder',         'string',  0, 0, 0, 0),
    ('callback', 'workgroup',            'string',  0, 0, 0, 0),
    ('callback', 'nextStep_Accepted',    'string',  0, 1, 0, 0),
    ('callback', 'nextStep_Rejected',    'string',  0, 1, 0, 0),
    ('callback', 'nextStep_Failure',     'string',  0, 1, 0, 0),
    ('callback', 'nextStep',             'string',  1, 1, 0, 0),
    */

    /* ---- FlowJump ---- (jump to another routing table by SourceId; NOT yet
       runtime-wired. Only the target SourceId is carried.)                       */
    ('flowJump', 'active',           'bit', 0, 0, 0, 0),
    ('flowJump', 'sourceId',         'string',  1, 0, 0, 0),

    /*
    ---- COMMENTED: getLanguage (no file in rtds/components) ----
    ('getLanguage', 'active', 'bit', 1, 0, 0, 0),
    ('getLanguage', 'applicationId',  'int', 0, 0, 0, 0),
    ('getLanguage', 'prompt',  'string',  0, 0, 0, 0),
    ('getLanguage', 'languages',     'string',  1, 0, 0, 0),
    ('getLanguage', 'maxTries',      'int', 0, 0, 0, 0),
    ('getLanguage', 'nextStep',      'string',  1, 1, 0, 0),
    */

    /* ---- InternalTransfer ---- (direct internal hand-off; NEW type, not yet
       runtime-wired). Param vocabulary reconciled to the shipped component
       rtds/components/internalTransfer.js (__configJSON), the source of truth:
       a plain blind/attend `redirect` to an internal destination -- no ACD
       queue / skills / priority. 'target' is the internal destination (bare
       extension/number or a line:<route> literal); 'parameters' carries
       semicolon-delimited SIP headers; 'attendTransfer' (bit) picks the blind vs
       attend redirect node. Replaces the earlier queue shape (remoteDestination /
       transferHeader_priority / transferHeader_skills), which this operation does
       not model.                                                                  */
    ('internalTransfer', 'active',           'bit', 1, 0, 0, 0),
    ('internalTransfer', 'target',           'string',  1, 0, 0, 0),
    ('internalTransfer', 'parameters',       'string',  0, 0, 0, 0),
    ('internalTransfer', 'attendTransfer',   'bit', 0, 0, 0, 0),
    ('internalTransfer', 'timeout',          'int', 0, 0, 0, 0),
    ('internalTransfer', 'nextStep_Failure', 'string',  0, 1, 0, 0),
    ('internalTransfer', 'nextStep',         'string',  1, 1, 0, 0);

    /*
    ---- COMMENTED: voicemailCallback (no file in rtds/components) ----
    ('voicemailCallback', 'active',           'bit', 1, 0, 0, 0),
    ('voicemailCallback', 'nextStep_Escape',  'string',  0, 1, 0, 0),
    ('voicemailCallback', 'nextStep_Error',   'string',  0, 1, 0, 0),
    ('voicemailCallback', 'nextStep',         'string',  1, 1, 0, 0);
    */

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

/* ----------------------------------------------------------------------------
   CHANGE LOG (OUTPUT capture)
   ----------------------------------------------------------------------------
   Steps 1/3/4/5 below capture the rows they actually touch via OUTPUT ... INTO
   these table variables, so the run can list WHICH keys changed instead of only
   how many. SECTION 2b at the end prints them.

   Why INTO a table variable rather than a bare OUTPUT clause:
     * A bare OUTPUT returns a result set, which is DISCARDED by the dry-run
       ROLLBACK -- exactly the case we want the listing for.
     * Table variables are NOT transactional: their contents survive ROLLBACK,
       so the dry-run listing is still printed after the rollback.
     * INSERT ... OUTPUT (bare) is also illegal alongside the ORDER BY that step
       4 needs to assign DicAttributeID in catalogue order; OUTPUT ... INTO is
       permitted there.
   Purely additive: no existing INSERT/UPDATE semantics are changed.
   ---------------------------------------------------------------------------- */
DECLARE @logOpType TABLE (Name varchar(255));

DECLARE @logAttrType TABLE (Name varchar(255));

DECLARE @logAttrNew TABLE (
    DicOperationTypeID int,
    Name               varchar(255),
    DicAttributeTypeID int,
    IsRequired         bit,
    IsNext             bit
);

DECLARE @logAttrUpd TABLE (
    DicOperationTypeID int,
    Name               varchar(255),
    OldTypeID          int, NewTypeID  int,
    OldRequired        bit, NewRequired bit,
    OldNext            bit, NewNext     bit,
    OldDisplayed       bit, NewDisplayed bit,
    OldEditable        bit, NewEditable  bit
);

/* -- 1. find-or-create Dic_OperationType ------------------------------------ */
INSERT INTO rtds.Dic_OperationType (Name, DateCreated, CreatedBy)
OUTPUT inserted.Name INTO @logOpType (Name)
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
OUTPUT inserted.Name INTO @logAttrType (Name)
SELECT DISTINCT a.AttributeType, @now, @CreatedBy
FROM   @Attribute a
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_AttributeType d WHERE d.Name = a.AttributeType);
SET @attrTypeNew = @@ROWCOUNT;

/* -- 4. find-or-create Dic_Attribute (per operation type + attribute name) --- */
INSERT INTO rtds.Dic_Attribute
    (DicOperationTypeID, DicAttributeTypeID, Name,
     IsRequired, IsNext, IsDisplayed, IsEditable, DateCreated, CreatedBy)
OUTPUT inserted.DicOperationTypeID, inserted.Name, inserted.DicAttributeTypeID,
       inserted.IsRequired, inserted.IsNext
  INTO @logAttrNew (DicOperationTypeID, Name, DicAttributeTypeID, IsRequired, IsNext)
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
    AND    d.Name               = a.AttributeName)
ORDER BY a.Ord;   -- assign DicAttributeID in SECTION 1 catalogue (listed) order
SET @attrNew = @@ROWCOUNT;

/* -- 5. sync existing Dic_Attribute when SECTION 1 catalogue values drift --- */
UPDATE d
SET    d.DicAttributeTypeID = at.DicAttributeTypeID,
       d.IsRequired         = a.IsRequired,
       d.IsNext             = a.IsNext,
       d.IsDisplayed        = a.IsDisplayed,
       d.IsEditable         = a.IsEditable
OUTPUT deleted.DicOperationTypeID, deleted.Name,
       deleted.DicAttributeTypeID, inserted.DicAttributeTypeID,
       deleted.IsRequired,  inserted.IsRequired,
       deleted.IsNext,      inserted.IsNext,
       deleted.IsDisplayed, inserted.IsDisplayed,
       deleted.IsEditable,  inserted.IsEditable
  INTO @logAttrUpd (DicOperationTypeID, Name,
                    OldTypeID, NewTypeID, OldRequired, NewRequired,
                    OldNext, NewNext, OldDisplayed, NewDisplayed,
                    OldEditable, NewEditable)
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

IF @dryRun = 1
BEGIN
    ROLLBACK TRANSACTION;
    PRINT '[DRY RUN] Rolled back -- no changes persisted. Counts below are what a real run (@dryRun = 0) WOULD do:';
END
ELSE
BEGIN
    COMMIT TRANSACTION;
    PRINT 'RTDS vocalls dictionary seed complete.';
END

PRINT '  Dic_OperationType rows inserted: ' + CAST(@opTypeNew   AS varchar(10));
PRINT '  Dic_AttributeType rows inserted: ' + CAST(@attrTypeNew AS varchar(10));
PRINT '  Dic_Attribute     rows inserted: ' + CAST(@attrNew     AS varchar(10));
PRINT '  Dic_Attribute     rows updated:  ' + CAST(@attrUpd     AS varchar(10));
PRINT '  (0 on a line means that step had nothing to do.)';

/* ============================================================================
   SECTION 2b -- CHANGE LISTING (which keys, not just how many)
   ----------------------------------------------------------------------------
   Prints the rows captured by the OUTPUT clauses above. Runs AFTER the
   COMMIT/ROLLBACK on purpose: the @log* table variables are not transactional,
   so this listing survives the dry-run rollback and shows exactly what a real
   run WOULD do. Read-only -- it only reads the table variables and resolves
   ids to names against the (already committed or rolled-back) dictionary.
   ============================================================================ */
DECLARE @line varchar(500);

IF EXISTS (SELECT 1 FROM @logOpType)
BEGIN
    PRINT '';
    PRINT '  -- Dic_OperationType INSERTED --------------------------------';
    DECLARE cOpType CURSOR LOCAL FAST_FORWARD FOR
        SELECT '    + ' + Name FROM @logOpType ORDER BY Name;
    OPEN cOpType;
    FETCH NEXT FROM cOpType INTO @line;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        PRINT @line;
        FETCH NEXT FROM cOpType INTO @line;
    END
    CLOSE cOpType; DEALLOCATE cOpType;
END

IF EXISTS (SELECT 1 FROM @logAttrType)
BEGIN
    PRINT '';
    PRINT '  -- Dic_AttributeType INSERTED --------------------------------';
    DECLARE cAttrType CURSOR LOCAL FAST_FORWARD FOR
        SELECT '    + ' + Name FROM @logAttrType ORDER BY Name;
    OPEN cAttrType;
    FETCH NEXT FROM cAttrType INTO @line;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        PRINT @line;
        FETCH NEXT FROM cAttrType INTO @line;
    END
    CLOSE cAttrType; DEALLOCATE cAttrType;
END

IF EXISTS (SELECT 1 FROM @logAttrNew)
BEGIN
    PRINT '';
    PRINT '  -- Dic_Attribute INSERTED (operationType.attributeName : type) --';
    -- LEFT JOIN the dictionaries: on a dry run they have been rolled back, so a
    -- freshly-created op-type/attr-type id may no longer resolve -- fall back to
    -- the raw id rather than dropping the row from the listing.
    DECLARE cAttrNew CURSOR LOCAL FAST_FORWARD FOR
        SELECT '    + '
             + ISNULL(ot.Name, '#' + CAST(l.DicOperationTypeID AS varchar(10)))
             + '.' + l.Name
             + ' : ' + ISNULL(at.Name, '#' + CAST(l.DicAttributeTypeID AS varchar(10)))
             + CASE WHEN l.IsRequired = 1 THEN ' [required]' ELSE '' END
             + CASE WHEN l.IsNext     = 1 THEN ' [branch]'   ELSE '' END
        FROM   @logAttrNew l
        LEFT   JOIN rtds.Dic_OperationType ot ON ot.DicOperationTypeID = l.DicOperationTypeID
        LEFT   JOIN rtds.Dic_AttributeType at ON at.DicAttributeTypeID = l.DicAttributeTypeID
        ORDER BY ISNULL(ot.Name, ''), l.Name;
    OPEN cAttrNew;
    FETCH NEXT FROM cAttrNew INTO @line;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        PRINT @line;
        FETCH NEXT FROM cAttrNew INTO @line;
    END
    CLOSE cAttrNew; DEALLOCATE cAttrNew;
END

IF EXISTS (SELECT 1 FROM @logAttrUpd)
BEGIN
    PRINT '';
    PRINT '  -- Dic_Attribute UPDATED (old -> new; only changed fields shown) --';
    PRINT '  !! Review these: the seed is expected to be purely ADDITIVE here.';
    DECLARE cAttrUpd CURSOR LOCAL FAST_FORWARD FOR
        SELECT '    ~ '
             + ISNULL(ot.Name, '#' + CAST(l.DicOperationTypeID AS varchar(10)))
             + '.' + l.Name + ' :'
             + CASE WHEN l.OldTypeID <> l.NewTypeID
                    THEN ' type ' + ISNULL(dOld.Name, '#' + CAST(l.OldTypeID AS varchar(10)))
                       + '->'     + ISNULL(dNew.Name, '#' + CAST(l.NewTypeID AS varchar(10)))
                    ELSE '' END
             + CASE WHEN l.OldRequired  <> l.NewRequired
                    THEN ' isRequired '  + CAST(l.OldRequired  AS varchar(1)) + '->' + CAST(l.NewRequired  AS varchar(1)) ELSE '' END
             + CASE WHEN l.OldNext      <> l.NewNext
                    THEN ' isNext '      + CAST(l.OldNext      AS varchar(1)) + '->' + CAST(l.NewNext      AS varchar(1)) ELSE '' END
             + CASE WHEN l.OldDisplayed <> l.NewDisplayed
                    THEN ' isDisplayed ' + CAST(l.OldDisplayed AS varchar(1)) + '->' + CAST(l.NewDisplayed AS varchar(1)) ELSE '' END
             + CASE WHEN l.OldEditable  <> l.NewEditable
                    THEN ' isEditable '  + CAST(l.OldEditable  AS varchar(1)) + '->' + CAST(l.NewEditable  AS varchar(1)) ELSE '' END
        FROM   @logAttrUpd l
        LEFT   JOIN rtds.Dic_OperationType ot   ON ot.DicOperationTypeID   = l.DicOperationTypeID
        LEFT   JOIN rtds.Dic_AttributeType dOld ON dOld.DicAttributeTypeID = l.OldTypeID
        LEFT   JOIN rtds.Dic_AttributeType dNew ON dNew.DicAttributeTypeID = l.NewTypeID
        ORDER BY ISNULL(ot.Name, ''), l.Name;
    OPEN cAttrUpd;
    FETCH NEXT FROM cAttrUpd INTO @line;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        PRINT @line;
        FETCH NEXT FROM cAttrUpd INTO @line;
    END
    CLOSE cAttrUpd; DEALLOCATE cAttrUpd;
END

IF NOT EXISTS (SELECT 1 FROM @logOpType)
   AND NOT EXISTS (SELECT 1 FROM @logAttrType)
   AND NOT EXISTS (SELECT 1 FROM @logAttrNew)
   AND NOT EXISTS (SELECT 1 FROM @logAttrUpd)
BEGIN
    PRINT '';
    PRINT '  -- No changes: the dictionary already matches the seed. --';
END
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
WHERE   ot.Name IN ('setVariables', 'guard', 'guardTui', 'sendMail', 'sendSms', 'disconnect',
                    'say', 'menu', 'checkSchedule', 'flowJump',
                    'externalTransfer', 'internalTransfer')
ORDER BY ot.Name, da.IsNext, da.Name;
*/