#!/bin/bash

set -e

echo "Uruchamianie backendu..."
node backend/server.js &
BACKEND_PID=$!

echo "Uruchamianie frontendu..."
cd front
npm run preview &
FRONTEND_PID=$!
cd ..

cleanup() {
    echo -e "\nZamykanie serwerów..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Wszystko działa. Naciśnij Ctrl+C, aby zakończyć."

wait