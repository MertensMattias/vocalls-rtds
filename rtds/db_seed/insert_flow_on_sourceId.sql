/* ============================================================================
   import_routing_table_full.sql  --  NALLO_APP.rtds

   FULL routing-table import (P1 flow structure + P2 prompts) from a single
   canonical routing-table JSON, keyed by SourceId, in ONE transaction.

   Implements POST /api/routing-table/import as pure T-SQL, following:
     - rtds_full_json_tts.docx   (Routing Table API -- Full Process Spec)
     - tts_prompt_import_export.md (sections 2, 5, 7)
   and reusing the conventions of insert_operations.sql and
   import_p2_upsert_tts.sql.

       P1  validate JSON -> upsert RoutingTable header -> insert Operation +
           Attribute rows (scalar/array param encoding, flag overrides,
           Application name -> ApplicationID special case).
       P2  flatten Operations[].TtsMessages -> ensure Prompt rows -> MERGE
           PromptVersion (insert new, update changed text, skip unchanged).

   ----------------------------------------------------------------------------
   INPUT
   ----------------------------------------------------------------------------
   @JsonPayload : the full routing-table JSON (root object, Operations[]).
   @Replace     : 1 = overwrite an existing SourceId (cascade-delete the old
                  RoutingTable/Operation/Attribute first); 0 = reject duplicates.
   @CreatedBy   : audit stamp written to CreatedBy columns.

   Prompt/PromptVersion rows are NEVER deleted on replace (per spec -- orphans
   are pruned by P4 sync, out of scope here).

   ----------------------------------------------------------------------------
   PREREQUISITES (validated; descriptive THROW on miss -- see error map below)
   ----------------------------------------------------------------------------
     Project name              -> rtds.Dic_CompanyProject         (UNKNOWN_PROJECT)
     every Operations[].Type   -> rtds.Dic_OperationType          (UNKNOWN_OPERATION_TYPE)
     every Params key per type  -> rtds.Dic_Attribute              (UNKNOWN_PARAM)
     Application param value    -> rtds.Dic_PromptApplication      (UNKNOWN_APPLICATION)
     TtsMessages language keys  -> rtds.Dic_PromptLanguage         (UNKNOWN_LANGUAGE)
   PromptLibrary record is created if absent (find-or-create on BasePath; the
   table no longer carries CompanyProjectID). The operation TYPES and their PARAM
   definitions must already be catalogued (run the seed_operations*.sql scripts first).

   ERROR MAP (THROW number -> machine code)
     54010 MALFORMED_JSON / MISSING SourceId
     54011 MISSING_FIELD (PromptLibrary)
     54012 MISSING_FIELD (SupportedLanguages)
     54013 DUPLICATE_SOURCE_ID
     54014 UNKNOWN_PROJECT
     54015 UNKNOWN_OPERATION_TYPE
     54016 UNKNOWN_PARAM
     54017 UNKNOWN_APPLICATION
     54018 UNKNOWN_LANGUAGE
     54019 LANGUAGE_NOT_SUPPORTED

   Target: Microsoft SQL Server (T-SQL). Re-runnable with @Replace = 1.
   ============================================================================ */

SET XACT_ABORT ON;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'rtds')
    THROW 60070, 'Schema "rtds" not found. Aborting import.', 1;
GO

/* OPENJSON and its default key/value/type rowset require the database to be at
   compatibility level >= 130 (SQL Server 2016). Below that, the parser reports
   the OPENJSON columns (p.[value], p.[type], ...) as "could not be bound". Fail
   fast here with an actionable message instead of that cryptic bind error. */
IF (SELECT compatibility_level FROM sys.databases WHERE database_id = DB_ID()) < 130
    THROW 60071, 'Database compatibility level is < 130; OPENJSON is unsupported. Raise it (ALTER DATABASE ... SET COMPATIBILITY_LEVEL = 130) or run in a 130+ database.', 1;
GO

/* ============================================================================
   INPUT (edit here)
   ============================================================================ */
