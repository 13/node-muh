// InfluxDB v2
const url = process.env['INFLUX_URL'] || 'http://localhost:8086'
const token = process.env['INFLUX_TOKEN'] || 'Ar0LC8xpG3G4gwanAw_Mmbwk-_ue1ikIdcccAhq8tuafcV0ok4lPif0HSOAeV5cM8wZXHdMVeVmlHE8Gegq5uA=='
const org = process.env['INFLUX_ORG'] || 'muh'
const bucket = 'homeautomation'
// InfluxDB v1.8
const username = 'admin'
const password = 'uaW2aiM2'
const token18 = `${username}:${password}`

module.exports = {
  url,
  token,
  org,
  bucket,
  token18
}
