# PowerShell script to clear the failed Flyway migration
# Run this before restarting the backend

$env:PGPASSWORD = "your_password_here"  # Replace with your actual password

# Delete the failed migration record
psql -U postgres -d rockOpsDB -c "DELETE FROM flyway_schema_history WHERE version = '20250104';"

# Verify it's gone
Write-Host "`nVerifying deletion..." -ForegroundColor Green
psql -U postgres -d rockOpsDB -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

Write-Host "`nFlyway record cleared! You can now restart your backend." -ForegroundColor Green