DECLARE @Replace   bit         = 1;
DECLARE @CreatedBy varchar(50) = 'rtds-import';

/* The prompt-name attribute is 'Prompt' in the current contract
   (rtds_full_json_tts) but was 'Message' in older flows. Both are accepted
   when resolving the TTS prompt name below. */

/* Sample payload uses the camelCase contract (see
   docs/superpowers/plans/camelcase-mapping-table.md). The importer's $.path
   JSON_VALUE expressions are owned by the SQL team's reset and are NOT edited here. */
DECLARE @JsonPayload nvarchar(max) = N'

{
  "sourceId": "+3257351115",
  "name": "DIGIPOLIS - LPA_LTSU_GUARD",
  "projectId": "117",
  "project": "LPA ICT",
  "promptLibraryId": "82",
  "promptLibrary": "LPA_LTSU_GUARD",
  "supportedLanguages": "NL",
  "operations": [
    {
      "id": "00000",
      "type": "setVariables_vocalls",
      "name": "Call Initialization",
      "isFirstOperation": true,
      "params": {
        "active": true,
        "routingId": "LPA_LTSU_GUARD",
        "customerName": "LPA",
        "customerProject": "LTSU_GUARD",
        "ivrEvent": "9999",
        "ivrAction": "CT",
        "nextStep": "00066"
      }
    },
    {
      "id": "00066",
      "type": "guard_vocalls",
      "name": "LPA_LTSU_GUARD",
      "params": {
        "active": true,
        "configId": 11,
        "configName": "LPA_LTSU_GUARD",
        "dialGuard": true,
        "outboundAni": "",
        "diversion": "",
        "onHoldAudioUrl": "https://data.freetouse.com/music/tracks/60974ab4-afa7-211d-3ffc-09fdbaff8e58/file/mp3",
        "timeout": 15,
        "recordVoicemail": true,
        "acceptCallMenu": true,
        "acceptCallMessage": "Press 1 to accept the call.",
        "sendSms": true,
        "sendMail": true,
        "nextStep": "00067",
        "nextStep_Success": "00067",
        "nextStep_Failure": "00067"
      }
    },
    {
      "id": "00067",
      "type": "sendMail_vocalls",
      "name": "Mail-To: LPA_LTSU_GUARD",
      "params": {
        "active": true,
        "subject": "LPA_LTSU_GUARD: Call Report",
        "from": "IVR_EVENTS@n-allo.be",
        "to": "$(ATTR_EmailTo)",
        "cc": "",
        "bcc": "",
        "body": "$(ATTR_EmailBody)",
        "priority": 2,
        "files": "$(ATTR_EmailAttachment)",
        "attachmentNames": "",
        "attachmentData": "",
        "customerKey": "",
        "timeout": 10000,
        "nextStep_Success": "00068",
        "nextStep_Failure": "00068",
        "nextStep": "00068"
      }
    },
    {
      "id": "00068",
      "type": "sendSms_vocalls",
      "name": "SMS-To: LPA_LTSU_GUARD",
      "params": {
        "active": true,
        "smsAccountId": 47,
        "routing": "LPA_LTSU_GUARD",
        "from": "8850",
        "to": "$(ATTR_SMSTo)",
        "body": "$(ATTR_SMSBody)",
        "timeout": 5000,
        "nextStep_Failure": "00099",
        "nextStep_Success": "00099",
        "nextStep": "00099"
      }
    },
    {
      "id": "00099",
      "type": "disconnect_vocalls",
      "name": "RTDS: Disconnect",
      "params": {}
    }
  ]
}';

/* ============================================================================
   PARSE HEADER + VALIDATE PRESENCE  (read-only, before the transaction)
   ============================================================================ */
DECLARE @now datetime2 = SYSUTCDATETIME();

DECLARE @SourceId           varchar(50),
        @Name               varchar(255),
        @ProjectIdStr       varchar(50),
        @Project            varchar(255),
        @PromptLibrary      varchar(255),
        @SupportedLanguages varchar(50);

