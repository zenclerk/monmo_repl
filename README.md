# What's this
Provide query based replication feature between MongoDB ReplicaSet by using oplog.

# Feature
- sync-index is optional. Around index is sencitive on MongoDB so delegate judgement to user.
- Can choise target DB's for replication.
- Can change destination DB name.

# Procidure
- Set ./monmo.env
- Create ./conf/setting.js

# Reference
https://github.com/mongodb/mongo/blob/master/src/mongo/db/repl/oplog.cpp#L540
