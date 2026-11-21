CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL,
    reporter_id UUID NOT NULL,
    reporter_name VARCHAR(100) NOT NULL,

    report_type VARCHAR(30) NOT NULL,
    report_status VARCHAR(20) NOT NULL DEFAULT 'pending',

    description VARCHAR(500) NOT NULL,

    moderator_notes TEXT,
    reviewed_by_id UUID,
    reviewed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_report_post
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_report_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_report_reviewer
        FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_report_type
        CHECK (
            report_type IN (
                'inappropriate_content',
                'harassment',
                'spam',
                'misinformation',
                'other'
            )
        ),

    CONSTRAINT chk_report_status
        CHECK (
            report_status IN (
                'pending',
                'reviewed',
                'resolved',
                'dismissed'
            )
        ),

    CONSTRAINT chk_report_description
        CHECK (
            length(TRIM(description)) > 0
            AND length(description) <= 500
        )
);

CREATE INDEX IF NOT EXISTS idx_reports_post_id
    ON reports(post_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
    ON reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(report_status);

CREATE INDEX IF NOT EXISTS idx_reports_pending_created
    ON reports(created_at)
    WHERE report_status = 'pending';
