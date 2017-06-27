var REPL_LOG = 'log';
var REPL_LAST_KEY = config.src.name;
var OPTIONS_KEY = config.src.name;
var LOGSIZE = 1024*1024*1024;
var MAX_BULK = 5000;
var SYSTEM_INDEXES = 'system.indexes';
var OPTIONS = 'options';
var REPL_LAST = 'last';

logger(LOGLV.MSG, '== SRC ==' );
var srcRS = new ReplSet(config.src);
srcRS.oplog = srcRS.getCollection('local.oplog.rs');
logger(LOGLV.MSG, '== DST ==' );
var dstRS = new ReplSet(config.dst);

dstRS.repllast = dstRS.monmo_db.getCollection(REPL_LAST);
dstRS.options  = dstRS.monmo_db.getCollection(OPTIONS);


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
  var ns = convertDB(log.ns);
  var org_ns = log.ns;
  log.ns = ns.db + '.' + ns.col;
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
    .addOption(DBQuery.Option.awaitdata)
    .addOption(DBQuery.Option.oplogReplay);
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
    var logCount = 0;
    while(opCur.hasNext()) {
      var log = opCur.next();
      logCount++;
      if ( ! config.options.dryrun ) {
        apply(log);
      }
      lastLog = log;
      if ( new Date().getTime() - logTime > config.options.bulkInterval || logCount >= MAX_BULK) {
        executeBulkAll();
        logger(LOGLV.INFO, 'TS: ' + lastLog.ts + ', DF: ' + (parseInt((new Date).getTime()/1000) - lastLog.ts.t + ', C: ' + logCount), {
          loglv:   config.options.loglv,
          dry:     config.options.dryrun,
          repllog: config.options.repllog,
        });
        logCount = 0;

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
