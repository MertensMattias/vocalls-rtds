/* ============================================================================
   CAMELCASE CONTRACT VARIANT -- generated from the PascalCase originals.

   This file is one of THREE that together define a camelCase RTDS contract
   and MUST be used as a set (mixing with the PascalCase scripts will fail
   dictionary lookups):
       seed_operations_vocalls_dictionary_camelCase.sql
       new_import_routing_table_from_json_camelCase.sql
       export_routing_table_to_json_camelCase.sql

   Casing rule: lower-camelCase for every JSON key (header + operation fields),
   every operation TYPE value, and every attribute/param NAME. A single leading
   capital is lower-cased; a leading run of capitals (acronym) is fully
   lower-cased except the capital that begins the next word. So
   'NextStep_Success'->'nextStep_Success', 'SetVariables'->
   'setVariables', 'ANIConfirmation'->'aniConfirmation',
   'OutboundANI'->'outboundANI'. DB column names, language keys (NL/FR),
   datatype names (string/int/bit) and runtime ${...} tokens are NOT changed.
   ============================================================================ */

/* =============================================================================
   new_import_routing_table_from_json_camelCase.sql   (ALIGNED version, camelCase contract)

   Imports a single RTDS routing-table JSON document into [sqldb-app-acc].rtds.
   This is the corrected/aligned successor to import_routing_table_from_json.sql:
   same structure and ergonomics (dry-run, prints, MERGE-OUTPUT op insert,
   set-based attribute insert) with the locked decisions applied.

   Changes vs the original:
     1. PromptLibrary is FIND-OR-CREATEd on CompanyProjectID (one library per
        project). BasePath is stored from JSON but never used as a lookup key.
        A SECONDARY same-project promptLibraryId fallback binds an explicit id
        before create (cross-project ids are rejected by guard). (Original
        required promptLibraryId to pre-exist.)
     2. P2 stamps Prompt.DicPromptApplicationID from the TTS-bearing operation's
        ApplicationId param, so publish-created prompts appear in the
        application-filtered dropdown. Pre-existing prompts are re-stamped when
        the JSON carries a different ApplicationId (insert + update).
     3. P2 PromptVersion upsert is UPDATE + INSERT (no MERGE); Path is computed
        as Language\prompt_name.wav (never empty).
     4. New validations: UNKNOWN_PROJECT, UNKNOWN_APPLICATION, language in
        SupportedLanguages (hard reject), one prompt name -> one ApplicationId,
        TYPE_MISMATCH (each non-empty scalar conforms to its Dic_AttributeType;
        a ${...} token is a string, valid only on string-typed attributes;
        empty values are exempt), INVALID_NEXTSTEP (every IsNext branch target
        resolves to an operation Id in the flow; empty and ${...} exempt).
     5. camelCase JSON contract: SourceId / Name / Project / PromptLibrary /
        SupportedLanguages / Operations[].Id / Type / Name / IsFirstOperation /
        Params / TtsMessages. CompanyProjectID is resolved by Project NAME
        (Dic_CompanyProject.IAConfigCustomerName) PRIMARY, then by ProjectId as a
        SECONDARY fallback (announced as a WARN) when the name does not resolve --
        so renamed projects still re-import via the stable id. Likewise
        PromptLibraryID is find-by-CompanyProjectID PRIMARY, with a same-project
        PromptLibraryId fallback (the guard rejects a cross-project id) before
        find-or-create. ProjectId / PromptLibraryId are therefore informational on
        the happy path but load-bearing on these fallback paths.

   Naming note: prompt name is unique per library; key = (PromptLibraryID, Name).
   ApplicationId is the integer Dic_PromptApplication.DicPromptApplicationID and
   is required only on operations that carry TtsMessages (real flows legitimately
   have PlayPrompt operations with a Prompt but no ApplicationId, e.g. queue
   messages - those create no Prompt row here and need no stamp).

   ASCII-only, no template literals.
============================================================================= */

-- Pin the database context. The rtds schema lives in [sqldb-app-acc]; without
-- this USE the script compiles against whatever database the connection has
-- selected, and every rtds.* reference fails with "Invalid object name"
-- (Msg 208). The GO is required so the USE takes effect in its own batch before
-- the body below is compiled. Bracket-quoting is mandatory (the name has hyphens).
GO

-- Fail fast with an explanatory message if the rtds schema is absent in this
-- database (e.g. wrong DB, or the schema DDL was never run), instead of the
-- opaque Msg 208 on the first rtds.* reference.
IF OBJECT_ID(N'rtds.Dic_CompanyProject', N'U') IS NULL
    THROW 60099, 'SETUP_INCOMPLETE: rtds.Dic_CompanyProject not found in [sqldb-app-acc]. Run the schema DDL first and confirm the database name.', 1;

-- sp_AddHistory is called in replace mode to close out ConfigHistory before the
-- old config is deleted. Fail fast here with an explanatory message if the proc
-- is absent (schema script never run), rather than an opaque "Could not find
-- stored procedure" mid-transaction on a replace.
IF OBJECT_ID(N'rtds.sp_AddHistory', N'P') IS NULL
    THROW 60098, 'SETUP_INCOMPLETE: rtds.sp_AddHistory not found in [sqldb-app-acc]. Run the stored-procedure DDL (script (1).sql) first.', 1;

SET NOCOUNT OFF;
SET XACT_ABORT ON;

-- -----------------------------------------------------------------------------
-- INPUT
-- -----------------------------------------------------------------------------
DECLARE @json    NVARCHAR(MAX);
DECLARE @replace BIT = 1;                  -- 1 = overwrite, 0 = fail on dup
DECLARE @dryRun  BIT = 0;                  -- 1 = roll back at the end (preview)

