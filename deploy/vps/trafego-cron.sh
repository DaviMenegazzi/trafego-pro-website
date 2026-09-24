#!/bin/sh
# Chama uma rota agendada do site (substitui o agendador do Manus).
# Uso: trafego-cron.sh social-publish | evolution-ai-daily | evolution-quarantine-cleanup
set -eu
JOB="$1"
SECRET=$(grep -E '^CRON_SECRET=' /opt/trafego-pro/.env | cut -d= -f2-)
CODE=$(curl -s -m 280 -o /tmp/trafego-cron-"$JOB".out -w "%{http_code}" -X POST \
  -H "X-Cron-Secret: $SECRET" "http://127.0.0.1:3200/api/scheduled/$JOB")
echo "$(date -Is) $JOB http=$CODE $(head -c 300 /tmp/trafego-cron-"$JOB".out)" >> /var/log/trafego-cron.log
