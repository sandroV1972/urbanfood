#!/bin/bash

PORT=4001

echo "=== SurfShack Server Start ==="

# Controlla processi node appesi
NODE_PIDS=$(pgrep -f "node.*server.js" 2>/dev/null)
if [ -n "$NODE_PIDS" ]; then
    echo "[!] Trovati processi node appesi: $NODE_PIDS"
    echo "    Termino i processi..."
    kill $NODE_PIDS 2>/dev/null
    sleep 1
    # Force kill se ancora attivi
    REMAINING=$(pgrep -f "node.*server.js" 2>/dev/null)
    if [ -n "$REMAINING" ]; then
        echo "    Force kill..."
        kill -9 $REMAINING 2>/dev/null
        sleep 1
    fi
    echo "    Processi terminati."
fi

# Controlla se la porta è occupata da altro
PORT_PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PORT_PID" ]; then
    echo "[!] Porta $PORT occupata dal processo $PORT_PID"
    PORT_CMD=$(ps -p $PORT_PID -o comm= 2>/dev/null)
    echo "    Processo: $PORT_CMD"
    echo "    Termino il processo..."
    kill $PORT_PID 2>/dev/null
    sleep 1
    if lsof -ti :$PORT >/dev/null 2>&1; then
        kill -9 $(lsof -ti :$PORT) 2>/dev/null
        sleep 1
    fi
    echo "    Porta $PORT liberata."
fi

# Avvia il server
echo "[*] Avvio server su porta $PORT..."
npx nodemon server.js
