# What's this
Provide query based replication feature between MongoDB ReplicaSet by using oplog.

# Limitation
- Now, it read oplog from only master.
- sync-index is optional. Around index is sencitive on MongoDB so delegate judgement to engineer.
- Can choise target DB's for replication.

# Reference
https://github.com/mongodb/mongo/blob/master/src/mongo/db/repl/oplog.cpp#L540

