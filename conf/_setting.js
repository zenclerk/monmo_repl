var config = {
  src: {
    name: 'unique name',
    hosts: ['host:27017'],
    auth: { // or null
      db: 'admin',
      user: '...',
      passwd: '...',
    },
    basedb: '_monmo', // only login
  },
  dst: {
    name: 'unique name',
    hosts: ['host:27017'],
    auth: null,
    basedb: '_monmo', // logging db
  },
  options: {
    loglv: 50,
    index: false,
    target: {
      testdb: true,
      db1: 'db2', // Sync from src's src.db1 to dst.db2
    },
    ignore: {
    },
    dryrun: false,
    repllog: false,
    bulkInterval: 1000,
    executeBulkHook: false,
    applyHook: false,
    intervalHook: false,
  },
  executeBulkHook: function(ns, bulk){
  },
  applyHook: function(op, ns, log){
  },
  intervalHook: function(lastLog){
  },
};
