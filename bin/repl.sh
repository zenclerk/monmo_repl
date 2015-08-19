#!/usr/bin/env bash
CURDIR=`dirname $0`
source $CURDIR/../monmo.env

usage (){
    cat<<USAGE
Usage :
  repl.sh [options]

Summary:

Options :
    -h, --help                : This message
    -c, --config              : Specify config file
    -f, --force-tail          : Sync from tail
    -n, --dry-run             : Affect nothing
Example :
    bin/repl.sh -f -c conf/settings.js

USAGE
    exit $1
}
DRY_RUN='var DRY_RUN = false;'
FORCE_TAIL='var FORCE_TAIL = false;'
CONFIG=''

while getopts ':hc:fn' OPTION; do
    echo $OPTION $OPTARG
    case $OPTION in
        h|--help)          usage 0 ;;
        c|--config)        CONFIG="${OPTARG}";;
        f|--force-tail)    FORCE_TAIL='var FORCE_TAIL = true;';;
        n|--dry-run)       DRY_RUN='var DRY_RUN = true;';;
        --) break;;
    esac
done

QUIT=
#
PIDS=''

${MONGO_SHELL} --nodb --quiet --eval "${FORCE_TAIL}${DRY_RUN}" $CONFIG $CURDIR/../extras/* $CURDIR/../lib/util.js $CURDIR/../lib/replset.js $CURDIR/../lib/monmo-repl.js $CURDIR/../lib/main.js
