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
    -l, --loglv               : New loglv
    -n, --name                : Specify target process
Example :
    bin/repl.sh -f -c conf/settings.js

USAGE
  exit $1
}
NAME='var NAME = null;'
CONFIG=''

while getopts ':hc:n:l:' OPTION; do
  echo $OPTION $OPTARG
  case $OPTION in
    h|--help)          usage 0 ;;
    c|--config)        CONFIG="${OPTARG}";;
    n|--name)          NAME="var NAME = '${OPTARG}';";;
    l|--loglv)         LV="var LV = ${OPTARG};";;
    --) break;;
  esac
done

${MONGO_SHELL} --nodb --quiet --eval "${NAME}${LV}" $CONFIG $CURDIR/../lib/monmo-repl.js $CURDIR/../lib/loglv.js &
