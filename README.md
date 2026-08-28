# tree-sitter-mlscript

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for
[MLscript](https://github.com/hkust-taco/mlscript).

The grammar is transcribed from the reference implementation on the `hkmc2`
branch of the MLscript compiler:

| Reference source | What it contributes |
| --- | --- |
| `hkmc2/shared/src/main/scala/hkmc2/syntax/Lexer.scala` | tokens, indentation, comments |
| `hkmc2/shared/src/main/scala/hkmc2/syntax/Keyword.scala` | keyword operators and their precedences |
| `hkmc2/shared/src/main/scala/hkmc2/syntax/Parser.scala` | character-operator precedences, application and juxtaposition |
| `hkmc2/shared/src/main/scala/hkmc2/syntax/ParseRule.scala` | keyword-led constructs |
| `hkmc2/shared/src/main/scala/hkmc2/syntax/Tree.scala` | node names |

Node names follow the `Tree` enum, and precedence constants keep the reference's
own numbering, so `grammar.js` can be read side by side with the compiler.

## Layout

```
grammar.js              the grammar
src/scanner.c           external scanner: indentation, selection lookahead
queries/highlights.scm  syntax highlighting
test/corpus/            tree-sitter test cases
script/parse-corpus.sh  parse a directory of .mls files and report failures
```

## Indentation

MLscript is indentation sensitive, so `src/scanner.c` supplies `_indent`,
`_dedent` and `_newline`, reproducing the `case '\n'` branch of `Lexer.lex`: a
run of blank lines and spaces is consumed as a whole, every stack entry deeper
than the new column is popped before the trailing newline is emitted, and a line
indented past what remains re-opens a level.

The scanner also decides where a selection starts. The reference lexes `.name`
as a single `SELECT` token, so a `.` only begins a selection when the very next
character starts an identifier or a number — which is why `args.[idx]` and
`NoFreeze."foo"()` treat `.` as an ordinary operator instead. That needs one
character of lookahead, which a tree-sitter token cannot express.

## Coverage

This is the MVP: the subset the
[VS Code extension](https://github.com/Derppening/mlscript-vscode-extension)
highlights — declarations, bindings, control flow, literals, operators, field
selection, type-argument lists, comments, and the diff-test scaffolding
(`:flags` and `//│` output lines) that fills the compiler's test files.

Measured with `script/parse-corpus.sh`:

| Corpus | Files | Parse without errors |
| --- | --- | --- |
| `mlscript-compile/**` (real source) | 101 | 96 (95.0%) |
| `shared/src/test/mlscript/**` (diff tests, unmodified) | 731 | 665 (91.0%) |

Of the 66 diff-test files that fail, 41 contain expected-parse-error markers —
they are the compiler's own tests for invalid syntax.

### Not yet supported

* Quasiquotes and unquoting — `` `1 ``, ``code"..."``, `${...}` (4 of the 5
  remaining primary-corpus failures)
* A bare symbolic operator used as a value outside brackets, as in
  `new mut ::(x, ys)` or `= ???`; `(::)` and `(+)` inside brackets do work
* Puns — `f(:x)`, `f(=x)`
* `handle` / `region` / `try`…`finally`, annotations (`@`), escaped identifiers
  (`id"..."`), and angle-bracket sections

### Known approximations

* Character-operator precedence is taken from the operator's first character, as
  `Parser.opPrec` does, but every tier is left-associative; the reference derives
  associativity from the *last* character too, so `a <= b <= c` groups
  differently there.
* `=>` has a very tight left precedence and a very loose right one in the
  reference. Tree-sitter cannot express that asymmetry, so lambdas are plain
  right-associative operators; this differs only on mixtures like `a + x => b`.
* Operator splits keep their branches as siblings rather than re-rooting each on
  the shared left operand.

## Development

```sh
npm install
npx tree-sitter generate
npx tree-sitter test
./script/parse-corpus.sh path/to/mlscript/**/*.mls
```
