#!/bin/sh
set -eu

mongosh --host localhost --quiet --eval "try { rs.status() } catch (e) { if (e.codeName !== 'NotYetInitialized') throw e; rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]}) }"