SET @json = N'
{
  "sourceId": "+3257351226",
  "name": "DIGIPOLIS - DA_HELPDESK",
  "projectId": "",
  "project": "DA HELPDESK",
  "promptLibraryId": "",
  "promptLibrary": "DIGIPOLIS\\DA\\HELPDESK",
  "supportedLanguages": "NL",
  "operations": [
    {
      "id": "00000",
      "type": "setVariables",
      "name": "Call Initialization",
      "isFirstOperation": true,
      "params": {
        "active": true,
        "customerName": "DA",
        "customerProject": "HELPDESK",
        "routingId": "DA_HELPDESK",
        "ivrEvent": "9999",
        "ivrAction": "CT",
        "nextStep": "00001"
      }
    },
    {
      "id": "00001",
      "type": "say",
      "name": "Play: Welcome",
      "params": {
        "active": false,
        "applicationId": 11,
        "prompt": "Welcome_Welcome",
        "nextStep": "00002"
      }
    },
    {
      "id": "00002",
      "type": "say",
      "name": "Play: Exception",
      "params": {
        "active": false,
        "applicationId": 14,
        "prompt": "Exception_ExceptionAntwerpenBe",
        "nextStep": "00004"
      }
    },
    {
      "id": "00004",
      "type": "checkSchedule",
      "name": "Check: Scheduler",
      "params": {
        "active": true,
        "applicationId": 1,
        "scheduleId": 4039,
        "nextStep_Open": "00010",
        "nextStep_Closed": "00011",
        "nextStep_Transfer": "00012",
        "nextStep_Guard_Klantwacht": "00080",
        "nextStep_Guard_Systeemwacht": "00085",
        "nextStep_Failure": "00085",
        "nextStep": "00085"
      }
    },
    {
      "id": "00010",
      "type": "setVariables",
      "name": "Set: Congnos Open",
      "params": {
        "active": true,
        "ivrEvent": "1200",
        "ivrAction": "CT",
        "nextStep": "00015"
      }
    },
    {
      "id": "00011",
      "type": "setVariables",
      "name": "Set: Congnos Closed",
      "params": {
        "active": true,
        "ivrEvent": "1201",
        "ivrAction": "DC",
        "nextStep": "00098"
      }
    },
    {
      "id": "00012",
      "type": "setVariables",
      "name": "Set: Congnos Transfer",
      "params": {
        "active": true,
        "ivrEvent": "1200",
        "ivrAction": "TX",
        "nextStep": "00090"
      }
    },
    {
      "id": "00015",
      "type": "say",
      "name": "Play: Exception",
      "params": {
        "active": false,
        "applicationId": 14,
        "prompt": "Exception_ExceptionAntwerpenBe",
        "nextStep": "00024"
      }
    },
    {
      "id": "00024",
      "type": "say",
      "name": "Play: Extra",
      "params": {
        "active": false,
        "applicationId": 6,
        "prompt": "AdHoc_Extra_Xtremis.wav",
        "nextStep": "00060"
      }
    },
    {
      "id": "00060",
      "type": "internalTransfer",
      "name": "Route-To: Workgroup",
      "params": {
        "active": true,
        "target": "578041",
        "parameters": "",
        "attendTransfer": false,
        "timeout": 30,
        "nextStep_Failure": "00100",
        "nextStep": "00100"
      }
    },
    {
      "id": "00080",
      "type": "setVariables",
      "name": "Set: Congnos Guard Klantwacht",
      "params": {
        "active": true,
        "ivrEvent": "1204",
        "ivrAction": "GD01",
        "nextStep": "00081"
      }
    },
    {
      "id": "00081",
      "type": "externalTransfer",
      "name": "Route-To: DA_KLANTWACHT",
      "params": {
        "active": true,
        "phoneNumber": "+3257352046",
        "outboundANI": "",
        "parameters": "",
        "attendTransfer": false,
        "timeout": 30,
        "nextStep_Failure": "00098",
        "nextStep": "00100"
      }
    },
    {
      "id": "00085",
      "type": "setVariables",
      "name": "Set: Congnos Guard Systeemwacht",
      "params": {
        "active": true,
        "ivrEvent": "1204",
        "ivrAction": "GD02",
        "nextStep": "00086"
      }
    },
    {
      "id": "00086",
      "type": "externalTransfer",
      "name": "Route-To: DA_SYSTEEMWACHT",
      "params": {
        "active": true,
        "phoneNumber": "+3257352048",
        "outboundANI": "",
        "parameters": "",
        "attendTransfer": false,
        "timeout": 30,
        "nextStep_Failure": "00098",
        "nextStep": "00100"
      }
    },
    {
      "id": "00090",
      "type": "externalTransfer",
      "name": "Route-To: External Number",
      "params": {
        "active": true,
        "phoneNumber": "",
        "outboundANI": "",
        "parameters": "",
        "attendTransfer": false,
        "timeout": 30,
        "nextStep_Failure": "00098",
        "nextStep": "00100"
      }
    },

    {
      "id": "00098",
      "type": "setVariables",
      "name": "Set: Congnos Error",
      "params": {
        "active": true,
        "ivrEvent": "1200",
        "ivrAction": "CT",
        "nextStep": "00099"
      }
    },
    {
      "id": "00099",
      "type": "disconnect",
      "name": "RTDS: IVR Error",
      "params": {
        "prompt": "Scheduler_ClosedDisconnect.wav"
      }
    },
    {
      "id": "00100",
      "type": "disconnect",
      "name": "RTDS: Disconnect",
      "params": {}
    }
  ]
}';

-- -----------------------------------------------------------------------------
-- METADATA
-- -----------------------------------------------------------------------------
DECLARE @user VARCHAR(50)   = SUSER_SNAME();
DECLARE @now  DATETIME2     = SYSUTCDATETIME();

