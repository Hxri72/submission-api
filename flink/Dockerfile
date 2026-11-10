FROM flink:1.20.3-scala_2.12-java17

ADD --chmod=644 https://repo1.maven.org/maven2/org/apache/flink/flink-sql-connector-mongodb-cdc/3.5.0/flink-sql-connector-mongodb-cdc-3.5.0.jar /opt/flink/lib/
ADD --chmod=644 https://repo1.maven.org/maven2/org/apache/flink/flink-sql-connector-mongodb/2.0.0-1.20.0/flink-sql-connector-mongodb-2.0.0-1.20.0.jar /opt/flink/lib/

RUN mkdir -p /flink-checkpoints && chown flink:flink /flink-checkpoints
