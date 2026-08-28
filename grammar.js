/**
 * @file MLscript grammar for tree-sitter
 * @author David Mak <chmakac@connect.ust.hk>
 * @license MIT
 *
 * Transcribed from the reference implementation on the `hkmc2` branch of the
 * MLscript compiler:
 *
 *   hkmc2/shared/src/main/scala/hkmc2/syntax/Lexer.scala      -- tokens, indentation
 *   hkmc2/shared/src/main/scala/hkmc2/syntax/Keyword.scala    -- keyword precedences
 *   hkmc2/shared/src/main/scala/hkmc2/syntax/Parser.scala     -- operator precedences
 *   hkmc2/shared/src/main/scala/hkmc2/syntax/ParseRule.scala  -- keyword-led constructs
 *   hkmc2/shared/src/main/scala/hkmc2/syntax/Tree.scala       -- node names
 *
 * Node names follow the `Tree` enum so the grammar can be read against the
 * reference parser.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Precedences are the reference implementation's own numbers, so they can be
// checked directly against `Keyword.scala` and `Parser.scala`.
//
// `Keyword.scala` hands out 3..21 to keyword operators. `Parser.charPrecList`
// then lays character operators on top, starting at `Keyword.maxPrec` (21):
// index i of that list has precedence i + 21.
const PREC = {
  // Keyword operators (Keyword.scala).
  EXTENDS: 3, // `extends`, `restricts`, `with`
  EQ: 4, // `=`, and the right precedence of `then` / `do` / `:` / `->`
  THEN: 6, // `then`, `do`, `drop`
  WHERE: 7, // `where`, and `return` / `throw` / `yield` / `import`
  IN: 8, // `in`, `out`
  KW_PIPE: 9, // `|`
  KW_AMP: 10, // `&`
  LAM_RHS: 11, // right precedence of `=>`
  OR: 12,
  AND: 13,
  IS_RHS: 15, // right precedence of `is`
  AS: 16,
  COLON: 17,
  NOT: 19, // right precedence of `not`
  IS: 20,
  ARROW: 21, // left precedence of `->`; also Keyword.maxPrec

  // Character operators (Parser.charPrecList, offset by Keyword.maxPrec).
  OP_SEMI: 23,
  OP_AT: 24,
  OP_COLON: 25,
  OP_PIPE: 26,
  OP_AMP: 27,
  OP_EQ: 28,
  OP_CARET: 29,
  OP_BANG: 30,
  OP_CMP: 31,
  OP_ADD: 32,
  OP_MUL: 33,
  OP_TILDE: 34,

  PREFIX: 36, // Parser.PrefixOpsPrec
  APP: 37, // Parser.AppPrec
  SEL: 38, // Parser.SelPrec, and the right precedence of `new`
  HASH: 39, // Keyword.hashSelPrec, and the left precedence of `=>`
};

// `symbolicIdentifierChars` from hkmc2/package.scala, plus `.` -- together they
// are `Lexer.isOpChar`.
const SYM_CHARS = '!#%&*+\\-/:<=>?@\\\\^|~.';

/** An operator token: a first character from `first`, then any run of symbolic
 * characters. `Parser.opPrec` takes an operator's precedence from its first
 * character, which is what these tiers encode. */
function operatorToken(first) {
  return new RegExp('[' + first + '][' + SYM_CHARS + ']*');
}

// Character-operator tiers, keyed on the first character. Note that `=`, `:`,
// `|`, `&`, `#`, `->`, `=>`, `..` and `...` are *keywords* rather than
// operators (they are registered in `Keyword.all`, so `Parser.OP` rejects
// them); they are written as string literals below, which tree-sitter prefers
// over an equal-length pattern match.
const OPERATOR_TIERS = [
  ['operator_semi', PREC.OP_SEMI, ';'],
  ['operator_at', PREC.OP_AT, '@'],
  ['operator_colon', PREC.OP_COLON, ':'],
  ['operator_pipe', PREC.OP_PIPE, '|'],
  ['operator_amp', PREC.OP_AMP, '&'],
  ['operator_eq', PREC.OP_EQ, '='],
  ['operator_caret', PREC.OP_CARET, '\\^'],
  ['operator_bang', PREC.OP_BANG, '!'],
  ['operator_cmp', PREC.OP_CMP, '<>'],
  ['operator_add', PREC.OP_ADD, '+\\-'],
  ['operator_mul', PREC.OP_MUL, '*/%'],
  ['operator_tilde', PREC.OP_TILDE, '~'],
  ['operator_dot', PREC.SEL, '.\\\\'],
  // `?` is absent from `charPrecList`, so `Parser.precOf` falls back to
  // `Int.MaxValue` for it: tighter than every listed operator.
  ['operator_other', PREC.HASH, '?'],
];