SELECT
    @SourceId           = JSON_VALUE(@JsonPayload, '$.SourceId'),
    @Name               = JSON_VALUE(@JsonPayload, '$.Name'),
    @ProjectIdStr       = JSON_VALUE(@JsonPayload, '$.ProjectId'),
    @Project            = JSON_VALUE(@JsonPayload, '$.Project'),
    @PromptLibrary      = JSON_VALUE(@JsonPayload, '$.PromptLibrary'),
    @SupportedLanguages = JSON_VALUE(@JsonPayload, '$.SupportedLanguages');

IF ISJSON(@JsonPayload) <> 1 OR NULLIF(LTRIM(RTRIM(@SourceId)), '') IS NULL
    THROW 54010, 'MALFORMED_JSON: payload is not valid JSON or SourceId is missing.', 1;
IF NULLIF(LTRIM(RTRIM(@PromptLibrary)), '') IS NULL
    THROW 54011, 'MISSING_FIELD: PromptLibrary is required.', 1;
IF NULLIF(LTRIM(RTRIM(@SupportedLanguages)), '') IS NULL
    THROW 54012, 'MISSING_FIELD: SupportedLanguages is required.', 1;

/* -- duplicate SourceId handling ------------------------------------------- */
DECLARE @OldRoutingTableId int =
    (SELECT RoutingTableID FROM rtds.RoutingTable WHERE SourceID = @SourceId);

IF @OldRoutingTableId IS NOT NULL AND @Replace = 0
    THROW 54013, 'DUPLICATE_SOURCE_ID: SourceId already exists. Set @Replace = 1 to overwrite.', 1;

/* -- resolve Project name -> CompanyProjectID ------------------------------
   Spec: import resolves CompanyProjectID by Project NAME; ProjectId is
   informational. Swap to the @ProjectIdStr branch below if your environment
   imports by id instead.                                                      */
DECLARE @CompanyProjectId int =
    (SELECT CompanyProjectID FROM rtds.Dic_CompanyProject
     WHERE IAConfigCustomerName = @Project);
-- DECLARE @CompanyProjectId int = TRY_CONVERT(int, @ProjectIdStr);  -- by-id alternative

IF @CompanyProjectId IS NULL
    THROW 54014, 'UNKNOWN_PROJECT: Project name not found in Dic_CompanyProject.', 1;

/* ============================================================================
   PARSE OPERATIONS + PARAMS into table variables  (read-only)
   ============================================================================ */
DECLARE @Ops TABLE (
    OpKey            nvarchar(255) NOT NULL PRIMARY KEY,
    OpType           varchar(255)  NOT NULL,
    OpName           varchar(255)  NOT NULL,
    IsFirstOperation bit           NOT NULL,
    ParamsJson       nvarchar(max) NULL,
    TtsJson          nvarchar(max) NULL,
    OrdIdx           int           NOT NULL
);

INSERT INTO @Ops (OpKey, OpType, OpName, IsFirstOperation, ParamsJson, TtsJson, OrdIdx)
SELECT
    JSON_VALUE(j.[value], '$.Id'),
    JSON_VALUE(j.[value], '$.Type'),
    JSON_VALUE(j.[value], '$.Name'),
    CASE WHEN JSON_VALUE(j.[value], '$.IsFirstOperation') = 'true' THEN 1 ELSE 0 END,
    JSON_QUERY(j.[value], '$.Params'),         -- object JSON or NULL when omitted
    JSON_QUERY(j.[value], '$.TtsMessages'),    -- object JSON or NULL when omitted
    CONVERT(int, j.[key])                      -- array index preserves operation order
FROM OPENJSON(@JsonPayload, '$.Operations') j; -- default schema exposes [key]/[value]

/* -- UNKNOWN_OPERATION_TYPE -------------------------------------------------- */
IF EXISTS (
    SELECT 1 FROM @Ops o
    WHERE NOT EXISTS (SELECT 1 FROM rtds.Dic_OperationType d WHERE d.Name = o.OpType)
)
    THROW 54015, 'UNKNOWN_OPERATION_TYPE: an operation Type is not in Dic_OperationType.', 1;

