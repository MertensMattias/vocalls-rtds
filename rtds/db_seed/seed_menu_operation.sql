-- format-disabled: hand-aligned VALUES tuples + box comments. Do NOT auto-format.
-- (Enforced by .vscode/settings.json: format-on-save off for [sql].)
/* ============================================================================
   seed_menu_operation.sql  --  NALLO_APP.rtds  (camelCase contract)

   Self-contained dictionary seed for the SINGLE operation TYPE 'menu' (the DTMF
   menu operation). It is a menu-only extract of import_seeds_camelCase.sql:
   seeds the 'menu' Dic_OperationType row at its fixed production id (8) and all
   52 'menu' Dic_Attribute rows, so a routing table that uses the 'menu' type
   imports cleanly (the importer's UNKNOWN_PARAM check validates every param
   against Dic_Attribute -- an uncatalogued key THROWs 54016).

   The param contract is reconciled to the shipped component rtds/components/
   menu.js (its __configJSON) and rtds/specs/menu.spec.md -- the source of truth.
   Every key in the component's __configJSON is catalogued here, PLUS the two
   branch keys the spec defines but the component's sample config omits
   (nextStep_DefaultChoice, nextStep_Failure) and the two legacy helpdesk-import
   compatibility keys (applicationId, staticPrompt).

   USE THIS when you only need to (re)seed 'menu' -- e.g. a DB that predates the
   menu type, or a targeted top-up. The full import_seeds_camelCase.sql already
   seeds 'menu' identically; running both is harmless (idempotent, matched BY
   NAME / BY ID).

   ----------------------------------------------------------------------------
   CASING / FIDELITY  (do not "fix" these)
   ----------------------------------------------------------------------------
   - Type name 'menu' and attribute names are lower-camelCase, matching the
     import payload. RTDS dictionary lookups are exact, case-sensitive -- the
     dictionary and the payload MUST line up.
   - DataTypes follow the published contract and are NOT altered:
       bit    : active
       int    : applicationId, timeout, maxTries
       string : everything else (all message slots + all nextStep* keys)
   - Per-language message slots (staticMessage_<LANG>, menuChoiceMessage_<key>_
     <LANG>, noChoiceMessage_<LANG>, invalidChoiceMessage_<LANG>,
     maxTriesMessage_<LANG>) are enumerated for the languages the live flows use
     (NL, FR). Add *_DE (etc.) rows when a flow supports more languages.
   - Branch keys are exact-match: nextStep_<key> for 0-9/*/#, plus
     nextStep_DefaultChoice and nextStep_Failure. A new choice digit needs a
     matching row or the import THROWs 54016 for that key.

   ----------------------------------------------------------------------------
   HOW TO USE
   ----------------------------------------------------------------------------
   1. On a database that already has data, FIRST set @dryRun = 1 (below) and run
      once: it does all the INSERT/UPDATE work inside the transaction, prints the
      would-be counts, then ROLLs BACK so nothing is persisted. Review, then set
      @dryRun = 0 and run again to commit.
   2. Re-run any time -- idempotent (find-or-create + sync). Missing rows are
      inserted; an existing 'menu' Dic_Attribute row is updated only if its
      DataType or GUI flags drift from this seed. Nothing is deleted; rows for
      other operation types are never touched.

   Target: Microsoft SQL Server (T-SQL).
   ============================================================================ */

SET XACT_ABORT ON;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'rtds')
    THROW 60060, 'Schema "rtds" not found. Aborting menu seed.', 1;
GO

DECLARE @now       datetime2   = SYSUTCDATETIME();
DECLARE @CreatedBy varchar(50) = 'rtds-seed';

/* ----------------------------------------------------------------------------
   @dryRun = 1  -->  PREVIEW. Do all the INSERT/UPDATE work inside the tran, then
                     ROLLBACK so the database is left untouched. Everything here
                     is transactional (no DBCC / IDENTITY reseed), so the dry-run
                     is exact.  @dryRun = 0  -->  COMMIT (the normal seed). Default 0.
   ---------------------------------------------------------------------------- */
DECLARE @dryRun    bit = 0;

BEGIN TRY
BEGIN TRANSACTION;

/* ============================================================================
   1. Dic_OperationType 'menu' at its fixed production id (8).
   ----------------------------------------------------------------------------
   Seeded BY ID via IDENTITY_INSERT to match import_seeds_camelCase.sql's clean
   contiguous-ID collapse (menu = 8), so any FK from rtds.Operation resolves to
   the same id. Idempotent: existing row (matched by id) is left untouched.
   If a 'menu' row already exists under a DIFFERENT id (e.g. the historical
   scattered production id), this INSERT is skipped by the BY-NAME guard below
   and the existing id is kept.
   ============================================================================ */
