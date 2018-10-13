module.exports = matchTerms

function matchTerms (terms, text) {
  // \b word boundaries don’t work around emoji, e.g.
  //   > /\b🚧/i.test('🚧')
  //   < false
  // but
  //   > /(^|[^\w])🚧/i.test('🚧')
  //   < true
  //   > /(^|[^\w])🚧/i.test('foo🚧')
  //   < false
  //   > /(^|[^\w])🚧/i.test('foo 🚧')
  //   < true
  const matches = text.match(new RegExp(`(^|[^\\w])(${terms.join('|')})([^\\w]|$)`, 'i'))
  return matches ? matches[2] : null
}
