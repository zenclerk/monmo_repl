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

function kick_worker {
		if [ "${QUIT}" = "" ]; then
				${MONGO_SHELL} --nodb --quiet --eval "${FORCE_TAIL}${DRY_RUN}" $CONFIG $CURDIR/../extras/* $CURDIR/../lib/monmo-repl.js $CURDIR/../lib/main.js &
				PIDS="${PIDS} $!"
				echo " == RESTART WORKER ( $! ) == "
		fi
}
function sigchild {
		for PID in ${PIDS}; do
				kill -s 0 ${PID} 2> /dev/null
				if [ "$?" != "0" ];then
						kick_worker
				fi
		done

		NEW_PIDS=
		for PID in ${PIDS}; do
				kill -s 0 ${PID} 2> /dev/null
				if [ "$?" = "0" ];then
						NEW_PIDS="${NEW_PIDS} ${PID}"
				else
						echo " == WORKER DIED ( ${PID} ) == "
						wait ${PID}
				fi
		done
		PIDS=${NEW_PIDS}
}
function sigquit {
		echo " == TERMINATE SIGNAL == "
		QUIT=1
		kill $PIDS
}

#trap "sigchild" 17
#trap 'sigquit' 2

kick_worker

# To trap SIGCHLD
#set -m

while [ "${PIDS}" != "" ] ; do
		wait ${PIDS}
done
echo '== WAIT FOR WORKERS =='
echo ${PIDS}
wait ${PIDS}
