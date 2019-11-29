s = ''

official = 'n mod sep vt vi interj prep conj kama cont conj oth'.split(' ')
$$('dt').forEach(dt => {
const term = /[a-z]+(, [a-z]+)*/.exec(dt.textContent)[0]
const defs = [...dt.parentNode.querySelectorAll('dd[lang=en] i')]
const off = []
const add = []
defs.map(a => {
const defin = a.parentNode.textContent
const definit = defin.slice(defin.indexOf('\t') + 1).replace(/'/g, '\\\'').trim()
if (official.includes(a.textContent)) {
off.push([a.textContent, definit])
} else {
add.push([a.textContent, definit])
}
})
s += `${term}:
${off.length ?
`  off: [
${off.map(([a, b]) => `    ['${a}', '${b}']`).join('\n')}
  ]`:''}
${add.length ?
`  add: [
${add.map(([a, b]) => `    ['${a}', '${b}']`).join('\n')}
  ]`:''}

`

})
s