// Keyword infix operators, from `ParseRules.infixRules` with the precedences
// declared in `Keyword.scala`. A keyword whose right precedence is at least its
// left precedence associates to the left, because the reference parser's
// precedence climbing test is strict (`leftPrec > minPrec`).
const INFIX_KEYWORDS = [
  ['extends', PREC.EXTENDS, PREC.EXTENDS],
  ['restricts', PREC.EXTENDS, PREC.EXTENDS],
  ['with', PREC.EXTENDS, PREC.EXTENDS],
  ['then', PREC.THEN, PREC.EQ],
  ['where', PREC.WHERE, PREC.WHERE],
  ['|', PREC.KW_PIPE, PREC.KW_PIPE],
  ['&', PREC.KW_AMP, PREC.KW_AMP],
  ['or', PREC.OR, PREC.OR],
  ['and', PREC.AND, PREC.AND + 1],
  ['as', PREC.AS, PREC.AS],
  [':', PREC.COLON, PREC.EQ],
  ['is', PREC.IS, PREC.IS_RHS],
];

/** Modifiers accepted before a declaration (`Keyword.modifiers`, plus the
 * variance and staging markers that `ParseRules` treats the same way). */
const MODIFIERS = [
  'abstract',
  'data',
  'declare',
  'mut',
  'out',
  'override',
  'private',
  'public',
  'staged',
  'virtual',
];