/* -- UNKNOWN_APPLICATION (validated before @Params insert, so an unresolved
   Application name yields a descriptive error rather than a NOT NULL failure) */
IF EXISTS (
    SELECT 1
    FROM @Ops o
    CROSS APPLY OPENJSON(ISNULL(o.ParamsJson, '{}')) p
    WHERE p.[key] = 'Application'
      AND NOT EXISTS (
          SELECT 1 FROM rtds.Dic_PromptApplication pa
          WHERE pa.Name = CASE WHEN p.[type] = 4
                               THEN JSON_VALUE(p.[value], '$[0]')
                               ELSE p.[value] END)
)
    THROW 54017, 'UNKNOWN_APPLICATION: an Application param value is not in Dic_PromptApplication.', 1;

/* -- flatten Params: one row per (operation, param) -------------------------
   Each value is a scalar (type 1/2/3) or an array [value, ...flags] (type 4).
   Application (a name) is special-cased to attribute 'ApplicationID' with the
   resolved DicPromptApplicationID integer.                                    */
DECLARE @Params TABLE (
    OpKey         nvarchar(255) NOT NULL,
    RawName       varchar(255)  NOT NULL,   -- name as written in JSON
    EffName       varchar(255)  NOT NULL,   -- name stored in Dic_Attribute
    [Value]       varchar(512)  NOT NULL,
    IsDisplayed   bit           NULL,       -- NULL = inherit dictionary default
    IsEditable    bit           NULL
);

INSERT INTO @Params (OpKey, RawName, EffName, [Value], IsDisplayed, IsEditable)
SELECT
    o.OpKey,
    p.[key],
    /* Application name -> 'ApplicationID' */
    CASE WHEN p.[key] = 'Application' THEN 'ApplicationID' ELSE p.[key] END,
    /* value: array -> element [0]; scalar -> the value as-is */
    CASE
        WHEN p.[key] = 'Application'
            THEN CONVERT(varchar(512),
                 (SELECT pa.DicPromptApplicationID
                  FROM rtds.Dic_PromptApplication pa
                  WHERE pa.Name = CASE WHEN p.[type] = 4
                                       THEN JSON_VALUE(p.[value], '$[0]')
                                       ELSE p.[value] END))
        WHEN p.[type] = 4 THEN JSON_VALUE(p.[value], '$[0]')
        ELSE p.[value]
    END,
    /* IsDisplayed override from flags (array only) */
    CASE WHEN p.[type] = 4 THEN
        CASE
            WHEN EXISTS (SELECT 1 FROM OPENJSON(p.[value]) f WHERE f.[value] = 'isDisplayed')    THEN 1
            WHEN EXISTS (SELECT 1 FROM OPENJSON(p.[value]) f WHERE f.[value] = 'isNotDisplayed') THEN 0
            ELSE NULL
        END
    END,
    /* IsEditable override from flags (array only) */
    CASE WHEN p.[type] = 4 THEN
        CASE
            WHEN EXISTS (SELECT 1 FROM OPENJSON(p.[value]) f WHERE f.[value] = 'isEditable')    THEN 1
            WHEN EXISTS (SELECT 1 FROM OPENJSON(p.[value]) f WHERE f.[value] = 'isNotEditable') THEN 0
            ELSE NULL
        END
    END
FROM @Ops o
CROSS APPLY OPENJSON(ISNULL(o.ParamsJson, '{}')) p;   -- no rows when Params omitted

/* -- UNKNOWN_PARAM: every effective param name must be catalogued for its type */
IF EXISTS (
    SELECT 1
    FROM @Params pp
    JOIN @Ops o                      ON o.OpKey = pp.OpKey
    JOIN rtds.Dic_OperationType ot   ON ot.Name = o.OpType
    WHERE NOT EXISTS (
        SELECT 1 FROM rtds.Dic_Attribute da
        WHERE da.DicOperationTypeID = ot.DicOperationTypeID
        AND   da.Name               = pp.EffName)
)
    THROW 54016, 'UNKNOWN_PARAM: a Params key is not in Dic_Attribute for its operation type.', 1;

