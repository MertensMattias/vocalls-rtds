/* ============================================================================
   delete_routing_table.sql  --  NALLO_APP.rtds

   Deletes a routing table and ALL of its child flow structure for a given
   SourceID, in one transaction, child -> parent order:

       1. rtds.Attribute     (config params, children of Operation)
       2. rtds.Operation     (steps/nodes, children of RoutingTable; the "keys")
       3. rtds.RoutingTable  (the header row itself)

   After running, no row referencing the resolved RoutingTableID(s) remains in
   the flow tables. Matches the cascade-delete pattern used by
   import_routing_table_full.sql (@Replace = 1).

   ----------------------------------------------------------------------------
   OUT OF SCOPE (intentionally NOT deleted)
   ----------------------------------------------------------------------------
     - Prompt data  : rtds.PromptLibrary / Prompt / PromptVersion. The library
                      is referenced via RoutingTable.PromptLibraryID and may be
                      shared by other routing tables. Use sp_delete_prompt_library
                      separately if a library must go.
     - Logging/audit: rtds.FlowLogging / AttributeLogging / ConfigHistory. These
                      have no FK and are keyed by SourceID; left as historical
                      record.
     - Dictionary   : all rtds.Dic_* lookup tables are shared, never touched.

   ----------------------------------------------------------------------------
   INPUT (edit here)
   ----------------------------------------------------------------------------
     @SourceID : the SourceID of the routing table to delete.

   Re-runnable. If the SourceID does not exist, it prints a notice and makes no
   changes. Handles the (unexpected) case of multiple RoutingTable rows sharing
   the same SourceID by deleting all of them.

   Target: Microsoft SQL Server (T-SQL).
   ============================================================================ */

SET XACT_ABORT ON;
SET NOCOUNT ON;

/* ---- INPUT --------------------------------------------------------------- */
DECLARE @SourceID varchar(50) = '+3233389999';   -- <-- set the SourceID here
/* -------------------------------------------------------------------------- */

DECLARE @Targets TABLE (RoutingTableID int PRIMARY KEY);

INSERT INTO @Targets (RoutingTableID)
SELECT RoutingTableID
FROM   rtds.RoutingTable
WHERE  SourceID = @SourceID;

IF NOT EXISTS (SELECT 1 FROM @Targets)
BEGIN
    PRINT 'No RoutingTable found for SourceID ''' + @SourceID + '''. Nothing to delete.';
    RETURN;
END

DECLARE @AttrDeleted int = 0,
        @OpsDeleted  int = 0,
        @RtDeleted   int = 0;

BEGIN TRY
    BEGIN TRANSACTION;

    /* 1. Attribute -- children of the operations in the target tables */
    DELETE a
    FROM rtds.Attribute a
    INNER JOIN rtds.Operation o ON o.OperationID = a.OperationID
    WHERE o.RoutingTableID IN (SELECT RoutingTableID FROM @Targets);
    SET @AttrDeleted = @@ROWCOUNT;

    /* 2. Operation -- children (steps/keys) of the target routing tables */
    DELETE FROM rtds.Operation
    WHERE RoutingTableID IN (SELECT RoutingTableID FROM @Targets);
    SET @OpsDeleted = @@ROWCOUNT;

    /* 3. RoutingTable -- the header row(s) */
    DELETE FROM rtds.RoutingTable
    WHERE RoutingTableID IN (SELECT RoutingTableID FROM @Targets);
    SET @RtDeleted = @@ROWCOUNT;

    COMMIT TRANSACTION;

    PRINT 'Deleted routing table for SourceID ''' + @SourceID + ''':';
    PRINT '  RoutingTable rows : ' + CAST(@RtDeleted   AS varchar(20));
    PRINT '  Operation rows    : ' + CAST(@OpsDeleted  AS varchar(20));
    PRINT '  Attribute rows    : ' + CAST(@AttrDeleted AS varchar(20));
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
