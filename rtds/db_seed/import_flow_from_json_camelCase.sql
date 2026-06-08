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

   Imports a single RTDS routing-table JSON document into NALLO_APP.rtds.
   This is the corrected/aligned successor to import_routing_table_from_json.sql:
   same structure and ergonomics (dry-run, prints, MERGE-OUTPUT op insert,
   set-based attribute insert) with the locked decisions applied.

   Changes vs the original:
     1. PromptLibrary is FIND-OR-CREATEd on CompanyProjectID (one library per
        project). BasePath is stored from JSON but never used as a lookup key.
        (Original required promptLibraryId to pre-exist.)
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
        (Dic_CompanyProject.IAConfigCustomerName); ProjectId is informational.

   Naming note: prompt name is unique per library; key = (PromptLibraryID, Name).
   ApplicationId is the integer Dic_PromptApplication.DicPromptApplicationID and
   is required only on operations that carry TtsMessages (real flows legitimately
   have PlayPrompt operations with a Prompt but no ApplicationId, e.g. queue
   messages - those create no Prompt row here and need no stamp).

   ASCII-only, no template literals.
============================================================================= */

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- -----------------------------------------------------------------------------
-- INPUT
-- -----------------------------------------------------------------------------
DECLARE @json    NVARCHAR(MAX);
DECLARE @replace BIT = 1;                  -- 1 = overwrite, 0 = fail on dup
DECLARE @dryRun  BIT = 0;                  -- 1 = roll back at the end (preview)

