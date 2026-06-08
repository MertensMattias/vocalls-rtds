/* ============================================================================
 CAMELCASE CONTRACT VARIANT -- generated from the PascalCase originals.
 
 This file is one of THREE that together define a camelCase RTDS contract
 and MUST be used as a set (mixing with the PascalCase scripts will fail
 dictionary lookups):
 seed_operations_vocalls_dictionary_camelCase.sql
 new_import_routing_table_from_json_camelCase.sql
 export_routing_table_to_json_camelCase.sql
 
 Casing rule: every JSON key (header + operation fields), every operation
 TYPE value, and every attribute/param NAME has its first character
 lower-cased; the rest is unchanged (so 'NextStep_Success' -> 'nextStep_Success',
 'SetVariables' -> 'setVariables'). DB column names, language
 keys (NL/FR), datatype names (string/int/bit) and runtime ${...} tokens are
 NOT changed. Acronym-leading names use the same simple rule, so e.g.
 'ANIConfirmation' -> 'aNIConfirmation' -- adjust by hand if a different
 convention is preferred (must match in all three files).
 ============================================================================ */
/* =============================================================================
 export_routing_table_to_json_camelCase.sql  --  NALLO_APP.rtds
 
 FULL routing-table export, keyed by SourceId: emits the canonical camelCase
 routing-table JSON, round-trip compatible with
 new_import_routing_table_from_json_camelCase.sql (camelCase contract). Re-importing
 the emitted document reproduces the same Operation / Attribute / TTS rows
 with no semantic loss.
 
 Document shape
 --------------
 {
 "sourceId": "...",
 "name": "...",
 "projectId": "<CompanyProjectID as string>",     -- informational on import
 "project": "<Dic_CompanyProject.IAConfigCustomerName>",  -- import resolves by this
 "promptLibraryId": "<PromptLibraryID as string>",        -- informational
 "promptLibrary": "<PromptLibrary.BasePath>",
 "supportedLanguages": "NL|FR",
 "operations": [
 { "id": "00000", "type": "...", "name": "...",
 "isFirstOperation": true,                -- emitted only when true
 "params": { ... },                       -- always present, {} when empty
 "ttsMessages": { "NL": "...", ... }      -- only when the op qualifies
 }
 ]
 }
 
 Encoding rules (mirror of the import parser)
 --------------------------------------------
 - Plain param   -> typed scalar: boolean -> true/false; integer -> bare
 number when the stored value is numeric; everything else
 a JSON string.
 - Flag override -> when the instance Attribute.IsDisplayed / IsEditable
 differs from the Dic_Attribute default, the value is
 emitted as ["<value>", "isDisplayed"|"isNotDisplayed",
 "isEditable"|"isNotEditable"]. Only the differing flag(s)
 are emitted; the value is always element [0], exactly
 what the import reads back.
 - TtsMessages   -> emitted iff the operation carries a 'prompt' param whose
 value resolves within this routing table's library to a
 Prompt having PromptVersion rows with non-NULL Text
 (spec rtds_full_json_tts.md section 1.5). Only languages
 listed in the table's SupportedLanguages are emitted
 (import rejects others). Languages are emitted in
 canonical order NL, FR, DE, EN, then others
 alphabetically.
 - All strings are JSON-escaped via STRING_ESCAPE (backslashes in BasePath
 become \\ in the document).
 - Type self-check (section 1a, WARN/non-fatal): before assembling, every
 non-empty Attribute value is checked against its Dic_AttributeType. A
 mistyped value (e.g. an 'int' attribute holding non-numeric text) is
 reported as a [RTDS][WARN] line and emitted as a JSON string (lossless);
 the export still proceeds. A ${...} token is a string, valid only on
 string-typed attributes; empty values are exempt. The import still HARD-
 REJECTS TYPE_MISMATCH, so a warned document may not re-import unchanged.
 - NextStep self-check (section 1b): every branch-target value (IsNext = 1)
 must resolve to an operation Id within this routing table, else
 INVALID_NEXTSTEP. Empty values and ${...} tokens are exempt. Mirrors the
 import's INVALID_NEXTSTEP check.
 
 Caveat: the import requires an ApplicationId param on any TTS-bearing
 operation. An operation that has Text rows but no ApplicationId param will
 export fine but be rejected on re-import (TTS_WITHOUT_APPLICATION). That is
 a data gap to fix in the flow, not in the export.
 
 Requires SQL Server 2017+ / compatibility level 140 (STRING_AGG).
 Output: a one-row SELECT with column RoutingTableJson. ASCII-only.
 ============================================================================= */
