#!/bin/bash
set -e
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf
sed -i "s/port = 5432/port = 5433/g" /etc/postgresql/16/main/postgresql.conf
echo "host all all 0.0.0.0/0 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all 127.0.0.1/32 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all ::1/128 trust" >> /etc/postgresql/16/main/pg_hba.conf
service postgresql restart
service redis-server start
su - postgres -c "psql -p 5433 -c \"CREATE USER root WITH PASSWORD 'rootpassword' SUPERUSER;\"" || true
su - postgres -c "psql -p 5433 -c \"CREATE DATABASE online_judge_db OWNER root;\"" || true
echo "DATABASE SETUP COMPLETED SUCCESSFULLY"
