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
      try {
        first_conn = connect(host + '/' + this.info.basedb);
        if ( first_conn ) {
          if ( this.info.auth ) {
            first_conn.getSiblingDB(this.info.auth.db).auth(this.info.auth.user,this.info.auth.passwd);
          }
          isMaster = first_conn.isMaster();
          if ( isMaster.ok == 1 && isMaster.me == isMaster.primary ) {
            logger(LOGLV.INFO, 'Not primary', isMaster);
            break;
          }
        }
      } catch (e) {
        logger(LOGLV.WARN, 'Connect error ' + host, e);
      }
    }
    if ( !first_conn ) {
      logger(LOGLV.ERR, 'Connect faild', this.info.hosts[i]);
      throw 'Connect faild';
    }
    logger(LOGLV.MSG, 'First connection', first_conn);
    rs_status = first_conn.adminCommand('replSetGetStatus');
    if ( rs_status.ok == 1 ) {
      for ( var i in rs_status.members ) {
        var member = rs_status.members[i];
        if ( member.state === 1 || member.state === 2 ) {
          try {
            this.monmo_db = connect(member.name + '/' + this.info.basedb);
            if (! this.monmo_db.isMaster().ismaster) {
              logger(LOGLV.WARN, 'Skipping. Hit non-primary member:' + host);
              continue;
            }
            this.primary = this.monmo_db.getMongo();
            this.monmo_db.getSiblingDB(this.info.auth.db).auth(this.info.auth.user,this.info.auth.passwd);
            break;
          } catch (e) {
            logger(LOGLV.WARN, 'Connect error ' + host, e);
          }
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
    var parsed = parseNS(ns);
    var db = this.getDB(parsed.db);
    if (!db ){
      return null;
    }
    this.ns[ns] = db.getCollection(parsed.col);
    return this.ns[ns];
  },
}
