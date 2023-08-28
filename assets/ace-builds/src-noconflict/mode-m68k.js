ace.define("ace/mode/m68k_highlight_rules", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"], function (require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var M68kHighlightRules = function () {

        this.$rules = {
            start:
                [{
                    token: 'keyword.control.m68k',
                    regex: '\\b(?:add|addi|adda|sub|subi|suba|mulu|muls|divu|divs|not|and|andi|or|ori|eor|eori|move|movea|exg|clr|swap|neg|ext|lsl|lsr|asl|asr|rol|ror|cmp|cmpa|cmpi|tst|jmp|bra|jsr|rts|bsr|beq|bne|bge|bgt|ble|blt)\\b',
                    caseInsensitive: true
                },
                {
                    token: 'variable.parameter.register.m68k',
                    regex: '\\b(?:A0|A1|A2|A3|A4|A5|A6|A7|D0|D1|D2|D3|D4|D5|D6|D7)\\b',
                    caseInsensitive: true
                },
                {
                    token: 'constant.numeric.decimal.m68k',
                    regex: '#[0-9]+'
                },
                {
                    token: 'constant.numeric.decimal.m68k',
                    regex: '[0-9]+'
                },
                {
                    token: 'constant.numeric.hexadecimal.m68k',
                    regex: '\\#\\$[A-F0-9]+',
                    caseInsensitive: true
                },
                {
                    token: 'constant.numeric.hexadecimal.m68k',
                    regex: '\\$[A-F0-9]+',
                    caseInsensitive: true
                },
                {
                    token: 'constant.numeric.hexadecimal.m68k',
                    regex: '\\#0x[A-F0-9]+',
                    caseInsensitive: true
                },
                {
                    token: 'constant.numeric.hexadecimal.m68k',
                    regex: '0x[A-F0-9]+',
                    caseInsensitive: true
                },
                {
                    token: 'constant.numeric.binary.m68k',
                    regex: '\\#%[0-1]+',
                    caseInsensitive: true
                },
                {
                    token: 'support.type.m68k',
                    regex: '\\.[bwl]',
                    caseInsensitive: true
                },
                { token: 'string.m68k', regex: /"([^\\"]|\\.)*"/ },
                {
                    token: 'support.function.directive.m68k',
                    regex: '(?:ORG|END|DC|EQU)',
                    caseInsensitive: true
                },
                { token: 'entity.name.function.label.m68k', regex: '^[a-zA-Z_]+[a-zA-z0-9]*\:' },
                //{ token: 'entity.name.function.label.m68k', regex: '\\s[a-zA-Z_]+[a-zA-z0-9]*' },
                { token: 'comment.m68k', regex: '\\*.*' },
                { token: 'comment.m68k', regex: '\\;.*' }
            ]
        };

        this.normalizeRules();
    };

    M68kHighlightRules.metaData = {
        fileTypes: ['asm'],
        name: 'M68K',
        scopeName: 'source.m68k'
    };


    oop.inherits(M68kHighlightRules, TextHighlightRules);

    exports.M68kHighlightRules = M68kHighlightRules;
});


ace.define("ace/mode/m68k", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/m68k_highlight_rules"], function (require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var M68kHighlightRules = require("./m68k_highlight_rules").M68kHighlightRules;

    var Mode = function () {
        this.HighlightRules = M68kHighlightRules;
        this.$behaviour = this.$defaultBehaviour;
    };
    oop.inherits(Mode, TextMode);

    (function () {
        this.lineCommentStart = [";"];
        this.$id = "ace/mode/m68k";
    }).call(Mode.prototype);

    exports.Mode = Mode;
});

(function () {
    ace.require(["ace/mode/m68k"], function (m) {
        if (typeof module == "object" && typeof exports == "object" && module) {
            module.exports = m;
        }
    });
})();