-- -----------------------------------------------------------------------------
-- TOP-LEVEL FIELD EXTRACTION
-- -----------------------------------------------------------------------------
DECLARE @SourceID            VARCHAR(50);
DECLARE @Name                VARCHAR(255);
DECLARE @CompanyProjectID    INT;
DECLARE @BasePath            VARCHAR(255);
DECLARE @SupportedLanguages  VARCHAR(50);
DECLARE @PromptLibraryID     INT;            -- derived (find-or-create), not from JSON

IF @json IS NULL OR ISJSON(@json) = 0
    THROW 60000, 'Input JSON is null or not valid JSON', 1;

DECLARE @Project             VARCHAR(255);

SELECT
    @SourceID           = JSON_VALUE(@json, '$.sourceId'),
    @Name               = JSON_VALUE(@json, '$.name'),
    @Project            = JSON_VALUE(@json, '$.project'),
    @BasePath           = JSON_VALUE(@json, '$.promptLibrary'),
    @SupportedLanguages = JSON_VALUE(@json, '$.supportedLanguages');

IF @SourceID           IS NULL THROW 60001, 'MISSING_FIELD: SourceId',           1;
IF @Name               IS NULL THROW 60002, 'MISSING_FIELD: Name',               1;
IF @Project            IS NULL THROW 60003, 'MISSING_FIELD: Project',            1;
IF @BasePath           IS NULL THROW 60004, 'MISSING_FIELD: PromptLibrary',      1;
IF @SupportedLanguages IS NULL THROW 60005, 'MISSING_FIELD: SupportedLanguages', 1;

-- Resolve CompanyProjectID. PRIMARY key is Project NAME. SECONDARY (fallback)
-- is the otherwise-informational projectId, used only when the name does not
-- resolve -- this keeps round-tripped exports resilient to a project rename
-- (the name lookup misses, but the stable CompanyProjectID still binds). When
-- the fallback fires it is announced as a WARN so by-id binding is never silent;
-- a stale numeric projectId would otherwise mis-bind without a trace. An empty
-- projectId ('' -> TRY_CAST NULL) correctly skips the fallback. UNKNOWN_PROJECT
-- only when neither name nor id resolves.
DECLARE @ProjectIdJson INT = TRY_CAST(JSON_VALUE(@json, '$.projectId') AS INT);

SELECT @CompanyProjectID = CompanyProjectID
FROM   rtds.Dic_CompanyProject
WHERE  IAConfigCustomerName = @Project;

