const CSON = require('cson')
const path = require('path')
const fs = require('fs')
const origins = require('./origins.json')

const output = CSON.parseCSONFile(path.resolve(__dirname, './dumb-collect.cson'))
if (output instanceof Error) {
  throw output
} else {
  for (const [word, origin] of Object.entries(origins)) {
    if (output[word]) {
      output[word].origin = origin
    } else {
      console.warn(word)
    }
  }
  fs.writeFile(path.resolve(__dirname, './toki-pona.json'), JSON.stringify(output), console.log)
}
