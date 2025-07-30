-- Create monitoring results table
CREATE TABLE IF NOT EXISTS monitoring_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'unknown')),
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monitoring_results_target_checked 
ON monitoring_results(target_name, checked_at DESC);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_monitoring_results_checked_at 
ON monitoring_results(checked_at DESC);

-- Optional: Create a view for latest status
CREATE OR REPLACE VIEW monitoring_latest_status AS
SELECT DISTINCT ON (target_name)
    target_name,
    status,
    response_time_ms,
    status_code,
    error_message,
    checked_at
FROM monitoring_results
ORDER BY target_name, checked_at DESC;

-- Optional: Clean up old data (keep only last 30 days)
-- This can be run periodically
-- DELETE FROM monitoring_results WHERE checked_at < NOW() - INTERVAL '30 days';