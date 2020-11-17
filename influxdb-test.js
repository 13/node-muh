#!/usr/bin/env node

const {InfluxDB} = require('@influxdata/influxdb-client')
//const {hostname} = require('os')

// You can generate a Token from the "Tokens Tab" in the UI
const token = 'Ar0LC8xpG3G4gwanAw_Mmbwk-_ue1ikIdcccAhq8tuafcV0ok4lPif0HSOAeV5cM8wZXHdMVeVmlHE8Gegq5uA=='
const org = 'muh'
const bucket = 'homeautomation'

const client = new InfluxDB({url: 'http://localhost:8086', token: token})

// write
const {Point} = require('@influxdata/influxdb-client')
const writeApi = client.getWriteApi(org, bucket)
//writeApi.useDefaultTags({location: hostname()})

const point = new Point('portal')
  .tag('portal_name', 'HDL')
  .floatField('state', 0)
writeApi.writePoint(point)

writeApi
    .close()
    .then(() => {
        console.log('INSERT: ' + point)
    })
    .catch(e => {
        console.error(e)
		if (e instanceof HttpError && e.statusCode === 401) {
		  console.log('ERR: ' + e)
		}
        console.log('ERR: ' + e)
    })
	
// read
const queryApi = client.getQueryApi(org)

const query = `from(bucket:"homeautomation") 
                 |> range(start: 0) 
				 |> filter(fn: (r) => r["_measurement"] == "portal")
                 |> filter(fn: (r) => r["portal_name"] == ${portal})
                 |> filter(fn: (r) => r["_field"] == "state")
				 |> sort(columns:["_time"], desc: true)
                 |> limit(n:1)`;
queryApi.queryRows(query, {
  next(row, tableMeta) {
    const o = tableMeta.toObject(row)
    console.log(
	  `${o._time} ${o._measurement} ${o.portal_name} ${o._field}=${o._value}`
    )
  },
  error(e) {
    console.error(e)
    console.log('ERR: ' + e)
  },
  complete() {
    //console.log('')
  },
})