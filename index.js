let wordData, speechPartsKey, originLangsKey

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

content.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (selected !== null) {
      results[selected].classList.remove('selected')
    } else {
      if (!results.length) return
      selected = 0
    }
    if (e.key === 'ArrowUp') {
      selected = (selected + results.length - 1) % results.length
    } else {
      selected = (selected + 1) % results.length
    }
    results[selected].classList.add('selected')
    e.preventDefault()
  } else if (e.key === 'Tab') {
    if (selected !== null) {
      content.setSelectionRange(
        content.value.lastIndexOf(' ', content.selectionStart) + 1,
        content.selectionEnd
      )
      document.execCommand('insertText', false, results[selected].dataset.term)
      search.value = ''
      filterWords()
      e.preventDefault()
    }
  }
})
document.addEventListener('selectionchange', e => {
  if (document.activeElement !== content) return
  if (content.selectionStart === content.selectionEnd) {
    const cursor = content.selectionStart
    const text = content.value
    const lastSpace = text.lastIndexOf(' ', cursor) + 1
    const typingWord = text.slice(lastSpace, cursor)
    if (typingWord !== search.value) {
      search.value = typingWord
      filterWords()
    }
    const nextSpace = text.indexOf(' ', cursor)
    const word = text.slice(lastSpace, ~nextSpace ? nextSpace : text.length)
    if (word && wordData && wordData[word]) {
      showDef(word, wordData[word])
    }
  } else if (selected !== null) {
    results[selected].classList.remove('selected')
    selected = null
  }
})

content.addEventListener('scroll', e => {
  syntaxHighlighted.scrollTop = content.scrollTop
})

function getJSON (path) {
  return fetch(path)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
}

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

let results = []
let selected = null
function filterWords () {
  if (selected !== null) {
    results[selected].classList.remove('selected')
    selected = null
  }
  results = []
  if (search.value) {
    document.body.classList.add('searching')
    const query = search.value
    for (const [term, { _elem, _definitions }] of Object.entries(wordData)) {
      if (consonantCompare(query, term) || searchDef(query, _definitions)) {
        _elem.classList.remove('hidden')
        results.push(_elem)
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
    for (const data of Object.values(wordData)) {
      if (fn(data)) {
        data._elem.classList.remove('hidden')
        results.push(data._elem)
      } else {
        data._elem.classList.add('hidden')
      }
    }
  }
}

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
  wordData = words
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
