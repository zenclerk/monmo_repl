#!/usr/bin/env bash

BASE=`dirname $0`/..

cd $BASE

function start_sync {
    i=$1
    CMD="forever -a start -c bash --uid repl$i -p logs -l forever$i.log -o logs/out$i.log -e logs/err$i.log bin/repl.sh -c conf/shard$i.js"
    echo $CMD
    $CMD
}

if [ "$1" = '' ]; then
    for i in {1..5}
    do
        start_sync $i
    done
else
    start_sync $1
fi