SET NOCOUNT ON;
-- -----------------------------------------------------------------------------
-- INPUT (edit here)
-- -----------------------------------------------------------------------------
DECLARE @SourceId VARCHAR(50) = '+3224581030';
IF (
    SELECT compatibility_level
    FROM sys.databases
    WHERE database_id = DB_ID()
) < 140 THROW 61000,
'Database compatibility level is < 140; STRING_AGG is unavailable. Raise it (ALTER DATABASE ... SET COMPATIBILITY_LEVEL = 140) or run in a 140+ database.',
1;
-- -----------------------------------------------------------------------------
-- 1. Resolve header (zero rows -> NOT_FOUND, the API's 404)
-- -----------------------------------------------------------------------------
DECLARE @RoutingTableID INT,
    @PromptLibraryID INT,
    @CompanyProjectID INT,
    @Name VARCHAR(255),
    @SupportedLanguages VARCHAR(50),
    @BasePath VARCHAR(255),
    @Project VARCHAR(255);
SELECT @RoutingTableID = RT.RoutingTableID,
    @PromptLibraryID = RT.PromptLibraryID,
    @CompanyProjectID = RT.CompanyProjectID,
    @Name = RT.Name,
    @SupportedLanguages = RT.SupportedLanguages,
    @BasePath = PL.BasePath,
    @Project = ISNULL(CP.IAConfigCustomerName, 'UNKNOWN')
FROM rtds.RoutingTable RT
    JOIN rtds.PromptLibrary PL ON PL.PromptLibraryID = RT.PromptLibraryID
    LEFT JOIN rtds.Dic_CompanyProject CP ON CP.CompanyProjectID = RT.CompanyProjectID
WHERE RT.SourceID = @SourceId;
IF @RoutingTableID IS NULL THROW 61001,
'NOT_FOUND: no routing table for this SourceId.',
1;
-- -----------------------------------------------------------------------------
-- 1a. Type self-check (WARN, non-fatal): every non-empty stored Attribute value
-- is checked against its Dic_AttributeType, but a mismatch is reported as a
-- warning and the export STILL proceeds. A non-conforming value is emitted as a
-- JSON string (lossless, see section 2 encoding) rather than coerced, so the
-- raw text round-trips. A ${...} runtime token is a STRING, valid only on a
-- 'string'-typed attribute; a token on a 'bit'/'int' attribute is flagged here.
-- Empty/NULL values are exempt. NOTE: the import still HARD-REJECTS
-- TYPE_MISMATCH -- this leniency is export-only, so a warned document may not
-- re-import unchanged.
-- -----------------------------------------------------------------------------
DECLARE @typeWarn NVARCHAR(MAX) = (
        SELECT STRING_AGG(
                CAST(
                    '[RTDS][WARN] TYPE_MISMATCH op=' + OP.[Key] + ' param=' + DA.Name + ' expected=' + DT.Name + ' value=' + LEFT(AT.Value, 100) + ' (emitted as string)' AS NVARCHAR(MAX)
                ),
                CHAR(13) + CHAR(10)
            ) WITHIN GROUP (
                ORDER BY OP.[Key],
                    DA.Name
            )
        FROM rtds.Operation OP
            JOIN rtds.Attribute AT ON AT.OperationID = OP.OperationID
            JOIN rtds.Dic_Attribute DA ON DA.DicAttributeID = AT.DicAttributeID
            JOIN rtds.Dic_AttributeType DT ON DT.DicAttributeTypeID = DA.DicAttributeTypeID
        WHERE OP.RoutingTableID = @RoutingTableID
            AND NULLIF(LTRIM(RTRIM(AT.Value)), '') IS NOT NULL
            AND (
                (
                    DT.Name IN ('boolean', 'bit')
                    AND LOWER(AT.Value) NOT IN ('true', 'false', '1', '0')
                )
                OR (
                    DT.Name IN ('integer', 'int')
                    AND TRY_CONVERT(BIGINT, AT.Value) IS NULL
                )
            )
    );
IF @typeWarn IS NOT NULL BEGIN PRINT '[RTDS][WARN] One or more Attribute values do not match their Dic_AttributeType (emitted as strings):';
PRINT @typeWarn;
END;
-- -----------------------------------------------------------------------------
-- 1b. NextStep integrity: every branch-target value (Dic_Attribute.IsNext = 1)
-- must point to an operation Id (Operation.[Key]) within this routing table.
-- Empty values (end of flow) and ${...} tokens are exempt. THROW rather than
-- export a flow with a dangling jump. Mirrors the import's INVALID_NEXTSTEP.
-- -----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1
    FROM rtds.Operation OP
        JOIN rtds.Attribute AT ON AT.OperationID = OP.OperationID
        JOIN rtds.Dic_Attribute DA ON DA.DicAttributeID = AT.DicAttributeID
    WHERE OP.RoutingTableID = @RoutingTableID
        AND DA.IsNext = 1
        AND NULLIF(LTRIM(RTRIM(AT.Value)), '') IS NOT NULL
        AND AT.Value NOT LIKE '%${%'
        AND NOT EXISTS (
            SELECT 1
            FROM rtds.Operation t
            WHERE t.RoutingTableID = @RoutingTableID
                AND t.[Key] = AT.Value
        )
) BEGIN
DECLARE @nsOp VARCHAR(50),
    @nsParam VARCHAR(255),
    @nsTgt NVARCHAR(200);
