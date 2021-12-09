const BlockType = require("../../extension-support/block-type");

class ATR_Theatre{
    constructor(runtime){

        this.runtime = runtime;
    }

    getInfo(){
        return{
            id: 'atr_theatre',
            name:'ATR Theatre',
            blocks: [
                {
                    opcode: 'hello_world',
                    blockType: BlockType.COMMAND,
                    text: 'hello world'
                }
            ]
        };
    }

    hello_world(args){
        return "hello world";
    }
}

module.exports = ATR_Theatre;