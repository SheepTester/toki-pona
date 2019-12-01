let wordData, speechPartsKey, originLangsKey

let results = []
let selected = null

const content = document.getElementById('content')
const syntaxHighlighted = document.getElementById('syntax-highlighted')

// https://stackoverflow.com/a/26900132 - Not perfect but sufficient
const wordRegex = /[A-Za-zÀ-ÖØ-öø-ÿ]/
const illegalSyllableRegex = /ti|ji|wo|wu|n[nm]+|[aeiou]{2,}/ig
let typing = false, insertStart = null
function execAll (regex, str, fn) {
  regex.lastIndex = 0
  let arr
  while ((arr = regex.exec(str))) {
    fn(arr)
  }
}
function displayContent () {
  const text = content.value
  const flags = {}
  function addFlag(pos, flag, on) {
    if (!flags[pos]) flags[pos] = {}
    flags[pos][flag] = on
  }
  const cursor = content.selectionStart === content.selectionEnd
    ? content.selectionStart : null
  let newInsertStart = null
  if (cursor !== null) {
    let start = cursor
    while (start > 0 && wordRegex.test(text[start - 1])) {
      start--
    }
    let end = cursor
    while (end < text.length && wordRegex.test(text[end])) {
      end++
    }
    if (start !== end) {
      addFlag(start, 'showing-entry', true)
      addFlag(end, 'showing-entry', false)
      if (typing) {
        addFlag(start, 'searching', true)
        addFlag(cursor, 'searching', false)
        newInsertStart = start
        const typingWord = text.slice(start, cursor)
        if (typingWord !== search.value) {
          search.value = typingWord
          filterWords()
        }
        if (selected === null) {
          if (typingWord && wordData && wordData[typingWord]) {
            showDef(typingWord, wordData[typingWord])
          }
        }
      } else {
        const word = text.slice(start, end)
        if (word && wordData && wordData[word]) {
          showDef(word, wordData[word])
        }
      }
    }
  }
  if (insertStart !== newInsertStart) {
    insertStart = newInsertStart
    if (newInsertStart === null) {
      search.value = ''
      filterWords()
    }
  }
  execAll(illegalSyllableRegex, text, ({index, [0]: match}) => {
    addFlag(index, 'illegal', true)
    addFlag(index + match.length, 'illegal', false)
  })
  const state = new Set()
  let html = '<span>'
  for (let i = 0; i < text.length; i++) {
    if (flags.hasOwnProperty(i)) {
      for (const [flag, on] of Object.entries(flags[i])) {
        if (on) {
          state.add(flag)
        } else {
          state.delete(flag)
        }
      }
      html += `</span><span class="${[...state].map(flag => `syntax-${flag}`).join(' ')}">`
      if (text[i] === ' ') {
        html += '<span class="empty-line-placeholder">.</span>'
      }
    }
    switch (text[i]) {
      case '<':
        html += '&lt;'
        break
      case '>':
        html += '&gt;'
        break
      case '&':
        html += '&amp;'
        break
      default:
        html += text[i]
    }
  }
  html += '</span><span class="empty-line-placeholder">.</span>'
  syntaxHighlighted.innerHTML = html
}

content.addEventListener('input', displayContent)
displayContent()

content.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    typing = false
  } else if (e.key === 'Tab') {
    if (results.length) {
      if (selected !== null) {
        results[selected].classList.remove('selected')
        if (e.shiftKey) {
          selected = (selected + results.length - 1) % results.length
        } else {
          selected = (selected + 1) % results.length
        }
      } else {
        selected = e.shiftKey ? results.length - 1 : 0
      }
      const elem = results[selected]
      elem.classList.add('selected')
      window.requestAnimationFrame(() => {
        const outerRect = elem.parentNode.getBoundingClientRect()
        const elemRect = elem.getBoundingClientRect()
        if (outerRect.top > elemRect.top ||
          outerRect.bottom < elemRect.bottom) {
          elem.scrollIntoView()
        }
      })
      const word = results[selected].dataset.term
      if (word && wordData && wordData[word]) {
        showDef(word, wordData[word])
      }
    }
    e.preventDefault()
  } else if (e.key === 'Escape') {
    if (selected !== null) {
      results[selected].classList.remove('selected')
      selected = null
    }
    e.preventDefault()
  } else if ((e.key.length === 1 && wordRegex.test(e.key)) || e.key === 'Backspace') {
    typing = true
  } else if (e.key.length === 1 || e.key === 'Enter') {
    typing = false
    if (selected !== null) {
      content.setSelectionRange(
        insertStart !== null ? insertStart : content.selectionStart,
        content.selectionEnd
      )
      document.execCommand('insertText', false, results[selected].dataset.term)
      search.value = ''
      filterWords()
    }
  } else {
    typing = false
  }
})
document.addEventListener('selectionchange', e => {
  if (document.activeElement !== content) return
  displayContent()
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