export default grammar({
  name: 'mlscript',

  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
    $.difftest_directive,
    $._select_dot,
    $._error_sentinel,
  ],

  extras: $ => [
    /[ \t\r]/,
    $.comment,
    $.difftest_output,
    $.difftest_directive,
  ],

  word: $ => $.identifier,

  supertypes: $ => [$._expression, $._statement, $._literal],

  rules: {
    source_file: $ => repeat(choice($._statement, $._separator)),

    _separator: $ => choice($._newline, ','),

    // ------------------------------------------------------------------
    // Statements
    // ------------------------------------------------------------------

    _statement: $ => choice(
      $.fun_definition,
      $.val_definition,
      $.let_binding,
      $.set_binding,
      $.class_definition,
      $.trait_definition,
      $.module_definition,
      $.object_definition,
      $.mixin_definition,
      $.type_definition,
      $.pattern_definition,
      $.import_statement,
      $.open_statement,
      $.definition,
      $.split_branch,
      $._expression,
    ),

    modifier: $ => choice(...MODIFIERS),

    // `Tree.OpSplit`. Inside an indented block a branch may start with the
    // operator itself, sharing the left operand with its siblings:
    //
    //     if c
    //       === "(" then 0
    //       === "=" then 1
    //
    // The reference re-roots each branch on the shared left-hand side; here the
    // branches are left as siblings, so the operand grouping inside a branch is
    // flatter than the reference's tree.
    split_branch: $ => prec.right(seq(
      field('operator', choice(
        ...INFIX_KEYWORDS.map(([op]) => op),
        ...OPERATOR_TIERS.map(([, , first]) => alias(operatorToken(first), $.operator)),
      )),
      field('right', $._body),
    )),

    // `Tree.Def`: a bare `lhs = rhs`, which the reference builds in
    // `Parser.blockOfImpl` at block level only -- `=` is not a general infix
    // operator. Named arguments such as `f(x = 1)` are the same construct,
    // because bracketed sections are parsed as blocks.
    definition: $ => prec.right(PREC.EQ, seq(
      field('left', $._expression),
      '=',
      field('right', $._body),
    )),

    // `Tree.TermDef`
    fun_definition: $ => seq(
      repeat($.modifier),
      'fun',
      field('head', $._definition_head),
      optional(seq('=', field('body', $._body))),
    ),

    val_definition: $ => seq(
      repeat($.modifier),
      choice('val', 'using'),
      field('head', $._definition_head),
      optional(seq('=', field('body', $._body))),
    ),

    // `Tree.LetLike`
    let_binding: $ => seq(
      'let',
      field('head', $._definition_head),
      optional(seq('=', field('body', $._body))),
      optional(seq('in', field('in', $._body))),
    ),

    set_binding: $ => seq(
      'set',
      field('head', $._definition_head),
      optional(seq('=', field('body', $._body))),
      optional(seq('in', field('in', $._body))),
    ),

    // `Tree.TypeDef`. The reference's `typeDeclBody` parses a single expression
    // for the whole head, so inherited clauses (`extends`, `with`) and the body
    // arrive as infix applications or as a juxtaposed indented block.
    class_definition: $ => seq(repeat($.modifier), 'class', field('head', $._definition_head)),
    trait_definition: $ => seq(repeat($.modifier), 'trait', field('head', $._definition_head)),
    module_definition: $ => seq(repeat($.modifier), 'module', field('head', $._definition_head)),
    object_definition: $ => seq(repeat($.modifier), 'object', field('head', $._definition_head)),
    mixin_definition: $ => seq(repeat($.modifier), 'mixin', field('head', $._definition_head)),

    // `typeAliasLike`
    type_definition: $ => seq(
      repeat($.modifier),
      'type',
      field('head', $._definition_head),
      optional(seq('=', field('body', $._body))),
    ),

    pattern_definition: $ => seq(
      repeat($.modifier),
      'pattern',
      field('head', $._definition_head),
      optional(seq('=', field('body', $._body))),
    ),

    // A declaration head is an ordinary expression; it is kept as its own rule
    // so the `=` that follows is never mistaken for the `definition` operator.
    _definition_head: $ => choice(
      $._expression,
      $.block,
    ),

    // `Tree.Open` / the `import` prefix rule.
    import_statement: $ => prec.right(PREC.WHERE, seq('import', field('path', $._body))),
    open_statement: $ => prec.right(PREC.IS, seq('open', field('module', $._body))),

    // ------------------------------------------------------------------
    // Expressions
    // ------------------------------------------------------------------

    _expression: $ => choice(
      $.identifier,
      $._literal,
      $.wildcard,
      $.this_expression,
      $.super_expression,
      $.suspension,
      $.parenthesized_expression,
      $.tuple,
      $.record,
      $.type_arguments,
      $.application,
      $.of_application,
      $.juxtaposition,
      $.juxtaposed_block,
      $.refinement,
      $.selection,
      $.if_expression,
      $.while_expression,
      $.case_expression,
      $.new_expression,
      $.lambda,
      $.function_type,
      $.infix_application,
      $.prefix_application,
      $.unary_expression,
      $.modified_expression,
      $.constructor_definition,
      $.directive,
    ),

    // The right-hand side of a binding or a keyword operator is either an
    // expression or an indented block (`ParseRules.exprOrBlk`).
    _body: $ => choice($._expression, $.block),

    block: $ => seq(
      $._indent,
      repeat(choice($._statement, $._separator)),
      $._dedent,
    ),

    // `Tree.Bra(Round, _)` and `Tree.Unt`. Bracketed sections are parsed as
    // blocks, which is what allows `f(x = 1)` and multi-line argument lists.
    parenthesized_expression: $ => seq('(', optional($._bracket_body), ')'),

    // `Tree.Tup`
    tuple: $ => seq('[', optional($._bracket_body), ']'),

    // `Tree.Bra(Curly, _)`
    record: $ => seq('{', optional($._bracket_body), '}'),

    _block_items: $ => repeat1(choice($._statement, $._separator, $.block)),

    _bracket_body: $ => choice($.operator_identifier, $._block_items),

    // An operator used as a name, as in `fun (+) plus(a, b)`.
    operator_identifier: $ => choice(
      ...OPERATOR_TIERS.map(([, , first]) => operatorToken(first)),
      '|', '&', ':', '=', '->', '=>', '#',
    ),

    // A `[...]` section directly after an expression: type arguments or a
    // subscript. Kept distinct from `tuple` so highlighting can tell them apart.
    type_arguments: $ => prec.left(PREC.APP, seq(
      field('function', $._expression),
      token.immediate('['),
      optional($._bracket_body),
      ']',
    )),

    // `Tree.App`
    application: $ => prec.left(PREC.APP, seq(
      field('function', $._expression),
      field('arguments', $.arguments),
    )),

    arguments: $ => seq('(', optional($._bracket_body), ')'),

    // `f of a, b` -- `Keyword.of` is applied at `Parser.AppPrec`.
    of_application: $ => prec.left(PREC.APP, seq(
      field('function', $._expression),
      'of',
      field('arguments', $._body),
    )),

    // `Tree.Jux`: `f x`. The reference only juxtaposes when the right operand
    // starts with a plain (non-keyword) identifier.
    juxtaposition: $ => prec.left(PREC.APP, seq(
      field('function', $._expression),
      field('argument', $._jux_operand),
    )),

    // Restricted to a bare identifier: the reference only starts a
    // juxtaposition when the next token is a non-keyword alphanumeric
    // identifier, and any trailing selection or application then binds tighter
    // than the juxtaposition itself, so `f x.y` is `Jux(f, Sel(x, y))`.
    _jux_operand: $ => $.identifier,

    // `Tree.Jux` with an indented block, as in a class body written without
    // `with`.
    juxtaposed_block: $ => prec.left(PREC.APP, seq(
      field('function', $._expression),
      field('body', $.block),
    )),

    // `Tree.Reft`: `Foo { ... }`
    refinement: $ => prec.left(PREC.APP, seq(
      field('base', $._expression),
      field('body', $.record),
    )),

    // `Tree.Sel` / `Tree.DynAccess`. The reference lexes `.name` and `!name` as
    // a single SELECT token, so no space is allowed on either side of the dot.
    selection: $ => prec.left(PREC.SEL, seq(
      field('object', $._expression),
      $._select_dot,
      field('field', alias($._immediate_name, $.identifier)),
    )),

    _immediate_name: $ => token.immediate(/[\p{L}_'][\p{L}\p{Nd}_']*|[0-9]+/u),

    // `Tree.IfLike`
    if_expression: $ => prec.right(seq(
      'if',
      field('condition', $._body),
      optional(seq('else', field('alternative', $._body))),
    )),

    while_expression: $ => prec.right(seq(
      'while',
      field('condition', $._body),
      optional(seq('else', field('alternative', $._body))),
    )),

    // `Tree.Case`
    case_expression: $ => prec.right(seq('case', field('branches', $._body))),

    // `Tree.LexicalNew`. `new` binds at `SelPrec`, so `new C(1)` is
    // `(new C)(1)` and `new A.B` is `new (A.B)`.
    new_expression: $ => prec.right(PREC.SEL, seq(
      choice('new', 'new!'),
      optional(field('constructor', $._expression)),
    )),

    // `x => e`. The reference gives `=>` a very tight left precedence and a very
    // loose right one; tree-sitter cannot express that asymmetry, so this is a
    // right-associative operator at the `=>` right precedence, which agrees with
    // the reference on everything except pathological mixtures such as
    // `a + x => b`.
    lambda: $ => prec.right(PREC.LAM_RHS, seq(
      field('parameters', $._expression),
      '=>',
      field('body', $._body),
    )),

    // `A -> B`
    function_type: $ => prec.right(PREC.EQ, seq(
      field('parameter', $._expression),
      '->',
      field('result', $._body),
    )),

    // `Tree.InfixApp`
    infix_application: $ => choice(
      ...INFIX_KEYWORDS.map(([op, left, right]) =>
        (right >= left ? prec.left : prec.right)(left, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._body),
        ))),
      // A line may end on a dangling operator and continue on the next one.
      // `Parser.maybeIndented` accepts this even when the continuation is not
      // indented (it only warns), so the newline is optional here.
      ...OPERATOR_TIERS.map(([name, prec_, first]) =>
        prec.left(prec_, seq(
          field('left', $._expression),
          field('operator', alias(operatorToken(first), $.operator)),
          optional($._newline),
          field('right', $._body),
        ))),
      prec.left(PREC.HASH, seq(
        field('left', $._expression),
        field('operator', '#'),
        field('right', $._expression),
      )),
    ),

    // `Tree.PrefixApp` for the keyword prefixes of `Keyword.Prefix`.
    prefix_application: $ => choice(
      prec.right(PREC.NOT, seq(field('operator', 'not'), field('operand', $._body))),
      prec.right(PREC.EQ, seq(field('operator', choice('do', 'else', 'drop')), field('operand', $._body))),
      prec.right(PREC.WHERE, seq(
        field('operator', choice('return', 'throw', 'yield', 'yield*')),
        field('operand', $._body),
      )),
      prec.right(PREC.WHERE, 'return'),
    ),

    // Prefix character operators (`Parser.prefixOps`). Each takes its
    // precedence from `opCharPrec` of its first character, except `!`, which
    // the reference pins at `PrefixOpsPrec`.
    unary_expression: $ => choice(
      prec.right(PREC.PREFIX, seq(field('operator', alias(operatorToken('!'), $.operator)), field('operand', $._expression))),
      prec.right(PREC.OP_ADD, seq(field('operator', alias(operatorToken('+\\-'), $.operator)), field('operand', $._expression))),
      prec.right(PREC.OP_TILDE, seq(field('operator', alias(operatorToken('~'), $.operator)), field('operand', $._expression))),
      prec.right(PREC.OP_AT, seq(field('operator', alias(operatorToken('@'), $.operator)), field('operand', $._expression))),
      prec.right(PREC.KW_PIPE, seq(field('operator', '|'), field('operand', $._expression))),
      prec.right(PREC.KW_AMP, seq(field('operator', '&'), field('operand', $._expression))),
    ),

    // `Tree.Modified`: `mut x`, `out T`, and the other modifier keywords used
    // in expression position rather than in front of a declaration.
    // The body may be an indented block, in which case the reference re-applies
    // the modifier to every line of it (`Parser.parseRuleImpl`), as in
    // `data` / `class` / declarations written across three levels.
    modified_expression: $ => prec.right(PREC.SEL, seq(
      field('modifier', $.modifier),
      field('body', $._body),
    )),

    // `Tree.Constructor`
    constructor_definition: $ => prec.right(seq('constructor', optional(field('body', $._body)))),

    // `#config(...)` and friends -- `Tree.Directive`.
    directive: $ => prec.right(PREC.HASH, seq('#', field('name', $._expression))),

    // ------------------------------------------------------------------
    // Terminals
    // ------------------------------------------------------------------

    this_expression: $ => 'this',
    super_expression: $ => 'super',
    wildcard: $ => '_',

    // `Tree.Spread` / the SUSPENSION token. The operand is optional so that a
    // bare `...` body, as in `module M with ...`, still parses.
    suspension: $ => prec.right(seq(choice('...', '..'), optional($._expression))),

    // `Lexer.isIdentFirstChar` / `isIdentChar`, plus the Scala-style symbolic
    // suffix that `Lexer.takeIdent` allows after a trailing `_`.
    identifier: $ => token(choice(
      // `Lexer.takeIdent` only picks up a symbolic suffix when the alphanumeric
      // part ends in `_`, so `foo_<:<` is one identifier but `head: A` is an
      // identifier followed by the `:` keyword.
      seq(/[\p{L}_'][\p{L}\p{Nd}_']*_/u, new RegExp('[' + SYM_CHARS + ']+')),
      /[\p{L}_'][\p{L}\p{Nd}_']*/u,
    )),

    _literal: $ => choice(
      $.integer_literal,
      $.decimal_literal,
      $.string_literal,
      $.boolean_literal,
      $.unit_literal,
    ),

    // `Lexer.num`: `_` is allowed as a digit separator throughout.
    integer_literal: $ => token(choice(
      /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,
      /0[oO][0-7][0-7_]*/,
      /0[bB][01][01_]*/,
      /[0-9][0-9_]*/,
    )),

    decimal_literal: $ => token(choice(
      /[0-9][0-9_]*\.[0-9][0-9_]*([eE][+\-]?[0-9][0-9_]*)?/,
      /[0-9][0-9_]*[eE][+\-]?[0-9][0-9_]*/,
    )),

    boolean_literal: $ => choice('true', 'false'),
    unit_literal: $ => choice('null', 'undefined'),

    string_literal: $ => choice(
      seq('"""', repeat(choice($.escape_sequence, /[^"\\]/, /"[^"]/, /""[^"]/)), '"""'),
      seq('"', repeat(choice($.escape_sequence, /[^"\\\n]/)), '"'),
    ),

    escape_sequence: $ => token.immediate(seq('\\', choice(
      /u[0-9a-fA-F]{4}/,
      /u\{[0-9a-fA-F]{1,6}\}/,
      /x[0-9a-fA-F]{2}/,
      /./,
    ))),

    // `//`, and the `/* */` form the reference lexer treats as non-nesting.
    comment: $ => token(prec(1, choice(
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    ))),

    // Diff-test scaffolding. These lines are consumed by the test harness
    // (`hkmc2DiffTests/.../DiffMaker.scala`) before the source reaches the
    // lexer, so they are not MLscript syntax -- but they make up most of the
    // `.mls` files in the compiler repository, and the VS Code extension
    // highlights them, so they are recognised here as trivia.
    difftest_output: $ => token(prec(2, seq('//\u2502', /[^\n]*/))),
  },
});
