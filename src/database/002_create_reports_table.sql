-- Tabla para reportes de contenido inapropiado
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    reporter_id UUID NOT NULL,
    reporter_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    description TEXT NOT NULL,
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

    CONSTRAINT fk_report_moderator
        FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_report_type
        CHECK(
            report_type IN (
                'inappropriate_content',
                'harassment',
                'spam',
                'misinformation',
                'other'
            )
        ),

    CONSTRAINT chk_report_status
        CHECK(
            report_status IN (
                'pending',
                'reviewed',
                'resolved',
                'dismissed'
            )
        ),

    CONSTRAINT chk_description
        CHECK(length(trim(description)) > 0),

    CONSTRAINT chk_description_length
        CHECK(length(description) <= 500)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_reports_post
ON reports(post_id);

CREATE INDEX idx_reports_status
ON reports(report_status);

CREATE INDEX idx_reports_created
ON reports(created_at DESC);

CREATE INDEX idx_reports_reporter
ON reports(reporter_id);