PRINT 'Seeding rtds.Dic_OperationType (menu) ...';

IF NOT EXISTS (SELECT 1 FROM rtds.Dic_OperationType WHERE [Name] = N'menu')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rtds.Dic_OperationType WHERE [DicOperationTypeID] = 8)
    BEGIN
        SET IDENTITY_INSERT rtds.Dic_OperationType ON;
        INSERT INTO rtds.Dic_OperationType
            ([DicOperationTypeID], [Name], [DateCreated], [CreatedBy], [DateUpdated], [UpdatedBy])
        VALUES
            (8, N'menu', N'2021-06-30 11:07:51.4330000', @CreatedBy, NULL, NULL);
        SET IDENTITY_INSERT rtds.Dic_OperationType OFF;
    END
    ELSE
    BEGIN
        -- id 8 is taken by another type; add 'menu' at the next available id.
        INSERT INTO rtds.Dic_OperationType ([Name], [DateCreated], [CreatedBy])
        VALUES (N'menu', @now, @CreatedBy);
    END
END

/* ============================================================================
   2. THE CATALOGUE -- the 52 'menu' attributes.
   ----------------------------------------------------------------------------
   @Attribute columns:
     AttributeName  -> Dic_Attribute.Name
     AttributeType  -> Dic_AttributeType.Name (string | int | bit)
     IsRequired     -> caller must supply (1)
     IsNext         -> value is a step id / branch target (nextStep* family)
     IsDisplayed / IsEditable -> GUI flags (production: always 0)
   Reconciled to rtds/components/menu.js + rtds/specs/menu.spec.md.
   Ord drives DicAttributeID assignment (catalogue/listed order). 'nextStep' is
   ordered LAST, after the nextStep_* branch keys.
   ============================================================================ */

DECLARE @Attribute TABLE (
    Ord            int           IDENTITY(1,1) NOT NULL,
    AttributeName  varchar(255)  NOT NULL PRIMARY KEY,
    AttributeType  varchar(255)  NOT NULL,
    IsRequired     bit           NOT NULL,
    IsNext         bit           NOT NULL,
    IsDisplayed    bit           NOT NULL,
    IsEditable     bit           NOT NULL
);

INSERT INTO @Attribute
    (AttributeName, AttributeType, IsRequired, IsNext, IsDisplayed, IsEditable) VALUES
    /* ---- control ---- */
    ('active',                      'bit',     1, 0, 0, 0),
    /* ---- legacy helpdesk-import compatibility (staticPrompt = wav filename) --- */
    ('applicationId',               'int',     0, 0, 0, 0),
    ('staticPrompt',                'string',  0, 0, 0, 0),
    /* ---- per-language message slots (NL / FR) ---- */
    ('staticMessage_NL',            'string',  0, 0, 0, 0),
    ('staticMessage_FR',            'string',  0, 0, 0, 0),
    ('menuChoiceMessage_0_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_1_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_2_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_3_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_4_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_5_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_6_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_7_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_8_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_9_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_*_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_#_NL',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_0_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_1_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_2_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_3_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_4_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_5_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_6_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_7_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_8_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_9_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_*_FR',      'string',  0, 0, 0, 0),
    ('menuChoiceMessage_#_FR',      'string',  0, 0, 0, 0),
    ('noChoiceMessage_NL',          'string',  0, 0, 0, 0),
    ('noChoiceMessage_FR',          'string',  0, 0, 0, 0),
    ('invalidChoiceMessage_NL',     'string',  0, 0, 0, 0),
    ('invalidChoiceMessage_FR',     'string',  0, 0, 0, 0),
    ('maxTriesMessage_NL',          'string',  0, 0, 0, 0),
    ('maxTriesMessage_FR',          'string',  0, 0, 0, 0),
    /* ---- collection tuning ---- */
    ('timeout',                     'int',     0, 0, 0, 0),
    ('maxTries',                    'int',     0, 0, 0, 0),
    /* ---- branch keys (IsNext = 1) ---- */
    ('nextStep_0',                  'string',  0, 1, 0, 0),
    ('nextStep_1',                  'string',  0, 1, 0, 0),
    ('nextStep_2',                  'string',  0, 1, 0, 0),
    ('nextStep_3',                  'string',  0, 1, 0, 0),
    ('nextStep_4',                  'string',  0, 1, 0, 0),
    ('nextStep_5',                  'string',  0, 1, 0, 0),
    ('nextStep_6',                  'string',  0, 1, 0, 0),
    ('nextStep_7',                  'string',  0, 1, 0, 0),
    ('nextStep_8',                  'string',  0, 1, 0, 0),
    ('nextStep_9',                  'string',  0, 1, 0, 0),
    ('nextStep_*',                  'string',  0, 1, 0, 0),
    ('nextStep_#',                  'string',  0, 1, 0, 0),
    ('nextStep_DefaultChoice',      'string',  0, 1, 0, 0),
    ('nextStep_Failure',            'string',  0, 1, 0, 0),
    ('nextStep',                    'string',  1, 1, 0, 0);

DECLARE @attrTypeNew int = 0;
DECLARE @attrNew     int = 0;
DECLARE @attrUpd     int = 0;

/* -- rename legacy Dic_AttributeType names when the new name is absent -------- */
UPDATE d SET Name = 'bit'
FROM   rtds.Dic_AttributeType d
WHERE  d.Name = 'boolean'
AND    NOT EXISTS (SELECT 1 FROM rtds.Dic_AttributeType x WHERE x.Name = 'bit');

UPDATE d SET Name = 'int'
FROM   rtds.Dic_AttributeType d
WHERE  d.Name = 'integer'
AND    NOT EXISTS (SELECT 1 FROM rtds.Dic_AttributeType x WHERE x.Name = 'int');

/* -- find-or-create Dic_AttributeType (string / int / bit) ------------------- */
INSERT INTO rtds.Dic_AttributeType (Name, DateCreated, CreatedBy)
SELECT DISTINCT a.AttributeType, @now, @CreatedBy
FROM   @Attribute a
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_AttributeType d WHERE d.Name = a.AttributeType);
SET @attrTypeNew = @@ROWCOUNT;

