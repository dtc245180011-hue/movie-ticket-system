#!/bin/bash
cd /home/diepdinhhan/movie-ticket-system || exit 1
exec >> /home/diepdinhhan/movie-ticket-system/monitoring/logs/app.log 2>&1
exec /home/diepdinhhan/.local/bin/node /home/diepdinhhan/movie-ticket-system/server.js
