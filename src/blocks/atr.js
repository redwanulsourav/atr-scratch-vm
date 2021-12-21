const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Timer = require('../util/timer');
const axios = require('axios')

const Clone = require('../util/clone');
const RenderedTarget = require('../sprites/rendered-target');
const uid = require('../util/uid');
const StageLayering = require('../engine/stage-layering');
const getMonitorIdForBlockWithArgs = require('../util/get-monitor-id');

class ATRBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
         this.runtime = runtime;

         this._onTargetChanged = this._onTargetChanged.bind(this);
         this._onResetBubbles = this._onResetBubbles.bind(this);
         this._onTargetWillExit = this._onTargetWillExit.bind(this);
         this._updateBubble = this._updateBubble.bind(this);
 
         // Reset all bubbles on start/stop
         this.runtime.on('PROJECT_STOP_ALL', this._onResetBubbles);
         this.runtime.on('targetWasRemoved', this._onTargetWillExit);
 
         // Enable other blocks to use bubbles like ask/answer
         this.runtime.on("SAY", this._updateBubble)
    }
    
    
    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            //moveforward: this.moveforward,
            // delay: this.delay,
            // set_pin_mode: this.set_pin_mode,
            // write_digital_pin: this.write_digital_pin,
            // print_serial_monitor: this.print_serial_monitor,
            // read_orientation_wearable: this.read_orientation_wearable,
            // read_heart_beat_wearable: this.read_heart_beat_wearable,
            // activate_haptic_motor_wearable: this.activate_haptic_motor_wearable,
            say: this.say,
            move_gear_motor: this.move_gear_motor,
            read_heart_beat_wearable: this.read_heart_beat_wearable,
            read_orientation_wearable: this.read_orientation_wearable,
            sayforsecs: this.sayforsecs
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
    

 
    _getBubbleState (target) {
      let bubbleState = target.getCustomState('Scratch.looks');
      if (!bubbleState) {
          bubbleState = Clone.simple({
            drawableId: null,
            onSpriteRight: true,
            skinId: null,
            text: '',
            type: 'say',
            usageId: null
        });
          target.setCustomState('Scratch.looks', bubbleState);
      }
      return bubbleState;
  }
  _onTargetChanged (target) {
    const bubbleState = this._getBubbleState(target);
    if (bubbleState.drawableId) {
        this._positionBubble(target);
    }
  }
  _onTargetWillExit (target) {
    const bubbleState = this._getBubbleState(target);
    if (bubbleState.drawableId && bubbleState.skinId) {
        this.runtime.renderer.destroyDrawable(bubbleState.drawableId, StageLayering.SPRITE_LAYER);
        this.runtime.renderer.destroySkin(bubbleState.skinId);
        bubbleState.drawableId = null;
        bubbleState.skinId = null;
        this.runtime.requestRedraw();
    }
    target.removeListener(RenderedTarget.EVENT_TARGET_VISUAL_CHANGE, this._onTargetChanged);
  }
  _onResetBubbles () {
    for (let n = 0; n < this.runtime.targets.length; n++) {
        const bubbleState = this._getBubbleState(this.runtime.targets[n]);
        bubbleState.text = '';
        this._onTargetWillExit(this.runtime.targets[n]);
    }
    clearTimeout(this._bubbleTimeout);
  }
  _positionBubble (target) {
    if (!target.visible) return;
    const bubbleState = this._getBubbleState(target);
    const [bubbleWidth, bubbleHeight] = this.runtime.renderer.getCurrentSkinSize(bubbleState.drawableId);
    let targetBounds;
    try {
        targetBounds = target.getBoundsForBubble();
    } catch (error_) {
        // Bounds calculation could fail (e.g. on empty costumes), in that case
        // use the x/y position of the target.
        targetBounds = {
            left: target.x,
            right: target.x,
            top: target.y,
            bottom: target.y
        };
    }
    const stageSize = this.runtime.renderer.getNativeSize();
    const stageBounds = {
        left: -stageSize[0] / 2,
        right: stageSize[0] / 2,
        top: stageSize[1] / 2,
        bottom: -stageSize[1] / 2
    };
    if (bubbleState.onSpriteRight && bubbleWidth + targetBounds.right > stageBounds.right &&
        (targetBounds.left - bubbleWidth > stageBounds.left)) { // Only flip if it would fit
        bubbleState.onSpriteRight = false;
        this._renderBubble(target);
    } else if (!bubbleState.onSpriteRight && targetBounds.left - bubbleWidth < stageBounds.left &&
        (bubbleWidth + targetBounds.right < stageBounds.right)) { // Only flip if it would fit
        bubbleState.onSpriteRight = true;
        this._renderBubble(target);
    } else {
        this.runtime.renderer.updateDrawablePosition(bubbleState.drawableId, [
            bubbleState.onSpriteRight ? (
                Math.max(
                    stageBounds.left, // Bubble should not extend past left edge of stage
                    Math.min(stageBounds.right - bubbleWidth, targetBounds.right)
                )
            ) : (
                Math.min(
                    stageBounds.right - bubbleWidth, // Bubble should not extend past right edge of stage
                    Math.max(stageBounds.left, targetBounds.left - bubbleWidth)
                )
            ),
            // Bubble should not extend past the top of the stage
            Math.min(stageBounds.top, targetBounds.bottom + bubbleHeight)
        ]);
        this.runtime.requestRedraw();
    }
  }
  _renderBubble (target) {
    if (!this.runtime.renderer) return;

    const bubbleState = this._getBubbleState(target);
    const {type, text, onSpriteRight} = bubbleState;

    // Remove the bubble if target is not visible, or text is being set to blank.
    if (!target.visible || text === '') {
        this._onTargetWillExit(target);
        return;
    }

    if (bubbleState.skinId) {
        this.runtime.renderer.updateTextSkin(bubbleState.skinId, type, text, onSpriteRight, [0, 0]);
    } else {
        target.addListener(RenderedTarget.EVENT_TARGET_VISUAL_CHANGE, this._onTargetChanged);
        bubbleState.drawableId = this.runtime.renderer.createDrawable(StageLayering.SPRITE_LAYER);
        bubbleState.skinId = this.runtime.renderer.createTextSkin(type, text, bubbleState.onSpriteRight, [0, 0]);
        this.runtime.renderer.updateDrawableSkinId(bubbleState.drawableId, bubbleState.skinId);
    }

    this._positionBubble(target);
  }
  _formatBubbleText (text) {
    if (text === '') return text;

    // Non-integers should be rounded to 2 decimal places (no more, no less), unless they're small enough that
    // rounding would display them as 0.00. This matches 2.0's behavior:
    // https://github.com/LLK/scratch-flash/blob/2e4a402ceb205a042887f54b26eebe1c2e6da6c0/src/scratch/ScratchSprite.as#L579-L585
    if (typeof text === 'number' &&
        Math.abs(text) >= 0.01 && text % 1 !== 0) {
        text = text.toFixed(2);
    }

    // Limit the length of the string.
    text = String(text).substr(0, 330);

    return text;
  }

  _updateBubble (target, type, text) {
    const bubbleState = this._getBubbleState(target);
    bubbleState.type = type;
    bubbleState.text = this._formatBubbleText(text);
    bubbleState.usageId = uid();
    this._renderBubble(target);
  
  }

  say (args, util) {
    // @TODO in 2.0 calling say/think resets the right/left bias of the bubble
    this.runtime.emit(ATRBlocks.SAY_OR_THINK, util.target, 'say', args.MESSAGE);
  }

  sayforsecs (args, util) {
    console.log(args);
    this.say(args, util);
    const target = util.target;
    const usageId = this._getBubbleState(target).usageId;
    return new Promise(resolve => {
        this._bubbleTimeout = setTimeout(() => {
            this._bubbleTimeout = null;
            // Clear say bubble if it hasn't been changed and proceed.
            if (this._getBubbleState(target).usageId === usageId) {
                this._updateBubble(target, 'say', '');
            }
            resolve();
        }, 1000 * args.SECS);
    });
}

    move_gear_motor(args, utils){
        console.log('move_gear_motor');
        message_xml = '<message><header></header><command><opcode>GEAR_MOTOR_1</opcode><motor>'+args.GEAR_MOTOR_ID+'</motor><dir>'+args.GEAR_MOTOR_DIRECTION+'</dir><wait>'+args.WAIT_TIME+'</wait></command></message>';
        console.log(message_xml);
        
        
        axios.post('http://localhost:9090/example', {
            message: message_xml
          })
          .then(function (response) {
            console.log(response);
            //util.target.setDirection(response.data);
          })
          .catch(function (error) {
            console.log(error);
          });
          
    }

    read_heart_beat_wearable(args, util){
      mruntime = this.runtime
      console.log("read_heart_beat_wearable");
      axios.post('http://localhost:9090/example', {
            message: "bpm"
          })
          .then(function (response) {
            console.log(response);
            //util.target.setDirection(response.data);
            margs = {
              MESSAGE: "Your bpm is: " + response.data,
              SECS: 1
            }
            mruntime.emit("SAY", util.target, 'say', margs.MESSAGE);
          })
          .catch(function (error) {
            console.log(error);
          });
    }


    read_orientation_wearable(args, utils){
      console.log("read_orientation_wearable");

      axios.post('http://localhost:9090/example', {
            message: "roll"
          })
          .then(function (response) {
            console.log(response);
            utils.target.setDirection(response.data);
          })
          .catch(function (error) {
            console.log(error);
          });
    }
}

module.exports = ATRBlocks;
