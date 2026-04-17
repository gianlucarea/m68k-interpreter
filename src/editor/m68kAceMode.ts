import ace from 'ace-builds/src-noconflict/ace';

const M68K_MNEMONICS = [
  'add',
  'adda',
  'addi',
  'addq',
  'addx',
  'and',
  'andi',
  'asl',
  'asr',
  'bcc',
  'bcs',
  'beq',
  'bge',
  'bgt',
  'bhi',
  'ble',
  'bls',
  'blt',
  'bmi',
  'bne',
  'bpl',
  'bra',
  'bsr',
  'bset',
  'btst',
  'bclr',
  'bchg',
  'bvc',
  'bvs',
  'chk',
  'clr',
  'cmp',
  'cmpa',
  'cmpi',
  'cmpm',
  'dbcc',
  'dbcs',
  'dbeq',
  'dbf',
  'dbge',
  'dbgt',
  'dbhi',
  'dble',
  'dbls',
  'dblt',
  'dbmi',
  'dbne',
  'dbpl',
  'dbra',
  'dbt',
  'dbvc',
  'dbvs',
  'divs',
  'divu',
  'eor',
  'eori',
  'exg',
  'ext',
  'illegal',
  'jmp',
  'jsr',
  'lea',
  'link',
  'lsl',
  'lsr',
  'move',
  'movea',
  'movem',
  'movep',
  'moveq',
  'muls',
  'mulu',
  'nbcd',
  'neg',
  'negx',
  'nop',
  'not',
  'or',
  'ori',
  'pea',
  'reset',
  'rol',
  'ror',
  'roxl',
  'roxr',
  'rte',
  'rtr',
  'rts',
  'rtd',
  'sbcd',
  'scc',
  'scs',
  'seq',
  'sf',
  'sge',
  'sgt',
  'shi',
  'sle',
  'sls',
  'slt',
  'smi',
  'sne',
  'spl',
  'st',
  'stop',
  'sub',
  'suba',
  'subi',
  'subq',
  'subx',
  'svc',
  'svs',
  'swap',
  'tas',
  'trap',
  'trapv',
  'tst',
  'unlk',
];

const M68K_DIRECTIVES = ['org', 'end', 'dc', 'ds', 'dcb', 'equ'];

let registered = false;

type AceDefineFactory = (
  require: (name: string) => unknown,
  exports: Record<string, unknown>,
  module: unknown,
) => void;

interface AceOop {
  inherits: (child: unknown, parent: unknown) => void;
}

interface AceTextHighlightRulesModule {
  TextHighlightRules: unknown;
}

interface AceTextModeModule {
  Mode: unknown;
}

interface AceM68kHighlightRulesModule {
  M68KHighlightRules: unknown;
}

export const registerM68kMode = (): void => {
  if (registered) {
    return;
  }

  const aceRuntime = ace as unknown as {
    define: (name: string, deps: string[], factory: AceDefineFactory) => void;
  };

  aceRuntime.define(
    'ace/mode/m68k_highlight_rules',
    ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text_highlight_rules'],
    (require, exports) => {
      const oop = require('ace/lib/oop') as AceOop;
      const TextHighlightRules = (require(
        'ace/mode/text_highlight_rules',
      ) as AceTextHighlightRulesModule).TextHighlightRules;

      const mnemonics = `(?:${M68K_MNEMONICS.join('|')})`;
      const directives = `(?:${M68K_DIRECTIVES.join('|')})`;

      const M68KHighlightRules = function (this: { $rules: unknown; normalizeRules: () => void }) {
        this.$rules = {
          start: [
            {
              token: 'comment.line.asterisk',
              regex: '^\\s*\\*.*$'
            },
            {
              token: 'comment.line.semicolon',
              regex: ';.*$'
            },
            {
              token: 'entity.name.function.label',
              regex: '^\\s*[A-Za-z_][A-Za-z0-9_]*\\s*:'
            },
            {
              token: 'keyword.control.directive',
              regex: `\\b${directives}(?:\\.[bwl])?\\b`,
              caseInsensitive: true
            },
            {
              token: 'support.function.instruction',
              regex: `\\b${mnemonics}(?:\\.[bwl])?\\b`,
              caseInsensitive: true
            },
            {
              token: 'variable.language.register',
              regex: '\\b(?:[dDaA][0-7]|[aA][sS]|[uU][sS][pP]|[sS][sS][pP]|[cC][cC][rR]|[sS][rR]|[pP][cC])\\b'
            },
            {
              token: 'constant.numeric.hex',
              regex: '\\$[0-9A-Fa-f]+'
            },
            {
              token: 'constant.numeric.binary',
              regex: '%[01]+'
            },
            {
              token: 'constant.numeric.decimal',
              regex: '\\b\\d+\\b'
            },
            {
              token: 'string.quoted.single',
              regex: "'(?:[^'\\\\]|\\\\.)'"
            },
            {
              token: 'punctuation.operator',
              regex: '[#(),.+:-]'
            },
          ]
        };

        this.normalizeRules();
      };

      oop.inherits(M68KHighlightRules, TextHighlightRules);
      exports.M68KHighlightRules = M68KHighlightRules;
    },
  );

  aceRuntime.define(
    'ace/mode/m68k',
    ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/m68k_highlight_rules'],
    (require, exports) => {
      const oop = require('ace/lib/oop') as AceOop;
      const TextMode = (require('ace/mode/text') as AceTextModeModule).Mode;
      const M68KHighlightRules = (require(
        'ace/mode/m68k_highlight_rules',
      ) as AceM68kHighlightRulesModule).M68KHighlightRules;

      const Mode = function (this: { HighlightRules?: unknown }) {
        this.HighlightRules = M68KHighlightRules;
      };

      oop.inherits(Mode, TextMode);

      (Mode as { prototype: { $id: string } }).prototype.$id = 'ace/mode/m68k';
      exports.Mode = Mode;
    },
  );

  registered = true;
};
