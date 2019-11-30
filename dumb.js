// http://tokipona.net/tp/ClassicWordList.aspx
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

// http://ucteam.ru/toki-pona/
obj = {}
$$('#etymologies tr').forEach(thing => {
[a, b] = thing.children
thing.querySelectorAll('abbr').forEach(t => t.outerHTML = `[${t.textContent}]`)
z = b.textContent
if (z !== '?') obj[a.textContent] = z === 'a priori' ? '[a priori]' : z
})
JSON.stringify(obj)

// for the key
obj = {}
$$('#abbreviations tr').forEach(thing => {
[a, b] = thing.children
obj[a.textContent] = b.textContent
})
JSON.stringify(obj)
