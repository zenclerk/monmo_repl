var config = {
  src: {
		name: 'unique name',
		hosts: ['host:27017'],
		auth: {
			db: 'admin',
			user: '...',
			passwd: '...',
		},
		basedb: '_monmo',
  },
  dst: {
		name: 'unique name',
		hosts: ['host:27017'],
		auth: null,
		basedb: '_monmo',
  },
	options: {
		loglv: 50,
		index: false,
		target: {
			testdb: true,
			db1: 'db2', // Sync from src's db1 to dst's db2
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