SELECT TOP 1 @nsOp = OP.[Key],
    @nsParam = DA.Name,
    @nsTgt = LEFT(AT.Value, 200)
FROM rtds.Operation OP
    JOIN rtds.Attribute AT ON AT.OperationID = OP.OperationID
    JOIN rtds.Dic_Attribute DA ON DA.DicAttributeID = AT.DicAttributeID
WHERE OP.RoutingTableID = @RoutingTableID
    AND DA.IsNext = 1
    AND NULLIF(LTRIM(RTRIM(AT.Value)), '') IS NOT NULL
    AND AT.Value NOT LIKE '%${%'
    AND NOT EXISTS (
        SELECT 1
        FROM rtds.Operation t
        WHERE t.RoutingTableID = @RoutingTableID
            AND t.[Key] = AT.Value
    );
RAISERROR (
    'INVALID_NEXTSTEP: op=%s param=%s target=%s not found in flow -- fix before exporting.',
    16,
    1,
    @nsOp,
    @nsParam,
    @nsTgt
);
RETURN;
END;
-- -----------------------------------------------------------------------------
-- 2. Build one JSON fragment per operation (insertion order = OperationID)
-- -----------------------------------------------------------------------------
DECLARE @OpsJson TABLE (
        OperationID INT NOT NULL PRIMARY KEY,
        J NVARCHAR(MAX) NOT NULL
    );
INSERT INTO @OpsJson (OperationID, J)
SELECT OP.OperationID,
    N'{"id":"' + STRING_ESCAPE(OP.[Key], 'json') + N'","type":"' + STRING_ESCAPE(DOP.Name, 'json') + N'","name":"' + STRING_ESCAPE(OP.Name, 'json') + N'"' + CASE
        WHEN OP.IsFirstOperation = 1 THEN N',"isFirstOperation":true'
        ELSE N''
    END + N',"params":{' + ISNULL(P.ParamsJson, N'') + N'}' + CASE
        WHEN T.TtsJson IS NOT NULL THEN N',"ttsMessages":{' + T.TtsJson + N'}'
        ELSE N''
    END + N'}'
