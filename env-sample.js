// InfluxDB v2
const url = process.env['INFLUX_URL'] || 'http://localhost:8086'
const token = process.env['INFLUX_TOKEN'] || ''
const org = process.env['INFLUX_ORG'] || 'muh'
const bucket = 'homeautomation'
// InfluxDB v1.8
const username = ''
const password = ''
const token18 = `${username}:${password}`
// Pushover
const po_user = ''
const po_token = ''
// Email
const emailFrom = ''
const emailTo = ''
// WOL hosts
var hosts = { 'hosts' : [
	{ name:'google.com', port:'80'},
	{ name:'samstv.muh', port:'22', mac:'90:1B:0E:3E:F3:77', ip:'192.168.22.20'}
]}

module.exports = {
  url,
  token,
  org,
  bucket,
  token18,
  po_user,
  po_token,
  emailFrom,
  emailTo
  hosts
}
