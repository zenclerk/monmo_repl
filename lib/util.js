var LOGLV = {
  MSG : 10,
  CRIT: 20,
  ERR : 30,
  WARN: 40,
  INFO: 50,
  DBG : 60,
  DUMP: 90,
};
var STR_LOGLV = {}
for ( var i in LOGLV ) {
  STR_LOGLV[LOGLV[i]] = i;
}

function logger ( lv, msg, arg ){
  if ( config.options.loglv >= lv ) {
    var line = STR_LOGLV[lv] + ', ' + msg + ', ';
    if ( arg ) {
      line += JSON.stringify(arg);
    }
    print( line);
  }
}

function parseNS(ns){
  var ns_split  = ns.split('\.');
  return {
    db  : ns_split.shift() ,
    col : ns_split.join('\.')
  };
}

function convertDB(logNS){
  var ns = parseNS(logNS);
  if ( config.options.target[ns.db] ) {
    if ( typeof config.options.target[ns.db] == 'string' ) {
      ns.db = config.options.target[ns.db];
    }
  }else if (config.options.target['_ALL_']){
  }else{
    return null;
  }
  return ns;
}

function genTimeStamp(){
  return new Timestamp(parseInt((new Date).getTime()/1000), 1);
}

Timestamp.prototype.equals = function (ts) {
  return (this.t === ts.t && this.i === ts.i);
}

// String.prototype.replaceAll = function (org, dest){
//   return this.split(org).join(dest);
// }

// String.prototype.reverse = function (){
//   return this.split('').reverse().join('')
// }

// Array.has = function(arr, obj, equals){
//   if ( !equals ) {
//     equals = function(a,b) { return a === b; };
//   }

//   for( var i in arr ) {
//     if ( equals(arr[i], obj) ) {
//       return true;
//     }
//   }
//   return false;
// };
