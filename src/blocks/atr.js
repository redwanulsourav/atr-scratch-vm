const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Timer = require('../util/timer');
const axios = require('axios')
class ATRBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            moveforward: this.moveforward,
            delay: this.delay,
            set_pin_mode: this.set_pin_mode,
            write_digital_pin: this.write_digital_pin,
            print_serial_monitor: this.print_serial_monitor
        };
    }
    getMonitored () {
        return {
            motion_xposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_xposition`
            },
            motion_yposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_yposition`
            },
            motion_direction: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_direction`
            }
        };
    }
    moveforward(){
        console.log('hello world')
    }

    delay(){
        console.log('delay')
    }

    set_pin_mode(){
        console.log('set_pin_mode')
    }

    write_digital_pin(){
        console.log('write_digital_pin')
    }
    constlimitPrecision (coordinate) {
        const rounded = Math.round(coordinate);
        const delta = coordinate - rounded;
        limitedCoord = (Math.abs(delta) < 1e-9) ? rounded : coordinate;

        return limitedCoord;
    }
    print_serial_monitor(args, utils){
        console.log(args.SERIAL_MESSAGE)
        axios.get('http://localhost:9090/example?str='+args.SERIAL_MESSAGE)
        .then(response => {
            console.log(response.data.url);
            console.log(response.data.explanation);
            console.log(response.data)
        })
        .catch(error => {
            console.log(error);
        });
        
    }
}

module.exports = ATRBlocks;