FROM rtds.Operation OP
    JOIN rtds.Dic_OperationType DOP ON DOP.DicOperationTypeID = OP.DicOperationTypeID -- Params object body: one "name":value pair per attribute, in insertion order
    OUTER APPLY (
        SELECT STRING_AGG(
                CAST(
                    N'"' + STRING_ESCAPE(DA.Name, 'json') + N'":' + V.ValueJson AS NVARCHAR(MAX)
                ),
                N','
            ) WITHIN GROUP (
                ORDER BY AT.AttributeID
            ) AS ParamsJson
        FROM rtds.Attribute AT
            JOIN rtds.Dic_Attribute DA ON DA.DicAttributeID = AT.DicAttributeID
            JOIN rtds.Dic_AttributeType DT ON DT.DicAttributeTypeID = DA.DicAttributeTypeID
            CROSS APPLY (
                SELECT CASE
                        /* flag override(s) -> ["value", flags...]; value always a string */
                        WHEN AT.IsDisplayed <> DA.IsDisplayed
                        OR AT.IsEditable <> DA.IsEditable THEN N'["' + STRING_ESCAPE(AT.Value, 'json') + N'"' + CASE
                            WHEN AT.IsDisplayed <> DA.IsDisplayed THEN CASE
                                WHEN AT.IsDisplayed = 1 THEN N',"isDisplayed"'
                                ELSE N ',"isNotDisplayed"'
                            END
                            ELSE N''
                        END + CASE
                            WHEN AT.IsEditable <> DA.IsEditable THEN CASE
                                WHEN AT.IsEditable = 1 THEN N',"isEditable"'
                                ELSE N ',"isNotEditable"'
                            END
                            ELSE N''
                        END + N']'
                        /* typed scalars ('bit'/'int' tolerated for pre-migration dictionaries) */
                        /* recognised boolean literal (or empty -> false, legacy behaviour);
                         a non-conforming bit value falls through to the string ELSE so the
                         raw text is preserved (warned in section 1a) instead of coerced */
                        WHEN DT.Name IN ('boolean', 'bit')
                        AND (
                            LOWER(AT.Value) IN ('true', 'false', '1', '0')
                            OR NULLIF(LTRIM(RTRIM(AT.Value)), '') IS NULL
                        ) THEN CASE
                            WHEN LOWER(AT.Value) IN ('true', '1') THEN N'true'
                            ELSE N'false'
                        END
                        WHEN DT.Name IN ('integer', 'int')
                        AND TRY_CONVERT(BIGINT, AT.Value) IS NOT NULL THEN CAST(TRY_CONVERT(BIGINT, AT.Value) AS NVARCHAR(25))
                        ELSE N'"' + STRING_ESCAPE(AT.Value, 'json') + N'"'
                    END AS ValueJson
            ) V
        WHERE AT.OperationID = OP.OperationID
    ) P -- TtsMessages body (spec 1.5): Prompt param -> Prompt in this library -> versions with Text
    OUTER APPLY (
        SELECT STRING_AGG(
                CAST(
                    N'"' + STRING_ESCAPE(DL.[Key], 'json') + N'":"' + STRING_ESCAPE(PV.[Text], 'json') + N'"' AS NVARCHAR(MAX)
                ),
                N','
            ) WITHIN GROUP (
                ORDER BY CASE
                        DL.[Key]
                        WHEN 'NL' THEN 1
                        WHEN 'FR' THEN 2
                        WHEN 'DE' THEN 3
                        WHEN 'EN' THEN 4
                        ELSE 5
                    END,
                    DL.[Key]
            ) AS TtsJson
        FROM rtds.Attribute AT
            JOIN rtds.Dic_Attribute DA ON DA.DicAttributeID = AT.DicAttributeID
            AND DA.Name = 'prompt'
            JOIN rtds.Prompt PR ON PR.PromptLibraryID = @PromptLibraryID
            AND PR.Name = AT.Value
            JOIN rtds.PromptVersion PV ON PV.PromptID = PR.PromptID
            AND PV.[Text] IS NOT NULL
            JOIN rtds.Dic_PromptLanguage DL ON DL.DicPromptLanguageID = PV.DicPromptLanguageID
        WHERE AT.OperationID = OP.OperationID
            /* only languages listed in this table's SupportedLanguages (pipe-delimited,
             tolerant of commas) -- the import hard-rejects anything else
             (LANGUAGE_NOT_IN_SUPPORTED), so extra-language versions must not export */
            AND '|' + REPLACE(@SupportedLanguages, ',', '|') + '|' LIKE '%|' + DL.[Key] + '|%'
    ) T
WHERE OP.RoutingTableID = @RoutingTableID;
-- -----------------------------------------------------------------------------
-- 3. Assemble the document
-- -----------------------------------------------------------------------------
DECLARE @json NVARCHAR(MAX) = N'{"sourceId":"' + STRING_ESCAPE(@SourceId, 'json') + N'","name":"' + STRING_ESCAPE(@Name, 'json') + N'","projectId":"' + CAST(@CompanyProjectID AS NVARCHAR(20)) + N'","project":"' + STRING_ESCAPE(@Project, 'json') + N'","promptLibraryId":"' + CAST(@PromptLibraryID AS NVARCHAR(20)) + N'","promptLibrary":"' + STRING_ESCAPE(@BasePath, 'json') + N'","supportedLanguages":"' + STRING_ESCAPE(@SupportedLanguages, 'json') + N'","operations":[' + ISNULL(
        (
            SELECT STRING_AGG(J, N',') WITHIN GROUP (
                    ORDER BY OperationID
                )
            FROM @OpsJson
        ),
        N''
    ) + N']}';
-- -----------------------------------------------------------------------------
-- 4. Self-check + output
-- -----------------------------------------------------------------------------
IF ISJSON(@json) <> 1 THROW 61002,
'INTERNAL: assembled document is not valid JSON.',
1;
SELECT @json AS RoutingTableJson;
/* =============================================================================
 VERIFY ROUND-TRIP (optional, manual)
 1. Run this script, copy RoutingTableJson.
 2. Paste it as @json in new_import_routing_table_from_json_camelCase.sql, @dryRun = 1.
 3. The dry run must report the same operation / attribute / TTS counts as
 this flow currently has, with no THROW.
 ============================================================================= */