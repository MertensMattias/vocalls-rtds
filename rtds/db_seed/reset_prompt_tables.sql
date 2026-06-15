/* ============================================================================
   reset_prompt_tables.sql
   Empties the prompt tables and reseeds their identity columns so the next
   insert starts at 1.

   Cleared (child -> parent):
     rtds.PromptVersion
     rtds.Prompt
     rtds.PromptLibrary

   Lookups (Dic_PromptApplication, Dic_PromptLanguage) are NOT cleared unless
   you set @includeLookups = 1 below.

   WARNING: rtds.RoutingTable.PromptLibraryID is an FK into rtds.PromptLibrary.
   This script disables that FK to allow the wipe. If RoutingTable still holds
   rows after the reset, those rows will reference PromptLibrary IDs that no
   longer exist (orphaned). Only run this when RoutingTable is also empty or is
   about to be re-imported. The script therefore leaves the FK DISABLED at the
   end (re-enabling WITH CHECK would fail against orphans); it is re-validated
   automatically on the next successful import, or re-enable it manually once
   the libraries are repopulated:
       ALTER TABLE rtds.RoutingTable WITH CHECK CHECK CONSTRAINT ALL;

   Runs in one transaction: all or nothing.
   ============================================================================ */

SET XACT_ABORT ON;
SET NOCOUNT ON;

DECLARE @includeLookups BIT = 0;   -- 1 = also wipe Dic_PromptApplication / Dic_PromptLanguage

BEGIN TRY
    BEGIN TRANSACTION;

    -- Disable FKs that would block the wipe
    ALTER TABLE rtds.RoutingTable  NOCHECK CONSTRAINT ALL;
    ALTER TABLE rtds.Prompt        NOCHECK CONSTRAINT ALL;
    ALTER TABLE rtds.PromptVersion NOCHECK CONSTRAINT ALL;

    -- Empty (child -> parent)
    DELETE FROM rtds.PromptVersion;
    DELETE FROM rtds.Prompt;
    DELETE FROM rtds.PromptLibrary;

    -- Reseed identities so the next insert starts at 1
    DBCC CHECKIDENT ('rtds.PromptVersion', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.Prompt',        RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('rtds.PromptLibrary', RESEED, 0) WITH NO_INFOMSGS;

    IF @includeLookups = 1
    BEGIN
        DELETE FROM rtds.Dic_PromptApplication;
        DELETE FROM rtds.Dic_PromptLanguage;
        DBCC CHECKIDENT ('rtds.Dic_PromptApplication', RESEED, 0) WITH NO_INFOMSGS;
        DBCC CHECKIDENT ('rtds.Dic_PromptLanguage',    RESEED, 0) WITH NO_INFOMSGS;
    END;

    COMMIT TRANSACTION;
    PRINT 'Prompt tables reset.'
        + CASE WHEN @includeLookups = 1 THEN ' (lookups included)' ELSE ' (lookups kept)' END;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
