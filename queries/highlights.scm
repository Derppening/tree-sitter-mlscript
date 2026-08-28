; Highlighting for MLscript.
;
; Scope choices follow the VS Code extension's TextMate grammar
; (mlscript-vscode-extension/syntaxes/mlscript.tmLanguage.yaml) so that both
; produce comparable colouring.

; ---------------------------------------------------------------- comments

(comment) @comment
(difftest_output) @comment.documentation
(difftest_directive) @comment.special

; ---------------------------------------------------------------- literals

(integer_literal) @number
(decimal_literal) @number
(string_literal) @string
(escape_sequence) @string.escape
(boolean_literal) @constant.builtin
(unit_literal) @constant.builtin

(this_expression) @variable.builtin
(super_expression) @variable.builtin
(wildcard) @variable.builtin

; ---------------------------------------------------------------- keywords

[
  "class"
  "trait"
  "module"
  "object"
  "mixin"
  "pattern"
  "type"
  "constructor"
  "new"
  "new!"
] @keyword.type

[
  "fun"
  "val"
  "using"
  "let"
  "set"
] @keyword.function

[
  "if"
  "while"
  "then"
  "else"
  "case"
  "do"
  "drop"
] @keyword.conditional

[
  "return"
  "throw"
  "yield"
  "yield*"
] @keyword.return

[
  "import"
  "open"
] @keyword.import

[
  "and"
  "or"
  "not"
  "is"
  "as"
  "of"
  "in"
  "extends"
  "restricts"
  "with"
  "where"
] @keyword.operator

(modifier) @keyword.modifier

; ---------------------------------------------------------------- operators

(operator) @operator
(operator_identifier) @operator

[
  "="
  "=>"
  "->"
  "|"
  "&"
  ":"
  "#"
  "..."
  ".."
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

"," @punctuation.delimiter

; ---------------------------------------------------------------- declarations

; A declaration head is an expression, so the name may sit under an
; application (`f(x)`), a type-argument list (`F[A]`) or a juxtaposition.

(fun_definition head: (identifier) @function)
(fun_definition head: (application function: (identifier) @function))
(fun_definition
  head: (application function: (type_arguments function: (identifier) @function)))
(fun_definition head: (type_arguments function: (identifier) @function))
(fun_definition head: (juxtaposition argument: (identifier) @function))

(val_definition head: (identifier) @variable)
(val_definition head: (application function: (identifier) @function))

(let_binding head: (identifier) @variable)
(set_binding head: (identifier) @variable)

(class_definition head: (identifier) @type)
(class_definition head: (application function: (identifier) @type))
(class_definition
  head: (application function: (type_arguments function: (identifier) @type)))
(class_definition head: (type_arguments function: (identifier) @type))
(class_definition head: (juxtaposition argument: (identifier) @type))

(trait_definition head: (identifier) @type)
(trait_definition head: (application function: (identifier) @type))
(trait_definition head: (type_arguments function: (identifier) @type))

(module_definition head: (identifier) @type)
(module_definition head: (application function: (identifier) @type))
(module_definition head: (type_arguments function: (identifier) @type))
(module_definition head: (infix_application left: (identifier) @type))

(object_definition head: (identifier) @type)
(mixin_definition head: (identifier) @type)

(type_definition head: (identifier) @type)
(type_definition head: (type_arguments function: (identifier) @type))

(pattern_definition head: (identifier) @type)
(pattern_definition head: (type_arguments function: (identifier) @type))

(open_statement module: (identifier) @module)
(import_statement path: (string_literal) @string.special.path)

; ---------------------------------------------------------------- uses

(application function: (identifier) @function.call)
(application function: (selection field: (identifier) @function.call))
(of_application function: (identifier) @function.call)

(selection field: (identifier) @variable.member)

(directive name: (identifier) @function.macro)
(directive name: (application function: (identifier) @function.macro))

; Capitalised identifiers name types and constructors, as in the reference
; implementation's own conventions.
((identifier) @type
  (#match? @type "^_*[A-Z]"))

(identifier) @variable