/* ============================================================================
   FLATTEN TtsMessages -> (PromptName, Language, Text)   (read-only)
   PromptName resolved from the operation's Prompt/Message param value.
   Only PlayPrompt + Disconnect operations contribute (per rtds_full_json_tts).
   ============================================================================ */
DECLARE @Tts TABLE (
    PromptName varchar(255) NOT NULL,
    Language   varchar(5)   NOT NULL,
    [Text]     varchar(max) NOT NULL,
    PRIMARY KEY (PromptName, Language)
);

INSERT INTO @Tts (PromptName, Language, [Text])
SELECT
    pn.PromptName,
    t.[key],
    t.[value]
FROM @Ops o
CROSS APPLY OPENJSON(ISNULL(o.TtsJson, '{}')) t         -- language -> text
CROSS APPLY (
    SELECT TOP (1) pp.[Value] AS PromptName
    FROM @Params pp
    WHERE pp.OpKey = o.OpKey
      AND pp.EffName IN ('Prompt', 'Message')
) pn
WHERE o.TtsJson IS NOT NULL
  AND o.OpType IN ('PlayPrompt', 'PlayPrompt_vocalls', 'Disconnect_vocalls');

DECLARE @HasTts bit = CASE WHEN EXISTS (SELECT 1 FROM @Tts) THEN 1 ELSE 0 END;

/* -- UNKNOWN_LANGUAGE: key must exist in Dic_PromptLanguage ------------------ */
IF EXISTS (
    SELECT 1 FROM @Tts t
    WHERE NOT EXISTS (SELECT 1 FROM rtds.Dic_PromptLanguage dl WHERE dl.[Key] = t.Language)
)
    THROW 54018, 'UNKNOWN_LANGUAGE: a TtsMessages language key is not in Dic_PromptLanguage.', 1;

/* -- LANGUAGE_NOT_SUPPORTED: key must be listed in SupportedLanguages -------- */
IF EXISTS (
    SELECT 1 FROM @Tts t
    WHERE ',' + @SupportedLanguages + ',' NOT LIKE '%,' + t.Language + ',%'
)
    THROW 54019, 'LANGUAGE_NOT_SUPPORTED: a TtsMessages language key is not in SupportedLanguages.', 1;

/* ============================================================================
   WRITE  (single transaction: P1 structure, then P2 prompts)
   ============================================================================ */
DECLARE @RoutingTableId  int;
DECLARE @PromptLibraryId int;
DECLARE @PromptsInserted int = 0, @PromptVersInserted int = 0, @PromptVersUpdated int = 0;

/* scalar counts captured up front; PRINT only accepts scalar expressions, not
   subqueries, so the @Ops / @Params counts are materialised here. */
DECLARE @OperationsInserted int = (SELECT COUNT(*) FROM @Ops);
DECLARE @AttributesInserted int = (SELECT COUNT(*) FROM @Params);