IF @CompanyProjectID IS NULL AND @ProjectIdJson IS NOT NULL
BEGIN
    SELECT @CompanyProjectID = CompanyProjectID
    FROM   rtds.Dic_CompanyProject
    WHERE  CompanyProjectID = @ProjectIdJson;

    IF @CompanyProjectID IS NOT NULL
        PRINT '[RTDS][WARN] PROJECT_RESOLVED_BY_ID: name=''' + @Project
            + ''' not found in Dic_CompanyProject; used projectId='
            + CAST(@ProjectIdJson AS VARCHAR(20)) + '.';
END;

IF @CompanyProjectID IS NULL
    THROW 60006, 'UNKNOWN_PROJECT', 1;

-- Startup banner: echo the resolved header so the run log opens with exactly
-- what is about to be imported (and in which mode) before any parsing happens.
PRINT '================================================================';
PRINT '[RTDS] Routing-table import starting.';
PRINT '  SourceID       : ' + @SourceID;
PRINT '  Name           : ' + @Name;
PRINT '  Project        : ' + @Project + ' (CompanyProjectID=' + CAST(@CompanyProjectID AS VARCHAR(20)) + ')';
PRINT '  PromptLibrary  : ' + @BasePath;
PRINT '  Languages      : ' + @SupportedLanguages;
PRINT '  Mode           : replace=' + CAST(@replace AS VARCHAR(1)) + ', dryRun=' + CAST(@dryRun AS VARCHAR(1));
PRINT '  Run by / at    : ' + @user + ' / ' + CONVERT(VARCHAR(30), @now, 126) + 'Z';
PRINT '================================================================';

-- -----------------------------------------------------------------------------
-- PARSE OPERATIONS
-- -----------------------------------------------------------------------------
PRINT '[RTDS][INFO] Parsing operations...';
DECLARE @ops TABLE (
    Ordinal             INT             NOT NULL,
    OpKey               NVARCHAR(255)   NOT NULL,
    OpType              VARCHAR(255)    NOT NULL,
    OpName              VARCHAR(255)    NOT NULL,
    IsFirst             BIT             NOT NULL,
    ParamsJson          NVARCHAR(MAX)   NULL,
    TtsJson             NVARCHAR(MAX)   NULL,
    DicOperationTypeID  INT             NULL,
    OperationID         INT             NULL
);

INSERT INTO @ops (Ordinal, OpKey, OpType, OpName, IsFirst, ParamsJson, TtsJson)
SELECT
    TRY_CAST(o.[key] AS INT),
    JSON_VALUE(o.[value], '$.id'),
    JSON_VALUE(o.[value], '$.type'),
    JSON_VALUE(o.[value], '$.name'),
    CASE WHEN JSON_VALUE(o.[value], '$.isFirstOperation') = 'true' THEN 1 ELSE 0 END,
    JSON_QUERY(o.[value], '$.params'),
    JSON_QUERY(o.[value], '$.ttsMessages')
FROM OPENJSON(@json, '$.operations') o;

UPDATE op
SET    op.DicOperationTypeID = dot.DicOperationTypeID
FROM   @ops op
JOIN   rtds.Dic_OperationType dot ON dot.Name = op.OpType;

IF EXISTS (SELECT 1 FROM @ops WHERE DicOperationTypeID IS NULL)
BEGIN
    DECLARE @badType VARCHAR(255);
    SELECT TOP 1 @badType = OpType FROM @ops WHERE DicOperationTypeID IS NULL;
    RAISERROR ('UNKNOWN_OPERATION_TYPE: %s', 16, 1, @badType);
    RETURN;
END;

DECLARE @logOpCount INT = (SELECT COUNT(*) FROM @ops);
PRINT '[RTDS][INFO] Operations parsed: ' + CAST(@logOpCount AS VARCHAR(20)) + ' (all types resolved).';

-- -----------------------------------------------------------------------------
-- PARSE PARAMS (one row per operation x param)
-- OPENJSON [type]: 1=string 2=number 3=boolean 4=array 5=object 0=null
-- -----------------------------------------------------------------------------
PRINT '[RTDS][INFO] Parsing and validating params...';
DECLARE @params TABLE (
    OpKey               NVARCHAR(255)   NOT NULL,
    DicOperationTypeID  INT             NOT NULL,
    Ordinal             INT             NOT NULL,  -- param position within its operation (authored JSON order)
    ParamName           NVARCHAR(255)   NOT NULL,
    JsonType            INT             NOT NULL,
    RawValue            NVARCHAR(MAX)   NULL,
    Scalar              NVARCHAR(MAX)   NULL,
    Flag1               NVARCHAR(50)    NULL,
    Flag2               NVARCHAR(50)    NULL,
    DicAttributeID      INT             NULL,
    IsDisplayed         BIT             NULL,
    IsEditable          BIT             NULL
);

INSERT INTO @params (OpKey, DicOperationTypeID, Ordinal, ParamName, JsonType, RawValue)
SELECT op.OpKey, op.DicOperationTypeID,
       ROW_NUMBER() OVER (PARTITION BY op.OpKey ORDER BY (SELECT NULL)),
       p.[key], p.[type], p.[value]
FROM   @ops op
CROSS APPLY OPENJSON(op.ParamsJson) p;

UPDATE @params
SET Scalar = CASE WHEN JsonType = 4 THEN JSON_VALUE(RawValue, '$[0]') ELSE RawValue END,
    Flag1  = CASE WHEN JsonType = 4 THEN JSON_VALUE(RawValue, '$[1]') ELSE NULL END,
    Flag2  = CASE WHEN JsonType = 4 THEN JSON_VALUE(RawValue, '$[2]') ELSE NULL END;

UPDATE p
SET p.DicAttributeID = da.DicAttributeID,
    p.IsDisplayed = CASE
        WHEN p.Flag1 = 'isDisplayed'    OR p.Flag2 = 'isDisplayed'    THEN 1
        WHEN p.Flag1 = 'isNotDisplayed' OR p.Flag2 = 'isNotDisplayed' THEN 0
        ELSE da.IsDisplayed
    END,
    p.IsEditable = CASE
        WHEN p.Flag1 = 'isEditable'    OR p.Flag2 = 'isEditable'    THEN 1
        WHEN p.Flag1 = 'isNotEditable' OR p.Flag2 = 'isNotEditable' THEN 0
        ELSE da.IsEditable
    END
FROM @params p
JOIN rtds.Dic_Attribute da
  ON da.DicOperationTypeID = p.DicOperationTypeID
 AND da.Name               = p.ParamName;

IF EXISTS (SELECT 1 FROM @params WHERE DicAttributeID IS NULL)
BEGIN
    DECLARE @badPname VARCHAR(255), @badOpKey NVARCHAR(255);
    SELECT TOP 1 @badPname = ParamName, @badOpKey = OpKey
    FROM @params WHERE DicAttributeID IS NULL;
    RAISERROR ('UNKNOWN_PARAM: op=%s param=%s', 16, 1, @badOpKey, @badPname);
    RETURN;
END;

-- -----------------------------------------------------------------------------
-- TYPE VALIDATION: each non-empty scalar must conform to its Dic_AttributeType.
-- A ${...} runtime token is a STRING, so it is valid only on a 'string'-typed
-- attribute; a token on a 'bit'/'int' attribute does not parse and therefore
-- raises TYPE_MISMATCH (no token exemption). Empty/NULL values (omitted
-- optionals) are exempt. 'bit'/'int' tolerated alongside 'boolean'/'integer'
-- for pre-migration dictionaries. 'string' accepts anything (tokens included).
-- -----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1
    FROM @params p
    JOIN rtds.Dic_Attribute      da ON da.DicAttributeID     = p.DicAttributeID
    JOIN rtds.Dic_AttributeType  dt ON dt.DicAttributeTypeID = da.DicAttributeTypeID
    WHERE NULLIF(LTRIM(RTRIM(p.Scalar)), '') IS NOT NULL
      AND ((dt.Name IN ('boolean', 'bit') AND LOWER(p.Scalar) NOT IN ('true', 'false', '1', '0'))
        OR (dt.Name IN ('integer', 'int') AND TRY_CONVERT(BIGINT, p.Scalar) IS NULL)))
BEGIN
    DECLARE @tmOp NVARCHAR(255), @tmParam NVARCHAR(255), @tmType VARCHAR(50), @tmVal NVARCHAR(200);
    SELECT TOP 1
        @tmOp = p.OpKey, @tmParam = p.ParamName, @tmType = dt.Name,
        @tmVal = LEFT(p.Scalar, 200)
    FROM @params p
    JOIN rtds.Dic_Attribute      da ON da.DicAttributeID     = p.DicAttributeID
    JOIN rtds.Dic_AttributeType  dt ON dt.DicAttributeTypeID = da.DicAttributeTypeID
    WHERE NULLIF(LTRIM(RTRIM(p.Scalar)), '') IS NOT NULL
      AND ((dt.Name IN ('boolean', 'bit') AND LOWER(p.Scalar) NOT IN ('true', 'false', '1', '0'))
        OR (dt.Name IN ('integer', 'int') AND TRY_CONVERT(BIGINT, p.Scalar) IS NULL));
    RAISERROR ('TYPE_MISMATCH: op=%s param=%s expected=%s value=%s', 16, 1,
               @tmOp, @tmParam, @tmType, @tmVal);
    RETURN;
END;

-- -----------------------------------------------------------------------------
-- NEXTSTEP INTEGRITY: every branch-target param (Dic_Attribute.IsNext = 1) must
-- point to an operation Id present in this payload. Empty values (end of flow)
-- and ${...} tokens (resolved at runtime) are exempt. Depends on IsNext being
-- set in the dictionary for the NextStep* family.
-- -----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1
    FROM @params p
    JOIN rtds.Dic_Attribute da ON da.DicAttributeID = p.DicAttributeID
    WHERE da.IsNext = 1
      AND NULLIF(LTRIM(RTRIM(p.Scalar)), '') IS NOT NULL
      AND p.Scalar NOT LIKE '%${%'
      AND NOT EXISTS (SELECT 1 FROM @ops o WHERE o.OpKey = p.Scalar))
BEGIN
    DECLARE @nsOp NVARCHAR(255), @nsParam NVARCHAR(255), @nsTgt NVARCHAR(200);
    SELECT TOP 1
        @nsOp = p.OpKey, @nsParam = p.ParamName, @nsTgt = LEFT(p.Scalar, 200)
    FROM @params p
    JOIN rtds.Dic_Attribute da ON da.DicAttributeID = p.DicAttributeID
    WHERE da.IsNext = 1
      AND NULLIF(LTRIM(RTRIM(p.Scalar)), '') IS NOT NULL
      AND p.Scalar NOT LIKE '%${%'
      AND NOT EXISTS (SELECT 1 FROM @ops o WHERE o.OpKey = p.Scalar);
    RAISERROR ('INVALID_NEXTSTEP: op=%s param=%s target=%s not found in flow', 16, 1,
               @nsOp, @nsParam, @nsTgt);
    RETURN;
END;

DECLARE @logParamCount INT = (SELECT COUNT(*) FROM @params);
PRINT '[RTDS][INFO] Params parsed: ' + CAST(@logParamCount AS VARCHAR(20))
    + ' (dictionary, type and nextStep checks passed).';

-- -----------------------------------------------------------------------------
-- PARSE TTS MESSAGES
-- -----------------------------------------------------------------------------
PRINT '[RTDS][INFO] Parsing and validating TTS messages...';
DECLARE @tts TABLE (
    OpKey                NVARCHAR(255)   NOT NULL,
    Language             VARCHAR(5)      NOT NULL,
    [Text]               NVARCHAR(MAX)   NULL,
    PromptName           NVARCHAR(255)   NULL,
    ApplicationId        INT             NULL,
    DicPromptLanguageID  INT             NULL,
    PromptID             INT             NULL
);

INSERT INTO @tts (OpKey, Language, [Text])
SELECT op.OpKey, t.[key], t.[value]
FROM   @ops op
CROSS APPLY OPENJSON(op.TtsJson) t
WHERE  op.TtsJson IS NOT NULL;

-- Resolve PromptName from the op's Prompt param (scalar or [value, flags])
UPDATE t
SET t.PromptName = p.Scalar
FROM @tts t
JOIN @params p ON p.OpKey = t.OpKey AND p.ParamName = 'prompt';

-- Resolve ApplicationId from the op's ApplicationId param (integer, used to stamp)
UPDATE t
SET t.ApplicationId = TRY_CAST(p.Scalar AS INT)
FROM @tts t
JOIN @params p ON p.OpKey = t.OpKey AND p.ParamName = 'applicationId';

-- Resolve DicPromptLanguageID
UPDATE t
SET t.DicPromptLanguageID = dl.DicPromptLanguageID
FROM @tts t
JOIN rtds.Dic_PromptLanguage dl ON dl.[Key] = t.Language;

-- Validations on TTS rows --------------------------------------------------
IF EXISTS (SELECT 1 FROM @tts WHERE DicPromptLanguageID IS NULL)
BEGIN
    DECLARE @badLang VARCHAR(5);
    SELECT TOP 1 @badLang = Language FROM @tts WHERE DicPromptLanguageID IS NULL;
    RAISERROR ('UNKNOWN_LANGUAGE: %s', 16, 1, @badLang);
    RETURN;
END;

-- Language must be listed in SupportedLanguages (pipe-delimited; check tolerant of , or |)
IF EXISTS (
    SELECT 1 FROM @tts t
    WHERE '|' + REPLACE(@SupportedLanguages, ',', '|') + '|'
          NOT LIKE '%|' + t.Language + '|%')
BEGIN
    DECLARE @langNS VARCHAR(5);
    SELECT TOP 1 @langNS = Language FROM @tts t
    WHERE '|' + REPLACE(@SupportedLanguages, ',', '|') + '|'
          NOT LIKE '%|' + t.Language + '|%';
    RAISERROR ('LANGUAGE_NOT_IN_SUPPORTED: %s', 16, 1, @langNS);
    RETURN;
END;

IF EXISTS (SELECT 1 FROM @tts WHERE PromptName IS NULL OR PromptName = '')
BEGIN
    DECLARE @badTtsOp NVARCHAR(255);
    SELECT TOP 1 @badTtsOp = OpKey FROM @tts WHERE PromptName IS NULL OR PromptName = '';
    RAISERROR ('TTS_WITHOUT_PROMPT_PARAM: op=%s', 16, 1, @badTtsOp);
    RETURN;
END;

-- TTS-bearing op must carry an ApplicationId (needed to stamp the new prompt)
IF EXISTS (SELECT 1 FROM @tts WHERE ApplicationId IS NULL)
BEGIN
    DECLARE @noAppOp NVARCHAR(255);
    SELECT TOP 1 @noAppOp = OpKey FROM @tts WHERE ApplicationId IS NULL;
    RAISERROR ('TTS_WITHOUT_APPLICATION: op=%s', 16, 1, @noAppOp);
    RETURN;
END;

-- ApplicationId must resolve (UNKNOWN_APPLICATION)
IF EXISTS (
    SELECT 1 FROM @tts t
    WHERE NOT EXISTS (SELECT 1 FROM rtds.Dic_PromptApplication pa
                      WHERE pa.DicPromptApplicationID = t.ApplicationId))
BEGIN
    DECLARE @badApp INT;
    SELECT TOP 1 @badApp = ApplicationId FROM @tts t
    WHERE NOT EXISTS (SELECT 1 FROM rtds.Dic_PromptApplication pa
                      WHERE pa.DicPromptApplicationID = t.ApplicationId);
    RAISERROR ('UNKNOWN_APPLICATION: %d', 16, 1, @badApp);
    RETURN;
END;

-- Name is unique per library: a name must map to a single ApplicationId
IF EXISTS (
    SELECT PromptName FROM @tts
    GROUP BY PromptName HAVING COUNT(DISTINCT ApplicationId) > 1)
BEGIN
    DECLARE @dupName NVARCHAR(255);
    SELECT TOP 1 @dupName = PromptName FROM @tts
    GROUP BY PromptName HAVING COUNT(DISTINCT ApplicationId) > 1;
    RAISERROR ('PROMPT_NAME_MULTIPLE_APPLICATIONS: %s', 16, 1, @dupName);
    RETURN;
END;

DECLARE @logTtsCount INT = (SELECT COUNT(*) FROM @tts);
DECLARE @logTtsPromptCount INT = (SELECT COUNT(DISTINCT PromptName) FROM @tts);
PRINT '[RTDS][INFO] TTS messages parsed: ' + CAST(@logTtsCount AS VARCHAR(20))
    + ' row(s) across ' + CAST(@logTtsPromptCount AS VARCHAR(20))
    + ' prompt(s). All validations passed.';

-- -----------------------------------------------------------------------------
-- WRITE TRANSACTION
-- -----------------------------------------------------------------------------
PRINT '[RTDS][INFO] All checks passed; opening write transaction...';
BEGIN TRY
    BEGIN TRAN;

    -- Replace mode: cascade-delete existing entry (prompts are NOT deleted)
    DECLARE @ExistingRtId INT;
    SELECT @ExistingRtId = RoutingTableID FROM rtds.RoutingTable WHERE SourceID = @SourceID;

    IF @ExistingRtId IS NOT NULL
    BEGIN
        IF @replace = 0 THROW 60020, 'DUPLICATE_SOURCE_ID', 1;

        -- Audit the about-to-be-replaced config BEFORE deleting it. sp_AddHistory
        -- in DELETE mode (@Data = 'DELETE|<SourceId>') closes out (stamps EndDateUTC)
        -- every still-open ConfigHistory row for this SourceID, so the history table
        -- records that this config version ended at @now. Same transaction: on
        -- @dryRun or any failure below, this close-out rolls back with the rest.
        PRINT '[RTDS][INFO] Existing config found (RoutingTableID=' + CAST(@ExistingRtId AS VARCHAR(20))
            + '); calling rtds.sp_AddHistory to close out ConfigHistory before delete.';
        -- EXEC parameters cannot be expressions, so build the 'DELETE|<SourceId>'
        -- payload into a variable first. sp_AddHistory's DELETE branch parses it as
        -- REPLACE(@Data,'DELETE|','') -> SourceId.
        DECLARE @historyDelete NVARCHAR(MAX) = N'DELETE|' + @SourceID;
        EXEC rtds.sp_AddHistory @Data = @historyDelete, @PublishDate = @now;
        PRINT '[RTDS][INFO] ConfigHistory closed out for SourceID=' + @SourceID + '.';

        PRINT '[RTDS][INFO] Cascade-deleting existing Attribute/Operation/RoutingTable rows...';
        DELETE rtds.Attribute
        WHERE  OperationID IN (SELECT OperationID FROM rtds.Operation WHERE RoutingTableID = @ExistingRtId);
        DELETE rtds.Operation    WHERE RoutingTableID = @ExistingRtId;
        DELETE rtds.RoutingTable WHERE RoutingTableID = @ExistingRtId;
        PRINT '[RTDS][INFO] Existing config deleted.';
    END
    ELSE
    BEGIN
        PRINT '[RTDS][INFO] No existing config for SourceID=' + @SourceID + ' (fresh import; no history close-out).';
    END;

    -- PromptLibrary resolution. A project can own MANY libraries (e.g. project
    -- NALLO has RECEPTION, HELPDESK, WFM, ...), so the key that uniquely
    -- identifies a library is (CompanyProjectID, BasePath) -- NOT CompanyProjectID
    -- alone. The PRIMARY lookup is therefore find-by-(CompanyProjectID, BasePath);
    -- BasePath is the JSON 'promptLibrary' value. The SECONDARY (fallback) honours
    -- the otherwise-informational promptLibraryId, but ONLY a row that already
    -- belongs to THIS CompanyProjectID -- adopting a different project's library by
    -- id would attach foreign Prompt rows (keyed on PromptLibraryID) to this flow,
    -- so the same-project guard rejects that cross-project case. TERTIARY: create
    -- a new library for (CompanyProjectID, BasePath).
    DECLARE @PromptLibraryIdJson INT = TRY_CAST(JSON_VALUE(@json, '$.promptLibraryId') AS INT);

    SELECT @PromptLibraryID = PromptLibraryID
    FROM   rtds.PromptLibrary
    WHERE  CompanyProjectID = @CompanyProjectID
      AND  BasePath         = @BasePath;

    IF @PromptLibraryID IS NULL AND @PromptLibraryIdJson IS NOT NULL
        SELECT @PromptLibraryID = PromptLibraryID
        FROM   rtds.PromptLibrary
        WHERE  PromptLibraryID  = @PromptLibraryIdJson
          AND  CompanyProjectID = @CompanyProjectID;   -- guard: never cross projects

    IF @PromptLibraryID IS NULL
    BEGIN
        INSERT INTO rtds.PromptLibrary (CompanyProjectID, BasePath, DateCreated, CreatedBy)
        VALUES (@CompanyProjectID, @BasePath, @now, @user);
        SET @PromptLibraryID = SCOPE_IDENTITY();
        PRINT '[RTDS][INFO] PromptLibrary created (PromptLibraryID=' + CAST(@PromptLibraryID AS VARCHAR(20)) + ').';
    END
    ELSE
        PRINT '[RTDS][INFO] PromptLibrary resolved (PromptLibraryID=' + CAST(@PromptLibraryID AS VARCHAR(20)) + ').';

    -- Insert RoutingTable header
    DECLARE @RoutingTableID INT;
    INSERT INTO rtds.RoutingTable
        (SourceID, Name, CompanyProjectID, PromptLibraryID, SupportedLanguages, DateCreated, CreatedBy)
    VALUES
        (@SourceID, @Name, @CompanyProjectID, @PromptLibraryID, @SupportedLanguages, @now, @user);
    SET @RoutingTableID = SCOPE_IDENTITY();
    PRINT '[RTDS][INFO] RoutingTable header inserted (RoutingTableID=' + CAST(@RoutingTableID AS VARCHAR(20)) + ').';

    -- Insert Operations in document order: INSERT ... SELECT ... ORDER BY assigns
    -- OperationID (identity) in @ops.Ordinal order, so the export (which emits
    -- operations ORDER BY OperationID) round-trips the authored order. OpKey is
    -- persisted in Operation.[Key], so the OpKey -> OperationID map is recovered by
    -- joining back on (RoutingTableID, [Key]) -- no MERGE/OUTPUT needed.
    INSERT INTO rtds.Operation
        (RoutingTableID, DicOperationTypeID, Name, [Key], IsFirstOperation, DateCreated, CreatedBy)
    SELECT @RoutingTableID, src.DicOperationTypeID, src.OpName, src.OpKey, src.IsFirst, @now, @user
    FROM   @ops src
    ORDER BY src.Ordinal;
    PRINT '[RTDS][INFO] Operations inserted: ' + CAST(@@ROWCOUNT AS VARCHAR(20)) + '.';

    UPDATE op SET op.OperationID = o.OperationID
    FROM @ops op
    JOIN rtds.Operation o ON o.RoutingTableID = @RoutingTableID AND o.[Key] = op.OpKey;

    -- Insert Attributes set-based, in authored order: ORDER BY assigns AttributeID
    -- (identity) by operation order then param order, so the export (params ordered
    -- WITHIN GROUP BY AttributeID) reproduces the order params appeared in the JSON.
    INSERT INTO rtds.Attribute
        (DicAttributeID, OperationID, Value, IsDisplayed, IsEditable, DateCreated, CreatedBy)
    SELECT p.DicAttributeID, op.OperationID, ISNULL(p.Scalar, ''), p.IsDisplayed, p.IsEditable, @now, @user
    FROM   @params p
    JOIN   @ops op ON op.OpKey = p.OpKey
    ORDER BY op.Ordinal, p.Ordinal;
    PRINT '[RTDS][INFO] Attributes inserted: ' + CAST(@@ROWCOUNT AS VARCHAR(20)) + '.';

    -- ---------------------------------------------------------------------
    -- P2: TTS messages (only if any present)
    -- ---------------------------------------------------------------------
    DECLARE @ttsCount INT = (SELECT COUNT(*) FROM @tts);
    IF @ttsCount > 0
    BEGIN
        PRINT '[RTDS][INFO] Writing prompts and prompt versions...';
        -- Per-step row counts. @@ROWCOUNT is reset by the very next statement
        -- (PRINT included), so capture each into a variable on the next line.
        DECLARE @rcPromptIns INT, @rcPromptUpd INT, @rcPvUpd INT, @rcPvIns INT;

        -- Ensure Prompt rows (idempotent on (library, name)); stamp ApplicationId
        INSERT INTO rtds.Prompt
            (PromptLibraryID, DicPromptApplicationID, Name, IsDisplayed, DateCreated, CreatedBy)
        SELECT DISTINCT @PromptLibraryID, t.ApplicationId, t.PromptName, 1, @now, @user
        FROM   @tts t
        WHERE  NOT EXISTS (SELECT 1 FROM rtds.Prompt p
                           WHERE p.PromptLibraryID = @PromptLibraryID AND p.Name = t.PromptName);
        SET @rcPromptIns = @@ROWCOUNT;

        -- Re-stamp ApplicationId on pre-existing prompts when the JSON differs
        -- (insert-only stamping would silently keep a stale/NULL application)
        UPDATE p
        SET    p.DicPromptApplicationID = t.ApplicationId,
               p.DateUpdated            = @now,
               p.UpdatedBy              = @user
        FROM   rtds.Prompt p
        JOIN   (SELECT DISTINCT PromptName, ApplicationId FROM @tts) t
               ON  p.PromptLibraryID = @PromptLibraryID
               AND p.Name            = t.PromptName
        WHERE  ISNULL(p.DicPromptApplicationID, -1) <> t.ApplicationId;
        SET @rcPromptUpd = @@ROWCOUNT;

        UPDATE t SET t.PromptID = p.PromptID
        FROM @tts t
        JOIN rtds.Prompt p ON p.PromptLibraryID = @PromptLibraryID AND p.Name = t.PromptName;

        -- Upsert PromptVersion via UPDATE + INSERT (no MERGE).
        -- Path = Language\prompt_name.wav (target path; audio generation deferred).
        --
        -- Dedupe FIRST: a prompt name is shared across the library, so two flow
        -- nodes that reference the same Prompt (e.g. two PlayPrompt steps both
        -- naming 'Exception_ExceptionAntwerpenBe') resolve to the SAME PromptID.
        -- That yields multiple @tts rows with identical (PromptID, language).
        -- PromptVersion is keyed UNIQUE on (PromptID, DicPromptLanguageID), so a
        -- raw set-based INSERT of both rows violates IDX_PromptVersion_*
        -- (Msg 2601), and the UPDATE-by-join would be non-deterministic if the
        -- duplicated nodes carried different Text. Collapse to one row per
        -- (PromptID, language), choosing deterministically by lowest authoring
        -- OpKey, then drive both the UPDATE and the INSERT off that set.
        DECLARE @ttsPV TABLE (
            PromptID            INT             NOT NULL,
            DicPromptLanguageID INT             NOT NULL,
            Language            VARCHAR(5)       NOT NULL,
            PromptName          NVARCHAR(255)    NOT NULL,
            [Text]              NVARCHAR(MAX)    NULL,
            PRIMARY KEY (PromptID, DicPromptLanguageID)
        );

        INSERT INTO @ttsPV (PromptID, DicPromptLanguageID, Language, PromptName, [Text])
        SELECT d.PromptID, d.DicPromptLanguageID, d.Language, d.PromptName, d.[Text]
        FROM (
            SELECT t.PromptID, t.DicPromptLanguageID, t.Language, t.PromptName, t.[Text],
                   ROW_NUMBER() OVER (
                       PARTITION BY t.PromptID, t.DicPromptLanguageID
                       ORDER BY t.OpKey) AS rn
            FROM @tts t
            WHERE t.PromptID IS NOT NULL
        ) d
        WHERE d.rn = 1;

        UPDATE pv
            SET pv.[Text] = t.[Text], pv.DateUpdated = @now, pv.UpdatedBy = @user
        FROM rtds.PromptVersion pv
        JOIN @ttsPV t ON t.PromptID = pv.PromptID
                     AND t.DicPromptLanguageID = pv.DicPromptLanguageID
        WHERE ISNULL(pv.[Text], '') <> ISNULL(t.[Text], '');
        SET @rcPvUpd = @@ROWCOUNT;

        INSERT INTO rtds.PromptVersion
            (PromptID, DicPromptLanguageID, Path, [Text], DateCreated, CreatedBy)
        SELECT t.PromptID, t.DicPromptLanguageID,
               t.Language + '\' + t.PromptName + '.wav', t.[Text], @now, @user
        FROM   @ttsPV t
        WHERE  NOT EXISTS (SELECT 1 FROM rtds.PromptVersion pv
                           WHERE pv.PromptID = t.PromptID
                             AND pv.DicPromptLanguageID = t.DicPromptLanguageID);
        SET @rcPvIns = @@ROWCOUNT;

        PRINT '[RTDS][INFO] Prompts: ' + CAST(@rcPromptIns AS VARCHAR(20)) + ' new, '
            + CAST(@rcPromptUpd AS VARCHAR(20)) + ' re-stamped; PromptVersions: '
            + CAST(@rcPvIns AS VARCHAR(20)) + ' new, ' + CAST(@rcPvUpd AS VARCHAR(20)) + ' updated.';
    END
    ELSE
        PRINT '[RTDS][INFO] No TTS messages; skipping prompt/version writes.';

    DECLARE @opCount     INT = (SELECT COUNT(*) FROM @ops);
    DECLARE @attrCount   INT = (SELECT COUNT(*) FROM @params);
    DECLARE @promptCount INT = (SELECT COUNT(DISTINCT PromptName) FROM @tts);

    PRINT '----------------------------------------------------------------';
    IF @dryRun = 1
    BEGIN
        ROLLBACK;
        PRINT '[RTDS][DONE] DRY RUN rolled back - no changes persisted.';
        PRINT '  SourceID       : ' + @SourceID;
        PRINT '  Would-be RtID  : ' + CAST(@RoutingTableID AS VARCHAR(20));
        PRINT '  Operations     : ' + CAST(@opCount   AS VARCHAR(20));
        PRINT '  Attributes     : ' + CAST(@attrCount AS VARCHAR(20));
        PRINT '  TTS rows       : ' + CAST(@ttsCount  AS VARCHAR(20))
                                   + ' across ' + CAST(@promptCount AS VARCHAR(20)) + ' prompt(s)';
    END
    ELSE
    BEGIN
        COMMIT;
        PRINT '[RTDS][DONE] Routing table imported (committed).';
        PRINT '  SourceID       : ' + @SourceID;
        PRINT '  RoutingTableID : ' + CAST(@RoutingTableID AS VARCHAR(20));
        PRINT '  PromptLibraryID: ' + CAST(@PromptLibraryID AS VARCHAR(20));
        PRINT '  Operations     : ' + CAST(@opCount   AS VARCHAR(20));
        PRINT '  Attributes     : ' + CAST(@attrCount AS VARCHAR(20));
        PRINT '  TTS rows       : ' + CAST(@ttsCount  AS VARCHAR(20))
                                   + ' across ' + CAST(@promptCount AS VARCHAR(20)) + ' prompt(s)';
    END;
    PRINT '================================================================';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    -- Surface the failing phase before re-raising: the error number/message and
    -- the SourceID make a failed run self-explanatory in the log without having
    -- to correlate the THROW against the script body.
    PRINT '----------------------------------------------------------------';
    PRINT '[RTDS][ERROR] Import FAILED and rolled back for SourceID=' + ISNULL(@SourceID, '<null>')
        + '. Error ' + CAST(ERROR_NUMBER() AS VARCHAR(20)) + ': ' + ERROR_MESSAGE();
    PRINT '================================================================';
    THROW;
END CATCH;