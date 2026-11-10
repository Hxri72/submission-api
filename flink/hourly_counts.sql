SET 'pipeline.name' = 'form-hourly-counts';

CREATE TABLE submissions (
    _id STRING,
    form_id STRING,
    createdAt TIMESTAMP_LTZ(3),
    PRIMARY KEY (_id) NOT ENFORCED
) WITH (
    'connector' = 'mongodb-cdc',
    'hosts' = 'mongo:27017',
    'database' = 'submissions_db',
    'collection' = 'submissions'
);

CREATE TABLE form_hourly_counts (
    form_id STRING,
    submission_hour STRING,
    submission_count BIGINT,
    PRIMARY KEY (form_id, submission_hour) NOT ENFORCED
) WITH (
    'connector' = 'mongodb',
    'uri' = 'mongodb://mongo:27017/?directConnection=true',
    'database' = 'submissions_db',
    'collection' = 'form_hourly_counts'
);

INSERT INTO form_hourly_counts
SELECT
    form_id,
    DATE_FORMAT(CAST(createdAt AS TIMESTAMP(3)), 'yyyy-MM-dd HH:00') AS submission_hour,
    COUNT(*) AS submission_count
FROM submissions
GROUP BY form_id, DATE_FORMAT(CAST(createdAt AS TIMESTAMP(3)), 'yyyy-MM-dd HH:00');
