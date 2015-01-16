var REPL_LOG = 'log';
var REPL_LAST = 'last';
var REPL_LAST_KEY = config.src.name;
var OPTIONS = 'options';
var OPTIONS_KEY = config.src.name;
var LOGSIZE = 1024*1024*1024;
var BULKSIZE = 20*124*124;
var SYSTEM_INDEXES = 'system.indexes';
var IGNORE_DBS = ['admin', 'local', 'repl'];

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

if ( !config.options.bulkInterval ) {
  config.options.bulkInterval = 1000; // 1sec by defalt
}

if ( typeof exApplyHook === 'undefined' ){
  exApplyHook = function(op, ns, log) {
  }
}

function applyHook(op, ns, log) {
  if ( config.options.applyHook ) {
    exApplyHook(op, ns, log);
  }
}

if ( typeof exExecuteBulkHook === 'undefined' ){
  exExecuteBulkHook = function(ns, bulk) {
  }
}

function executeBulkHook(ns, bulk){
  if ( config.options.executeBulkHook ) {
    exExecuteBulkHook(ns, bulk);
  }
}

if ( typeof exIntervalHook === 'undefined' ){
  exIntervalHook = function(lastLog){
  }
}

function intervalHook(lastLog){
  if ( config.options.intervalHook ) {
    exIntervalHook(lastLog);
  }
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

var monmo = {
  parseNS: function(ns){
    var ns_split  = ns.split('\.');
    return {
      db  : ns_split.shift() ,
      col : ns_split.join('\.')
    };
  }
};

String.prototype.replaceAll = function (org, dest){
  return this.split(org).join(dest);
}

String.prototype.reverse = function (){
  return this.split('').reverse().join('')
}

Timestamp.prototype.equals = function (ts) {
  return (this.t === ts.t && this.i === ts.i);
}

Array.has = function(arr, obj, equals){
  if ( !equals ) {
    equals = function(a,b) { return a === b; };
  }

  for( var i in arr ) {
    if ( equals(arr[i], obj) ) {
      return true;
    }
  }
  return false;
};

function ReplSet( info ) {
  this.info = info;
  this.getConnection();
}

ReplSet.prototype = {
  ns: {},
  primary: null,
  getConnection: function () {
    this.ns = {};
    this.primary = null;
    var first_conn = null;
    for(var i in this.info.hosts){
      var host = this.info.hosts[i];
      first_conn = connect(host + '/' + this.info.basedb);
      if ( this.info.auth ) {
        first_conn.getSiblingDB(this.info.auth.db).auth(this.info.auth.user,this.info.auth.passwd);
      }
      if ( first_conn ) {
        break;
      }
    }
    logger(LOGLV.MSG, 'First connection', first_conn);
    rs_status = first_conn.adminCommand('replSetGetStatus');
    if ( rs_status.ok == 1 ) {
      for ( var i in rs_status.members ) {
        var member = rs_status.members[i];
        if ( member.state === 1 ) {
          this.monmo_db = connect(member.name + '/' + this.info.basedb);
          this.primary = this.monmo_db.getMongo();
          this.monmo_db.getSiblingDB(this.info.auth.db).auth(this.info.auth.user,this.info.auth.passwd);
          break;
        }
      }
    } else if ( rs_status.info == 'mongos' ) {
      this.monmo_db = first_conn;
      this.primary = this.monmo_db.getMongo();
    } else {
      this.monmo_db = first_conn;
      this.primary = this.monmo_db.getMongo();
    }
  },
  getDB: function (db) {
    if (!this.primary) {
      return null;
    }
    if ( this.ns[db] ) {
      return this.ns[db];
    }
    this.ns[db] = this.primary.getDB(db);
    return this.ns[db];
  },
  getCollection: function (ns) {
    if (!this.primary) {
      return null;
    }
    if ( this.ns[ns] ) {
      return this.ns[ns];
    }
    var parsed = monmo.parseNS(ns);
    var db = this.getDB(parsed.db);
    if (!db ){
      return null;
    }
    this.ns[ns] = db.getCollection(parsed.col);
    return this.ns[ns];
  },
}

logger(LOGLV.MSG, '== SRC ==' );
var srcRS = new ReplSet(config.src);
srcRS.oplog = srcRS.getCollection('local.oplog.rs');
logger(LOGLV.MSG, '== DST ==' );
var dstRS = new ReplSet(config.dst);

dstRS.repllast = dstRS.monmo_db.getCollection(REPL_LAST);
dstRS.options  = dstRS.monmo_db.getCollection(OPTIONS);

function genTimeStamp(){
  return new Timestamp(parseInt((new Date).getTime()/1000), 1);
}

var lastTimestamp = null;

function getLastTimestamp() {
  if (lastTimestamp) {
    return lastTimestamp;
  }
  if ( !FORCE_TAIL ) {
    lastTimestamp = dstRS.repllast.findOne({_id: REPL_LAST_KEY});
    if (lastTimestamp) {
      lastTimestamp = lastTimestamp.ts;
      return lastTimestamp;
    }
  }
  lastTimestamp = srcRS.oplog
    .find()
    .sort({$natural:-1})
    .limit(1)
  [0].ts
  return lastTimestamp;
}

function setLastTimestamp(ts) {
  dstRS.repllast.save({_id: REPL_LAST_KEY, ts: ts});
  lastTimestamp = ts;
}

function loadOptions() {
  config.options = dstRS.options.findOne({_id: OPTIONS_KEY});
}

function repllog(msg, log){
  if ( config.options.repllog ) {
    logger(LOGLV.DUMP, msg, log);
    dstRS.repllog.save({ msg: msg, log: obj, t: new Date});
  }
}

function ensureIndex(obj){
  var ns = obj.ns;
  var key = obj.key;
  var option = obj;
  delete(option.ns);
  delete(option.key);
  option.background = true; // Allways should be true
  dstRS.getCollection(ns).ensureIndex(key, option);
}

var fromMigrateByNs = {}
var bulkByNs = {}
function executeBulk(ns) {
  if ( bulkByNs[ns]) {
    var bulk = bulkByNs[ns];
    bulk.execute({w:0});
    var bulkLog = {
      i: bulk.nInsertOps,
      u: bulk.nUpdateOps,
      d: bulk.nRemoveOps,
      m: fromMigrateByNs[ns],
      b: bulk.nInsertOps + bulk.nUpdateOps + bulk.nRemoveOps + fromMigrateByNs[ns],
    };
    executeBulkHook (ns, bulkLog);
    if ( config.options.loglv >= LOGLV.DUMP ) {
      logger(LOGLV.DUMP, 'BULK: ' + ns, bulkLog);
    }
    fromMigrateByNs[ns] = 0;
    bulkByNs[ns] = null;
  }
}
function getBulk(ns) {
  if ( !bulkByNs[ns]) {
    bulkByNs[ns] = dstRS.getCollection(ns).initializeOrderedBulkOp();
  }
  return bulkByNs[ns];
}
function executeBulkAll() {
  for ( var ns in bulkByNs ) {
    executeBulk(ns);
  }
}

function apply(log){
  var ns = monmo.parseNS(log.ns);
  var org_ns = log.ns;
  if ( config.options.target[ns.db] ) {
    if ( typeof config.options.target[ns.db] == 'string' ) {
      // Convert DB
      ns.db = config.options.target[ns.db];
      log.ns = ns.db + '.' + ns.col;
    }
  }else if (config.options.target['_ALL_']){
    // Do nothing
  }else{
    // Skip sync
    return;
  }
  if ( log.fromMigrate ) {
    // Skip sync
    if ( !fromMigrateByNs[log.ns] ) {
      fromMigrateByNs[log.ns] = 0;
    }
    fromMigrateByNs[log.ns]++;
    applyHook('fromMigrate', org_ns, log);
    return;
  }
  if ( log.op === 'n' ) {
    // np
    repllog('np', log);
  }else if  ( log.op === 'i' ) {
    if ( ns.col == SYSTEM_INDEXES ) {
      if ( config.options.index ) {
        repllog('ensureIndex', log.o);
        ensureIndex(log.o);
        applyHook('ensureIndex', org_ns, log);
      } else {
        repllog('ensureIndex skip', log.o);
      }
    }else{
      // dstRS.getCollection(log.ns).insert(log.o);
      getBulk(log.ns).insert(log.o);
      applyHook(log.op, org_ns, log);
    }
  }else if  ( log.op === 'u' ) {
    // dstRS.getCollection(log.ns).update(log.o2, log.o, {upsert: log.b});
    if ( log.b ) {
      getBulk(log.ns).find(log.o2).upsert().updateOne(log.o);
    }else {
      getBulk(log.ns).find(log.o2).updateOne(log.o);
    }
    applyHook(log.op, org_ns, log);
  }else if  ( log.op === 'd' ) {
    // dstRS.getCollection(log.ns).remove(log.o, {justOne: log.b});
    if ( log.b ) {
      getBulk(log.ns).find(log.o).removeOne();
    }else{
      getBulk(log.ns).find(log.o).remove();
    }
    applyHook(log.op, org_ns, log);
  }else if  ( log.op === 'c' ) {
    if ( log.o['deleteIndexes'] ) {
      if ( config.options.index ) {
        repllog('dropIndex', log.o);
        dstRS.getDB(ns.db).runCommand(log.o);
        applyHook('dropIndex', org_ns, log);
      }else{
        repllog('dropIndex skip', log.o);
      }
    }else{
      executeBulk(log.ns);
      repllog('command', log.o);
      dstRS.getDB(ns.db).runCommand(log.o);
      applyHook(log.op, org_ns, log);
    }
  }else {
    repllog('unknown op', log);
  }
}

var opCur = null;

function opQuery(){
  DBQuery.shellBatchSize = 100000;
  var query = {
    ts: {$gt : getLastTimestamp()},
    // fromMigrate: { $exists: false }, // Bug ? of tailabe cursor
  };

  logger(LOGLV.MSG, 'opQuery', query);
  opCur = srcRS.oplog
    .find(query)
    .sort({$natural:1})
    .addOption(DBQuery.Option.tailable)
    .addOption(DBQuery.Option.noTimeout)
    .addOption(DBQuery.Option.awaitdata);
}

function replLoop(){
  config.options.dryrun = DRY_RUN;
  config.options._id = OPTIONS_KEY;
  dstRS.options.save(config.options);
  if ( ! config.options.dryrun ) {
    dstRS.monmo_db.createCollection(REPL_LOG, {capped: 1, size: LOGSIZE});
  }
  dstRS.repllog = dstRS.monmo_db.getCollection(REPL_LOG);
  loadOptions();

  var logTime = new Date().getTime();
  opQuery();
  while (true) {
    var lastLog = null;
    while(opCur.hasNext()) {
      var log = opCur.next();
      if ( ! config.options.dryrun ) {
        apply(log);
      }
      lastLog = log;
      if ( new Date().getTime() - logTime > config.options.bulkInterval ) {
        executeBulkAll();
        logger(LOGLV.INFO, 'TS: ' + lastLog.ts + ', DF: ' + (parseInt((new Date).getTime()/1000) - lastLog.ts.t), {
          loglv:   config.options.loglv,
          dry:     config.options.dryrun,
          repllog: config.options.repllog,
        });

        if ( ! config.options.dryrun ) {
          setLastTimestamp(lastLog.ts);
          intervalHook(lastLog);
        }
        logTime = new Date().getTime();
        loadOptions();
      }
    }
    if (!lastLog) {
      opQuery();
    }
    sleep(1000);
  }
}

function updateLoglv (name, lv){
  var query = {}
  if ( name ) {
    query._id = name;
  }
  dstRS.options.update(query, {$set: { loglv: lv } }, {multi: true})
}
