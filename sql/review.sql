SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'km_document_chunk'
      AND COLUMN_NAME = 'is_edited'
);

SET @alter_sql = IF(
    @column_exists = 0,
    'ALTER TABLE km_document_chunk ADD COLUMN is_edited TINYINT NOT NULL DEFAULT 0 AFTER is_active',
    'SELECT 1'
);

PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

CREATE TABLE IF NOT EXISTS km_review_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    doc_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL COMMENT 'APPROVE/REJECT',
    comment TEXT DEFAULT NULL,
    operator_user_id VARCHAR(64) DEFAULT NULL,
    operator_name VARCHAR(64) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_review_doc (doc_id, created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='人工审核记录表';

CREATE TABLE IF NOT EXISTS km_chunk_edit_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    chunk_id BIGINT NOT NULL,
    before_content MEDIUMTEXT DEFAULT NULL,
    after_content MEDIUMTEXT NOT NULL,
    action VARCHAR(32) NOT NULL DEFAULT 'EDIT',
    operator_user_id VARCHAR(64) DEFAULT NULL,
    operator_name VARCHAR(64) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chunk_edit_log_chunk (chunk_id, created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='切片人工编辑日志表';
