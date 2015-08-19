# What's this
It provides a query based replication feature between MongoDB ReplicaSet by using oplog.

# Feature
- Sync-index is optional. Around index is sensitive on MongoDB (delegate the judgement to the user).
- Can choose the target DB's for replication.
- Can change the destination DB name.

# Procedure
- Set `./monmo.env`
- Create `./conf/setting.js`

# Reference
https://github.com/mongodb/mongo/blob/master/src/mongo/db/repl/oplog.cpp#L540

# Log format
## INFO
`INFO, TS: Timestamp(...), DF: <delay from oplog>, C: <num of sync op>, {...}`

## DUMP
`DUMP, BULK: ns, {"i":<num of insert op>,"u":<num of update op>,"d":<num of delete op>,"m":<num of migrate op>,"b":<num of batch op>}`

## Example
```
INFO, TS: Timestamp(1433592288, 132), DF: 1, C: 5000, {"loglv":100,"dry":false,"repllog":false}
DUMP, BULK: xxxxxxxxx.yyyyyyyy01, {"i":0,"u":3124,"d":0,"m":0,"b":3124}
DUMP, BULK: xxxxxxxxx.yyyyyyyy02, {"i":620,"u":1440,"d":0,"m":0,"b":2060}
DUMP, BULK: xxxxxxxxx.yyyyyyyy03, {"i":11,"u":46,"d":0,"m":0,"b":57}
DUMP, BULK: xxxxxxxxx.yyyyyyyy04, {"i":66,"u":0,"d":0,"m":0,"b":66}
DUMP, BULK: xxxxxxxxx.yyyyyyyy05, {"i":6,"u":0,"d":0,"m":0,"b":6}
DUMP, BULK: xxxxxxxxx.yyyyyyyy06, {"i":10,"u":0,"d":0,"m":0,"b":10}
DUMP, BULK: xxxxxxxxx.yyyyyyyy07, {"i":6,"u":0,"d":0,"m":0,"b":6}
DUMP, BULK: xxxxxxxxx.yyyyyyyy08, {"i":44,"u":0,"d":0,"m":0,"b":44}
DUMP, BULK: xxxxxxxxx.yyyyyyyy09, {"i":0,"u":210,"d":0,"m":0,"b":210}
DUMP, BULK: xxxxxxxxx.yyyyyyyy10, {"i":102,"u":0,"d":0,"m":0,"b":102}
DUMP, BULK: xxxxxxxxx.yyyyyyyy11, {"i":200,"u":0,"d":0,"m":0,"b":200}
DUMP, BULK: xxxxxxxxx.yyyyyyyy12, {"i":22,"u":0,"d":0,"m":0,"b":22}
```

# Contributing

- Fork it
- Create your feature branch (`git checkout -b my-new-feature`)
- Commit your changes (`git commit -am 'Add some feature'`)
- Push to the branch (`git push origin my-new-feature`)
- Create new Pull Request
