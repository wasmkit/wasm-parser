const WASMReader = require('../wasm_reader');
// For reference: github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#import-section
const { EXTERNAL_KIND, TABLE_ELEM_TYPES } = require('../const')

class ImportSectionParser extends WASMReader {
    constructor(buffer, options = {}) {
        super(buffer);

        this.options = typeof options !== 'object' ? {} : options;
    }
    parse(options = this.options) {
        const imports = this.array(() => {
            const importDef = {
                moduleName: this.string(),
                exportName: this.string(),
                kind: EXTERNAL_KIND[this.u8()],
                fields: {},
            }

            switch (importDef.kind) {
                case "func": {
                    importDef.fields.typeIndex = this.vu32();
                    break;
                }
                case "table": {
                    const type = this.readTypeEnc();

                    if (!TABLE_ELEM_TYPES.includes(type)) this.parseError('Invalid element type `' + type + '` for table');

                    importDef.type = type;

                    const fields = {
                        flags: this.vu32(),
                        initial: this.vu32(),
                    }

                    if (fields.flags & 1) fields.maximum = this.vu32();
                    if (fields.minimum > fields.maximum) this.parseError('Resizable limit minimum MUST be less than the maximum');

                    importDef.fields = fields;
                    break;
                }
                case "memory": {
                    const fields = {
                        flags: this.vu32(),
                        initial: this.vu32()
                    }

                    if (fields.flags & 1) fields.maximum = this.vu32();
                    fields.shared = fields.flags & 2;

                    if (fields.shared && !options.sharedMemory) this.parseError('Shared memory is not supported by current options');
                    if (fields.initial > fields.maximum) this.parseError('Resizable limit minimum MUST be less than the maximum');

                    importDef.fields = fields;
                    break;
                }
                case "global": {
                    const type = this.readTypeEnc();

                    importDef.fields.type = type;
                    importDef.fields.mutable = this.vu1();

                    break;
                }
                default:
                    this.parseError('Invalid External Kind')

            }

            return importDef
        });

        return imports;
    }

}

module.exports = ImportSectionParser;