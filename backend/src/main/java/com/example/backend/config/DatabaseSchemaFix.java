package com.example.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Database schema fix to ensure driver_id column in sarky_logs table is nullable
 * for non-drivable equipment support.
 * 
 * This component executes on startup to fix the NOT NULL constraint issue
 * that prevents saving sarky logs for non-drivable equipment.
 */
@Component
@Order(1000)  // Run after Hibernate has initialized
public class DatabaseSchemaFix {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixSarkyLogsDriverIdConstraint() {
        try {
            System.out.println("🔧 Checking sarky_logs table driver_id constraint...");
            
            // Check if the table exists first
            String tableExistsSql = """
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_name = 'sarky_logs'
            """;
            
            Integer tableCount = jdbcTemplate.queryForObject(tableExistsSql, Integer.class);
            
            if (tableCount == 0) {
                System.out.println("📋 Table sarky_logs does not exist yet - will be created by Hibernate");
                return;
            }
            
            // Check if driver_id column exists and its nullable status
            String checkConstraintSql = """
                SELECT is_nullable, data_type
                FROM information_schema.columns 
                WHERE table_name = 'sarky_logs' 
                AND column_name = 'driver_id'
            """;
            
            try {
                var result = jdbcTemplate.queryForMap(checkConstraintSql);
                String isNullable = (String) result.get("is_nullable");
                String dataType = (String) result.get("data_type");
                
                System.out.println("📊 Current driver_id column: nullable=" + isNullable + ", type=" + dataType);
                
                if ("NO".equals(isNullable)) {
                    System.out.println("🔄 Found NOT NULL constraint on driver_id. Applying fix...");
                    
                    // Remove NOT NULL constraint from driver_id column
                    String fixSql = "ALTER TABLE sarky_logs ALTER COLUMN driver_id DROP NOT NULL";
                    jdbcTemplate.execute(fixSql);
                    
                    System.out.println("✅ Successfully made driver_id column nullable in sarky_logs table");
                    System.out.println("🎯 Non-drivable equipment can now save work entries without drivers!");
                } else {
                    System.out.println("✅ driver_id column is already nullable - no fix needed");
                }
                
            } catch (Exception e) {
                System.out.println("⚠️  driver_id column may not exist yet: " + e.getMessage());
            }
            
        } catch (Exception e) {
            System.err.println("⚠️  Warning: Could not check/fix sarky_logs driver_id constraint: " + e.getMessage());
            System.err.println("💡 This may be expected if the database is still initializing");
            // Don't fail startup for this issue
        }
    }
}