/* -- find-or-create Dic_Attribute (per attribute name, under menu) ----------- */
INSERT INTO rtds.Dic_Attribute
    (DicOperationTypeID, DicAttributeTypeID, Name,
     IsRequired, IsNext, IsDisplayed, IsEditable, DateCreated, CreatedBy)
SELECT ot.DicOperationTypeID,
       at.DicAttributeTypeID,
       a.AttributeName,
       a.IsRequired, a.IsNext, a.IsDisplayed, a.IsEditable,
       @now, @CreatedBy
FROM   @Attribute a
JOIN   rtds.Dic_OperationType ot ON ot.Name = N'menu'
JOIN   rtds.Dic_AttributeType at ON at.Name = a.AttributeType
WHERE  NOT EXISTS (
    SELECT 1 FROM rtds.Dic_Attribute d
    WHERE  d.DicOperationTypeID = ot.DicOperationTypeID
    AND    d.Name               = a.AttributeName)
ORDER BY a.Ord;   -- assign DicAttributeID in listed (catalogue) order
SET @attrNew = @@ROWCOUNT;

/* -- sync existing menu Dic_Attribute rows when catalogue values drift -------- */
UPDATE d
SET    d.DicAttributeTypeID = at.DicAttributeTypeID,
       d.IsRequired         = a.IsRequired,
       d.IsNext             = a.IsNext,
       d.IsDisplayed        = a.IsDisplayed,
       d.IsEditable         = a.IsEditable
FROM   rtds.Dic_Attribute d
JOIN   rtds.Dic_OperationType ot ON ot.DicOperationTypeID = d.DicOperationTypeID
                                AND ot.Name = N'menu'
JOIN   @Attribute a               ON a.AttributeName = d.Name
JOIN   rtds.Dic_AttributeType at  ON at.Name = a.AttributeType
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
    PRINT 'RTDS menu operation dictionary seed complete.';
END

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
   VERIFY (optional, read-only; run after seeding)
   ============================================================================ */
/*
SELECT  ot.Name AS OperationType,
        da.Name AS Attribute,
        at.Name AS DataType,
        da.IsRequired, da.IsNext, da.IsDisplayed, da.IsEditable
FROM    rtds.Dic_OperationType ot
JOIN    rtds.Dic_Attribute     da ON da.DicOperationTypeID = ot.DicOperationTypeID
JOIN    rtds.Dic_AttributeType at ON at.DicAttributeTypeID = da.DicAttributeTypeID
WHERE   ot.Name = 'menu'
ORDER BY da.IsNext, da.Name;
*/
