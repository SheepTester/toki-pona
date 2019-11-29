const CSON = require('cson')
const path = require('path')

const output = CSON.parseCSONFile(path.resolve(__dirname, './dumb-collect.cson'))
if (output instanceof Error) {
  throw output
} else {
  console.log(output)
}
