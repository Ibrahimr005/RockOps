# PowerShell script to run the database migration for step types
# This fixes the maintenance_steps table to support dynamic step types

$dbHost = "localhost"
$dbPort = "5432"
$dbName = "rockOpsDB"
$dbUser = "postgres"
$dbPassword = "1234"
$sqlFile = "backend\MANUAL_DB_FIX_step_types.sql"

Write-Host "Running database migration for step types..." -ForegroundColor Cyan
Write-Host "Database: $dbName on $dbHost:$dbPort" -ForegroundColor Yellow

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $dbPassword

# Run the SQL file using psql
try {
    Write-Host "Executing SQL script..." -ForegroundColor Green
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nMigration completed successfully!" -ForegroundColor Green
        Write-Host "You can now restart your backend application." -ForegroundColor Cyan
    } else {
        Write-Host "`nMigration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Please check the error messages above." -ForegroundColor Yellow
    }
} catch {
    Write-Host "`nError running migration: $_" -ForegroundColor Red
    Write-Host "`nMake sure PostgreSQL client tools (psql) are installed and in your PATH." -ForegroundColor Yellow
} finally {
    # Clear the password environment variable
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")






