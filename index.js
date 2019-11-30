const content = document.getElementById('content')
const syntaxHighlighted = document.getElementById('syntax-highlighted')

function displayContent () {
  const text = content.value
  syntaxHighlighted.textContent = text
  syntaxHighlighted.appendChild(Elem('span', {
    className: 'empty-line-placeholder'
  }, ['']))
}

content.addEventListener('input', displayContent)
displayContent()

content.addEventListener('scroll', e => {
  syntaxHighlighted.scrollTop = content.scrollTop
})

function getJSON (path) {
  return fetch(path)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
}

let speechPartsKey, originLangsKey

const entry = document.getElementById('entry')
function defElem([speechParts, def]) {
  return Elem('li', {}, [
    ...speechParts.split(', ').map(speechPart => [
      Elem('abbr', {
        className: `speech-part pos-${speechPart}`,
        title: speechPartsKey[speechPart]
      }, [speechPart]),
      ' '
    ]).flat(),
    def
  ])
}
function showDef (term, data = {}) {
  if (term) {
    document.body.classList.remove('no-content')
    empty(entry)
    const { summary, _tags, off = [], add = [], obsolete, origin } = data
    let etym
    if (origin) {
      etym = origin
        .replace(/\/[^/]*\//g, '<span class="ipa">$&</span>')
        .replace(/\(|\)/g, '<span class="plain-text">$&</span>')
        .replace(/\[([a-z-]*)\]/g, (_, lang) =>
          `<span class="language">${originLangsKey[lang]}</span>`)
    }
    entry.appendChild(Fragment([
      Elem('div', { className: 'entry-word' }, [term]),
      Elem('div', { className: 'entry-summary' }, [summary]),
      Elem('ul', { className: 'entry-tags' }, _tags.map(tag =>
        Elem('li', { className: `tag-${tag}` }, [tag]))),
      Elem('ul', { className: 'definitions' }, [
        typeof obsolete === 'string'
          ? Elem('li', {}, [`Use ${obsolete} instead`])
          : null,
        ...off.map(defElem),
        off.length && add.length ? Elem('li', {}, [Elem('hr')]) : null,
        ...add.map(defElem)
      ]),
      origin
        ? (origin === '[a priori]'
          ? Elem('div', { className: 'etymology origin' }, ['A priori'])
          : Elem('div', { className: 'etymology' }, [
            'From ',
            Elem('span', { className: 'origin', innerHTML: etym })
          ]))
        : null
    ]))
  } else {
    document.body.classList.add('no-content')
  }
}
showDef()

const list = document.getElementById('results')
const categorySelect = document.getElementById('categories')
const search = document.getElementById('search')

const nonConsonants = /[^a-z]|[aeiou]/g
function consonantCompare (sub, word) {
  const minQuery = sub.toLowerCase().replace(nonConsonants, '')
  return minQuery.length && word.toLowerCase().replace(nonConsonants, '')
    .startsWith(minQuery)
}
function searchDef(sub, defs) {
  return defs.toLowerCase().includes(sub.toLowerCase())
}

Promise.all([
  getJSON('./toki-pona.json'),
  getJSON('./key.json'),
  getJSON('./pos.json')
]).then(([words, originLangs, speechParts]) => {
  originLangsKey = originLangs
  speechPartsKey = speechParts
  const elems = []
  const tagTypes = []
  for (const [term, { see }] of Object.entries(words)) {
    if (see) {
      words[term] = JSON.parse(JSON.stringify(words[see]))
    }
    const {
      new: isNew,
      obsolete,
      tags = [],
      summary,
      off = [],
      add = []
    } = words[term]
    const _tags = []
    if (isNew) _tags.push('new')
    if (obsolete) {
      _tags.push('obsolete')
    }
    _tags.push(...tags)
    words[term]._tags = _tags
    if (tags.length) {
      for (const tag of tags) {
        if (!tagTypes.includes(tag)) {
          tagTypes.push(tag)
        }
      }
    } else {
      words[term]._uncategorized = true
    }
    words[term]._definitions = [...off, ...add].map(([_, defin]) => defin).join('\n')
    const elem = Elem('li', { data: { term } }, [
      Elem('span', { className: 'word' }, [term]),
      ' ',
      Elem('span', { className: 'summary' }, [`"${summary}"`]),
      ' ',
      Elem('ul', { className: 'tags' }, _tags.map(tag => [
        Elem('li', { className: `tag-${tag}` }, [tag]),
        ' '
      ]).flat())
    ])
    words[term]._elem = elem
    elems.push(elem)
  }
  list.appendChild(Fragment(elems))
  categorySelect.appendChild(Fragment(
    ['all', ...tagTypes, 'obsolete', 'uncategorized']
      .map(category => Elem('option', {}, [category]))
  ))
  function filterWords () {
    if (search.value) {
      document.body.classList.add('searching')
      const query = search.value
      for (const [term, { _elem, _definitions }] of Object.entries(words)) {
        if (consonantCompare(query, term) || searchDef(query, _definitions)) {
          _elem.classList.remove('hidden')
        } else {
          _elem.classList.add('hidden')
        }
      }
    } else {
      document.body.classList.remove('searching')
      let fn
      switch (categorySelect.value) {
        case 'all':
          fn = ({ obsolete }) => !obsolete
          break
        case 'uncategorized':
          fn = ({ _uncategorized }) => _uncategorized
          break
        default:
          const tag = categorySelect.value
          fn = ({ _tags }) => _tags.includes(tag)
      }
      for (const data of Object.values(words)) {
        if (fn(data)) {
          data._elem.classList.remove('hidden')
        } else {
          data._elem.classList.add('hidden')
        }
      }
    }
  }
  categorySelect.value = 'all'
  filterWords()
  search.addEventListener('input', filterWords)
  categorySelect.addEventListener('input', filterWords)
  list.addEventListener('click', e => {
    const term = e.target.closest('[data-term]')
    if (term) {
      showDef(term.dataset.term, words[term.dataset.term])
    }
  })
})
