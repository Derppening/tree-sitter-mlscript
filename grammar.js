/**
 * @file Mlscript grammar for tree-sitter
 * @author David Mak <chmakac@connect.ust.hk>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "mlscript",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