BEGIN TRY
BEGIN TRANSACTION;

    /* -- P1.0  replace: cascade-delete the old flow structure ---------------- */
    IF @OldRoutingTableId IS NOT NULL AND @Replace = 1
    BEGIN
        DELETE FROM rtds.Attribute
        WHERE OperationID IN (SELECT OperationID FROM rtds.Operation
                              WHERE RoutingTableID = @OldRoutingTableId);
        DELETE FROM rtds.Operation    WHERE RoutingTableID = @OldRoutingTableId;
        DELETE FROM rtds.RoutingTable WHERE RoutingTableID = @OldRoutingTableId;
    END

    /* -- P1.1  find-or-create PromptLibrary (keyed on BasePath; the table no
       longer carries CompanyProjectID, so BasePath alone identifies it) ------- */
    SELECT @PromptLibraryId = PromptLibraryID
    FROM   rtds.PromptLibrary
    WHERE  BasePath = @PromptLibrary;

    IF @PromptLibraryId IS NULL
    BEGIN
        INSERT INTO rtds.PromptLibrary (BasePath, DateCreated, CreatedBy)
        VALUES (@PromptLibrary, @now, @CreatedBy);
        SET @PromptLibraryId = SCOPE_IDENTITY();
    END

    /* -- P1.2  insert RoutingTable header ------------------------------------ */
    INSERT INTO rtds.RoutingTable
        (SourceID, Name, CompanyProjectID, PromptLibraryID, SupportedLanguages,
         DateCreated, CreatedBy)
    VALUES
        (@SourceId, @Name, @CompanyProjectId, @PromptLibraryId, @SupportedLanguages,
         @now, @CreatedBy);
    SET @RoutingTableId = SCOPE_IDENTITY();

    /* -- P1.3  insert Operations (order preserved by OrdIdx) ----------------- */
    INSERT INTO rtds.Operation
        (RoutingTableID, DicOperationTypeID, Name, [Key], IsFirstOperation,
         DateCreated, CreatedBy)
    SELECT @RoutingTableId, ot.DicOperationTypeID, o.OpName, o.OpKey, o.IsFirstOperation,
           @now, @CreatedBy
    FROM   @Ops o
    JOIN   rtds.Dic_OperationType ot ON ot.Name = o.OpType
    ORDER  BY o.OrdIdx;

    /* -- P1.4  insert Attributes (flags inherit dic default when NULL) ------- */
    INSERT INTO rtds.Attribute
        (DicAttributeID, OperationID, [Value], IsDisplayed, IsEditable,
         DateCreated, CreatedBy)
    SELECT da.DicAttributeID,
           op.OperationID,
           pp.[Value],
           ISNULL(pp.IsDisplayed, da.IsDisplayed),
           ISNULL(pp.IsEditable,  da.IsEditable),
           @now, @CreatedBy
    FROM   @Params pp
    JOIN   @Ops o                    ON o.OpKey = pp.OpKey
    JOIN   rtds.Dic_OperationType ot ON ot.Name = o.OpType
    JOIN   rtds.Dic_Attribute da     ON da.DicOperationTypeID = ot.DicOperationTypeID
                                    AND da.Name               = pp.EffName
    JOIN   rtds.Operation op         ON op.RoutingTableID = @RoutingTableId
                                    AND op.[Key]          = pp.OpKey;

    /* ===== P2  prompts (only when the payload carries TtsMessages) ========== */
    IF @HasTts = 1
    BEGIN
        /* -- P2.1  ensure Prompt rows (idempotent, scoped to library) -------- */
        INSERT INTO rtds.Prompt (PromptLibraryID, Name, IsDisplayed, DateCreated, CreatedBy)
        SELECT DISTINCT @PromptLibraryId, t.PromptName, 1, @now, @CreatedBy
        FROM   @Tts t
        WHERE  NOT EXISTS (
            SELECT 1 FROM rtds.Prompt p
            WHERE p.PromptLibraryID = @PromptLibraryId AND p.Name = t.PromptName);
        SET @PromptsInserted = @@ROWCOUNT;

        /* -- P2.2  MERGE PromptVersion: insert new, update changed text ------
           Path = Language\prompt_name.wav  ('//' -> '_'); full UNC path at
           runtime is PromptLibrary.BasePath + '\' + Path.                      */
        DECLARE @Merge TABLE (Action nvarchar(10));

        MERGE rtds.PromptVersion AS tgt
        USING (
            SELECT p.PromptID,
                   dl.DicPromptLanguageID,
                   t.[Text],
                   REPLACE(t.Language + '\' + t.PromptName + '.wav', '//', '_') AS ComputedPath
            FROM   @Tts t
            JOIN   rtds.Prompt p             ON p.PromptLibraryID = @PromptLibraryId
                                            AND p.Name            = t.PromptName
            JOIN   rtds.Dic_PromptLanguage dl ON dl.[Key]         = t.Language
        ) AS src
            ON  tgt.PromptID            = src.PromptID
            AND tgt.DicPromptLanguageID = src.DicPromptLanguageID
        WHEN MATCHED AND ISNULL(tgt.[Text], '') <> ISNULL(src.[Text], '') THEN
            UPDATE SET tgt.[Text] = src.[Text], tgt.DateUpdated = @now, tgt.UpdatedBy = @CreatedBy
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (PromptID, DicPromptLanguageID, [Text], Path, DateCreated, CreatedBy)
            VALUES (src.PromptID, src.DicPromptLanguageID, src.[Text], src.ComputedPath,
                    @now, @CreatedBy)
        OUTPUT $action INTO @Merge;

        SELECT @PromptVersInserted = SUM(CASE WHEN Action = 'INSERT' THEN 1 ELSE 0 END),
               @PromptVersUpdated  = SUM(CASE WHEN Action = 'UPDATE' THEN 1 ELSE 0 END)
        FROM @Merge;
    END

COMMIT TRANSACTION;

PRINT 'RTDS full import complete for SourceId ' + @SourceId + '.';
PRINT '  RoutingTableID        : ' + CAST(@RoutingTableId AS varchar(10));
PRINT '  Operations inserted   : ' + CAST(@OperationsInserted AS varchar(10));
PRINT '  Attributes inserted   : ' + CAST(@AttributesInserted AS varchar(10));
PRINT '  Prompts inserted      : ' + CAST(@PromptsInserted     AS varchar(10));
PRINT '  PromptVersion inserted: ' + CAST(ISNULL(@PromptVersInserted, 0) AS varchar(10));
PRINT '  PromptVersion updated : ' + CAST(ISNULL(@PromptVersUpdated, 0)  AS varchar(10));

/* result row, mirroring the API 201 body */
SELECT @RoutingTableId                      AS RoutingTableId,
       @OperationsInserted                  AS OperationsInserted,
       @AttributesInserted                  AS AttributesInserted,
       @PromptsInserted                     AS PromptsInserted,
       ISNULL(@PromptVersInserted, 0)       AS PromptVersionInserted,
       ISNULL(@PromptVersUpdated, 0)        AS PromptVersionUpdated;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;   -- re-raise; nothing was written
END CATCH
GO

/* ============================================================================
   VERIFY (optional, read-only; run after import)
   ============================================================================ */
/*
DECLARE @sid varchar(50) = '+3233387777';
SELECT  o.[Key] AS OpKey, dop.Name AS OpType, o.Name AS OpName, o.IsFirstOperation,
        da.Name AS Param, dat.Name AS DataType, a.[Value], a.IsDisplayed, a.IsEditable
FROM    rtds.RoutingTable rt
JOIN    rtds.Operation o            ON o.RoutingTableID = rt.RoutingTableID
JOIN    rtds.Dic_OperationType dop  ON dop.DicOperationTypeID = o.DicOperationTypeID
LEFT JOIN rtds.Attribute a          ON a.OperationID = o.OperationID
LEFT JOIN rtds.Dic_Attribute da     ON da.DicAttributeID = a.DicAttributeID
LEFT JOIN rtds.Dic_AttributeType dat ON dat.DicAttributeTypeID = da.DicAttributeTypeID
WHERE   rt.SourceID = @sid
ORDER BY o.[Key], a.AttributeID;

SELECT p.Name AS PromptName, dl.[Key] AS Language, pv.[Text], pv.Path
FROM   rtds.RoutingTable rt
JOIN   rtds.Prompt p          ON p.PromptLibraryID = rt.PromptLibraryID
JOIN   rtds.PromptVersion pv  ON pv.PromptID = p.PromptID
JOIN   rtds.Dic_PromptLanguage dl ON dl.DicPromptLanguageID = pv.DicPromptLanguageID
WHERE  rt.SourceID = @sid
ORDER BY p.Name, dl.[Key];
*/