SET @json = N'
{
  "sourceId": "+3224581030",
  "name": "N-ALLO - RECEPTION",
  "projectId": "83",
  "project": "NALLO",
  "promptLibraryId": "1",
  "promptLibrary": "N-Allo\\RECEPTION",
  "supportedLanguages": "NL|FR",
  "operations": [
    {"id":"00000","type":"setAttributes","name":"Call Initialization","isFirstOperation":true,
     "params":{"logAttributes":"RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId|ATTR_CallflowId","callflowId":"RECEPTION","routingId":"RECEPTION","nextStep":"00001"}},
    {"id":"00001","type":"say","name":"Play: Welcome",
     "params":{"active":["1","isDisplayed","isEditable"],"applicationId":"8","prompt":["welcome","isDisplayed","isEditable"],"nextStep":"00002"},
     "ttsMessages":{"NL":"Goeidag, test","FR":"Bonjour, ceci est un test"}},
    {"id":"00051","type":"say","name":"Queue: Message 1",
     "params":{"prompt":"queue_waitmessage01","nextStep":"00052"}},
    {"id":"00100","type":"disconnect","name":"RTDS: Disconnect","params":{}}
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

-- Resolve CompanyProjectID by Project NAME (locked decision: ProjectId in the
-- JSON is informational only). UNKNOWN_PROJECT when the name is not catalogued.
SELECT @CompanyProjectID = CompanyProjectID
FROM   rtds.Dic_CompanyProject
WHERE  IAConfigCustomerName = @Project;
-- by-id alternative: SET @CompanyProjectID = TRY_CAST(JSON_VALUE(@json, '$.projectId') AS INT);

IF @CompanyProjectID IS NULL
    THROW 60006, 'UNKNOWN_PROJECT', 1;

-- -----------------------------------------------------------------------------
-- PARSE OPERATIONS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- PARSE PARAMS (one row per operation x param)
-- OPENJSON [type]: 1=string 2=number 3=boolean 4=array 5=object 0=null
-- -----------------------------------------------------------------------------
DECLARE @params TABLE (
    OpKey               NVARCHAR(255)   NOT NULL,
    DicOperationTypeID  INT             NOT NULL,
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

INSERT INTO @params (OpKey, DicOperationTypeID, ParamName, JsonType, RawValue)
SELECT op.OpKey, op.DicOperationTypeID, p.[key], p.[type], p.[value]
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

-- -----------------------------------------------------------------------------
-- PARSE TTS MESSAGES
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- WRITE TRANSACTION
-- -----------------------------------------------------------------------------
BEGIN TRY
    BEGIN TRAN;

    -- Replace mode: cascade-delete existing entry (prompts are NOT deleted)
    DECLARE @ExistingRtId INT;
    SELECT @ExistingRtId = RoutingTableID FROM rtds.RoutingTable WHERE SourceID = @SourceID;

    IF @ExistingRtId IS NOT NULL
    BEGIN
        IF @replace = 0 THROW 60020, 'DUPLICATE_SOURCE_ID', 1;
        DELETE rtds.Attribute
        WHERE  OperationID IN (SELECT OperationID FROM rtds.Operation WHERE RoutingTableID = @ExistingRtId);
        DELETE rtds.Operation    WHERE RoutingTableID = @ExistingRtId;
        DELETE rtds.RoutingTable WHERE RoutingTableID = @ExistingRtId;
    END;

    -- Find-or-create PromptLibrary keyed on CompanyProjectID (BasePath stored only)
    SELECT @PromptLibraryID = PromptLibraryID
    FROM   rtds.PromptLibrary WHERE CompanyProjectID = @CompanyProjectID;
    IF @PromptLibraryID IS NULL
    BEGIN
        INSERT INTO rtds.PromptLibrary (CompanyProjectID, BasePath, DateCreated, CreatedBy)
        VALUES (@CompanyProjectID, @BasePath, @now, @user);
        SET @PromptLibraryID = SCOPE_IDENTITY();
    END;

    -- Insert RoutingTable header
    DECLARE @RoutingTableID INT;
    INSERT INTO rtds.RoutingTable
        (SourceID, Name, CompanyProjectID, PromptLibraryID, SupportedLanguages, DateCreated, CreatedBy)
    VALUES
        (@SourceID, @Name, @CompanyProjectID, @PromptLibraryID, @SupportedLanguages, @now, @user);
    SET @RoutingTableID = SCOPE_IDENTITY();

    -- Insert Operations, capturing (OpKey -> OperationID) via MERGE OUTPUT
    DECLARE @opMap TABLE (OpKey NVARCHAR(255) NOT NULL, OperationID INT NOT NULL);
    MERGE rtds.Operation AS tgt
    USING (SELECT Ordinal, OpKey, DicOperationTypeID, OpName, IsFirst FROM @ops) AS src
    ON 1 = 0
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (RoutingTableID, DicOperationTypeID, Name, [Key], IsFirstOperation, DateCreated, CreatedBy)
        VALUES (@RoutingTableID, src.DicOperationTypeID, src.OpName, src.OpKey, src.IsFirst, @now, @user)
    OUTPUT src.OpKey, inserted.OperationID INTO @opMap (OpKey, OperationID);

    UPDATE op SET op.OperationID = m.OperationID
    FROM @ops op JOIN @opMap m ON m.OpKey = op.OpKey;

    -- Insert Attributes set-based
    INSERT INTO rtds.Attribute
        (DicAttributeID, OperationID, Value, IsDisplayed, IsEditable, DateCreated, CreatedBy)
    SELECT p.DicAttributeID, op.OperationID, ISNULL(p.Scalar, ''), p.IsDisplayed, p.IsEditable, @now, @user
    FROM   @params p
    JOIN   @ops op ON op.OpKey = p.OpKey;

    -- ---------------------------------------------------------------------
    -- P2: TTS messages (only if any present)
    -- ---------------------------------------------------------------------
    DECLARE @ttsCount INT = (SELECT COUNT(*) FROM @tts);
    IF @ttsCount > 0
    BEGIN
        -- Ensure Prompt rows (idempotent on (library, name)); stamp ApplicationId
        INSERT INTO rtds.Prompt
            (PromptLibraryID, DicPromptApplicationID, Name, IsDisplayed, DateCreated, CreatedBy)
        SELECT DISTINCT @PromptLibraryID, t.ApplicationId, t.PromptName, 1, @now, @user
        FROM   @tts t
        WHERE  NOT EXISTS (SELECT 1 FROM rtds.Prompt p
                           WHERE p.PromptLibraryID = @PromptLibraryID AND p.Name = t.PromptName);

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

        UPDATE t SET t.PromptID = p.PromptID
        FROM @tts t
        JOIN rtds.Prompt p ON p.PromptLibraryID = @PromptLibraryID AND p.Name = t.PromptName;

        -- Upsert PromptVersion via UPDATE + INSERT (no MERGE).
        -- Path = Language\prompt_name.wav (target path; audio generation deferred).
        UPDATE pv
            SET pv.[Text] = t.[Text], pv.DateUpdated = @now, pv.UpdatedBy = @user
        FROM rtds.PromptVersion pv
        JOIN @tts t ON t.PromptID = pv.PromptID
                   AND t.DicPromptLanguageID = pv.DicPromptLanguageID
        WHERE t.PromptID IS NOT NULL
          AND ISNULL(pv.[Text], '') <> ISNULL(t.[Text], '');

        INSERT INTO rtds.PromptVersion
            (PromptID, DicPromptLanguageID, Path, [Text], DateCreated, CreatedBy)
        SELECT t.PromptID, t.DicPromptLanguageID,
               t.Language + '\' + t.PromptName + '.wav', t.[Text], @now, @user
        FROM   @tts t
        WHERE  t.PromptID IS NOT NULL
          AND  NOT EXISTS (SELECT 1 FROM rtds.PromptVersion pv
                           WHERE pv.PromptID = t.PromptID
                             AND pv.DicPromptLanguageID = t.DicPromptLanguageID);
    END;

    DECLARE @opCount     INT = (SELECT COUNT(*) FROM @ops);
    DECLARE @attrCount   INT = (SELECT COUNT(*) FROM @params);
    DECLARE @promptCount INT = (SELECT COUNT(DISTINCT PromptName) FROM @tts);

    IF @dryRun = 1
    BEGIN
        ROLLBACK;
        PRINT '[DRY RUN] Rolled back - no changes persisted.';
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
        PRINT 'Routing table imported.';
        PRINT '  SourceID       : ' + @SourceID;
        PRINT '  RoutingTableID : ' + CAST(@RoutingTableID AS VARCHAR(20));
        PRINT '  PromptLibraryID: ' + CAST(@PromptLibraryID AS VARCHAR(20));
        PRINT '  Operations     : ' + CAST(@opCount   AS VARCHAR(20));
        PRINT '  Attributes     : ' + CAST(@attrCount AS VARCHAR(20));
        PRINT '  TTS rows       : ' + CAST(@ttsCount  AS VARCHAR(20))
                                   + ' across ' + CAST(@promptCount AS VARCHAR(20)) + ' prompt(s)';
    END;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;