// 配置常量
import { positions, origins } from './presets/positions.js';
import * as easings  from './presets/easings.js';

export const CONFIG = {
    video: {
      width: 1920,
      height: 1080,
      fps: 30,
      format: 'mp4',
      quality: 0.9
    },
    rendering: {
      durationPerText: 2,
      backgroundColor: '#F5F5DC',
      textColor: '#000000',
      font: '48px KaiTi',
      lineSpacing: 60,
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5
    },
    thumbnail: {
      width: 192,
      height: 108
    },
    animations: {
      fadeIn: {type: 'opacity', from: 0, to: 1},
      fadeOut: {type: 'opacity', from: 1, to: 0},
      slideIn: {type: 'positionOffset', fromX: -0.3, fromY: 0, toX: 0, toY: 0},
      slideOut: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0.3, toY: 0},
      zoomIn: {type: 'scale', from: 0.5, to: 1},
      zoomOut: {type: 'scale', from: 1, to: 0.5},
      slideFromTop: {type: 'positionOffset', fromX: 0, fromY: -0.3, toX: 0, toY: 0},
      slideToTop: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0, toY: -0.3},
      slideFromBottom: {type: 'positionOffset', fromX: 0, fromY: 0.3, toX: 0, toY: 0},
      slideToBottom: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0, toY: 0.3},
      slideFromLeft: {type: 'positionOffset', fromX: -0.3, fromY: 0, toX: 0, toY: 0},
      slideToLeft: {type: 'positionOffset', fromX: 0, fromY: 0, toX: -0.3, toY: 0},
      slideFromRight: {type: 'positionOffset', fromX: 0.3, fromY: 0, toX: 0, toY: 0},
      slideToRight: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0.3, toY: 0},
      bounce: {type: 'positionOffset', fromX: 0, fromY: -0.05, toX: 0, toY: 0, easing: 'elastic'},
      rotateIn: {type: 'rotation', from: -180, to: 0},
      rotateOut: {type: 'rotation', from: 0, to: 180},
      spin: {type: 'rotation', from: 0, to: 360, cycle: true},
      spinReverse: {type: 'rotation', from: 0, to: -360, cycle: true},
      blink: {type: 'opacity', from: 1, to: 0, cycle: true, cycleDuration: 0.5},
      flash: {type: 'opacity', values: [1, 0, 1, 0, 1], keyTimes: [0, 0.25, 0.5, 0.75, 1]},
      shake: {type: 'positionOffsetPattern', 
             xPattern: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0], 
             yPattern: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
             relative: true},
      wave: {type: 'positionOffsetPattern',
             xPattern: [0, 0, 0, 0, 0],
             yPattern: [0, -10, 0, 10, 0],
             cycle: true,
             relative: true},
      flipX: {type: 'scale', scaleXFrom: 1, scaleXTo: -1, scaleYFrom: 1, scaleYTo: 1},
      flipY: {type: 'scale', scaleXFrom: 1, scaleXTo: 1, scaleYFrom: 1, scaleYTo: -1},
      popIn: {
        compositions: [
          {type: 'scale', from: 0.5, to: 1.1, duration: 0.7},
          {type: 'scale', from: 1.1, to: 1, startAt: 0.7},
          {type: 'opacity', from: 0, to: 1, duration: 0.5}
        ]
      },
      bounceIn: {
        compositions: [
          {type: 'scale', from: 0.3, to: 1, easing: 'bounce'},
          {type: 'opacity', from: 0, to: 1, duration: 0.3}
        ]
      },
      typewriter: {type: 'special', effect: 'typewriter', speed: 0.1},
      fadeColor: {type: 'color', from: '#ff0000', to: '#0000ff'},
      blurIn: {type: 'blur', from: 10, to: 0},
      blurOut: {type: 'blur', from: 0, to: 10}
    },
    easings: easings,
    positions,
    origins
  };
  