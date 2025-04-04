import { addScriptSync } from "../../DOM/addScript.js";
import { _load_ } from "../../module/wgslModule.js";
addScriptSync(import.meta.resolve('../../../../static/tf.min.js'))

// 统一使用 _load_ 加载所有着色器模块
const noiseModule = await _load_(import.meta.resolve('./generatorShaders/noise.wgsl'));
const gradientModule = await _load_(import.meta.resolve('./generatorShaders/gradient.wgsl'));
const checkerboardModule = await _load_(import.meta.resolve('./generatorShaders/checkboard.wgsl'));
const dotsModule = await _load_(import.meta.resolve('./generatorShaders/dots.wgsl'));
const cellularModule = await _load_(import.meta.resolve('./generatorShaders/cellular.wgsl'));
const woodModule = await _load_(import.meta.resolve('./generatorShaders/wood.wgsl'));
const wood01Module = await _load_(import.meta.resolve('./generatorShaders/wood_01.wgsl'));
const woodProceduralModule = await _load_(import.meta.resolve('./generatorShaders/wood_procedural.wgsl'));
const quarterSawnWoodModule = await _load_(import.meta.resolve('./generatorShaders/quarterSawnWood.wgsl'));
const knottyWoodModule = await _load_(import.meta.resolve('./generatorShaders/knottyWood.wgsl'));
const woodFineModule = await _load_(import.meta.resolve('./generatorShaders/wood_fine.wgsl'));
const wood02Module = await _load_(import.meta.resolve('./generatorShaders/wood_02.wgsl'));
const marbleRoyalBrownModule = await _load_(import.meta.resolve('./generatorShaders/marble_royal_brown.wgsl'));
const marbleDirectionalBrownModule = await _load_(import.meta.resolve('./generatorShaders/marble_striated.wgsl'));
const marbleVeinedModule = await _load_(import.meta.resolve('./generatorShaders/marble_veined.wgsl'));
const graniteModule = await _load_(import.meta.resolve('./generatorShaders/granite.wgsl'));

export const shaders = {
    noise: {
        code: noiseModule.code,
        uniforms: noiseModule.uniforms.params.fields,
        presets: {
            default: {
                scale: 8.0,
                seed: 0,
                octaves: 6,
                persistence: 0.5,
                lacunarity: 2.0,
                frequency: 1.0,
                amplitude: 1.0,
                offset_x: 0.0,
                offset_y: 0.0,
                contrast: 1.0,
                brightness: 0.0,
                detail_scale: 2.0,
                master_scale: 1.0,
                detail_weight: 0.3
            },
            detailed: {
                scale: 16.0,
                seed: 0,
                octaves: 8,
                persistence: 0.7,
                lacunarity: 2.5,
                frequency: 2.0,
                amplitude: 1.0,
                offset_x: 0.0,
                offset_y: 0.0,
                contrast: 1.2,
                brightness: 0.0,
                detail_scale: 4.0,
                master_scale: 1.0,
                detail_weight: 0.5
            }
        }
    },
    
    gradient: {
        code: gradientModule.code,
        uniforms: gradientModule.uniforms.params.fields,
        presets: {
            redBlue: {
                color1: [1.0, 0.0, 0.0, 1.0],
                color2: [0.0, 0.0, 1.0, 1.0],
                angle: 0.0,
                offset: 0.0
            },
            rainbow: {
                color1: [1.0, 0.0, 1.0, 1.0],
                color2: [0.0, 1.0, 0.0, 1.0],
                angle: Math.PI / 2,
                offset: 0.0
            }
        }
    },
    
    checkerboard: {
        code: checkerboardModule.code,
        uniforms: checkerboardModule.uniforms.params.fields,
        presets: {
            standard: {
                color1: [1, 1, 1, 1],
                color2: [0, 0, 0, 1],
                size: 8.0,
                rotation: 0.0,
                offset_x: 0.0,
                offset_y: 0.0
            },
            rotated: {
                color1: [0.9, 0.1, 0.1, 1],
                color2: [0.1, 0.1, 0.9, 1],
                size: 16.0,
                rotation: Math.PI / 4,
                offset_x: 0.5,
                offset_y: 0.5
            }
        }
    },

    dots: {
        code: dotsModule.code,
        uniforms: dotsModule.uniforms.params.fields,
        presets: {
            standard: {
                background: [0, 0, 0, 1],
                dot_color: [1, 1, 1, 1],
                size: 10.0,
                dot_radius: 0.3,
                softness: 0.1,
                rotation: 0.0
            },
            soft: {
                background: [0.1, 0.1, 0.1, 1],
                dot_color: [1, 0.8, 0.2, 1],
                size: 15.0,
                dot_radius: 0.4,
                softness: 0.3,
                rotation: Math.PI / 6
            }
        }
    },

    cellular: {
        code: cellularModule.code,
        uniforms: cellularModule.uniforms.params.fields,
        presets: {
            standard: {
                scale: 5.0,
                seed: 0,
                intensity: 1.0,
                jitter: 1.0,
                falloff: 1.0
            },
            organic: {
                scale: 8.0,
                seed: 0,
                intensity: 1.5,
                jitter: 0.8,
                falloff: 2.0
            }
        }
    },

    wood: {
        code: woodModule.code,
        uniforms: woodModule.uniforms.params.fields,
        presets: {
            standard: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.03, 0.012, 0.003],
                color2: [0.25, 0.11, 0.04],
                color3: [0.52, 0.32, 0.19],
                grain_scale: 20.0,
                ring_scale: 3.0,
                contrast: 1.2,
                brightness: 0.0
            },
            light: {
                time: Math.random(),
                scale: 3.0,
                color1: [0.15, 0.08, 0.02],
                color2: [0.35, 0.20, 0.08],
                color3: [0.62, 0.42, 0.25],
                grain_scale: 25.0,
                ring_scale: 2.5,
                contrast: 1.0,
                brightness: 0.1
            },
            mahogany: {
                time: Math.random(),
                scale: 5.0,
                color1: [0.12, 0.02, 0.02],
                color2: [0.32, 0.08, 0.06],
                color3: [0.58, 0.25, 0.20],
                grain_scale: 30.0,
                ring_scale: 4.0,
                contrast: 1.4,
                brightness: -0.1
            },
            birch: {
                time: Math.random(),
                scale: 3.5,
                color1: [0.45, 0.38, 0.25],
                color2: [0.52, 0.45, 0.32],
                color3: [0.62, 0.55, 0.42],
                grain_scale: 15.0,
                ring_scale: 2.0,
                contrast: 0.6,
                brightness: 0.0
            },
            ashWood: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.35, 0.28, 0.18],
                color2: [0.35, 0.28, 0.18],
                color3: [0.35, 0.28, 0.18],
                grain_scale: 18.0,
                ring_scale: 2.8,
                contrast: 0.7,
                brightness: -0.05
            },
            pearWood: {
                time: Math.random(),
                scale: 3.8,
                color1: [0.38, 0.30, 0.22],
                color2: [0.45, 0.38, 0.28],
                color3: [0.55, 0.48, 0.38],
                grain_scale: 22.0,
                ring_scale: 2.5,
                contrast: 0.65,
                brightness: -0.02
            },
            bleachedOak: {
                time: Math.random(),
                scale: 4.2,
                color1: [0.42, 0.35, 0.28],
                color2: [0.48, 0.42, 0.35],
                color3: [0.58, 0.52, 0.45],
                grain_scale: 20.0,
                ring_scale: 3.0,
                contrast: 0.55,
                brightness: -0.02
            }
        }
    },

    wood_01: {
        code: wood01Module.code,
        uniforms: wood01Module.uniforms.params.fields,
        presets: {
            lightOak: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.45, 0.25, 0.15],
                color2: [0.60, 0.35, 0.22],
                color3: [0.85, 0.55, 0.37],
                ring_scale: 3.0,
                ring_width: 12.0,
                fiber_scale: 20.0,
                fiber_strength: 0.3
            },
            darkWalnut: {
                time: Math.random(),
                scale: 5.0,
                color1: [0.20, 0.12, 0.08],
                color2: [0.35, 0.20, 0.15],
                color3: [0.45, 0.28, 0.20],
                ring_scale: 4.0,
                ring_width: 15.0,
                fiber_scale: 25.0,
                fiber_strength: 0.4
            },
            mahogany: {
                time: Math.random(),
                scale: 3.0,
                color1: [0.25, 0.10, 0.08],
                color2: [0.40, 0.15, 0.12],
                color3: [0.55, 0.25, 0.20],
                ring_scale: 2.5,
                ring_width: 10.0,
                fiber_scale: 30.0,
                fiber_strength: 0.25
            },
            maple: {
                time: Math.random(),
                scale: 4.5,
                color1: [0.52, 0.37, 0.26],
                color2: [0.65, 0.48, 0.35],
                color3: [0.82, 0.65, 0.48],
                ring_scale: 3.5,
                ring_width: 8.0,
                fiber_scale: 15.0,
                fiber_strength: 0.35
            }
        }
    },

    wood_procedural: {
        code: woodProceduralModule.code,
        uniforms: woodProceduralModule.uniforms.params.fields,
        presets: {
            oak: {
                time: Math.random(),
                scale: 3.0,
                wood_type: 1,
                panel_width: 1.5,
                panel_height: 0.1,
                ring_scale: 1.2,
                ring_contrast: 1.1,
                grain_scale: 2.0,
                color1: [0.45, 0.25, 0.15],
                color2: [0.60, 0.35, 0.22],
                color3: [0.85, 0.55, 0.37]
            },
            darkWalnut: {
                time: Math.random(),
                scale: 4.0,
                wood_type: 2,
                panel_width: 2.0,
                panel_height: 0.15,
                ring_scale: 1.5,
                ring_contrast: 1.3,
                grain_scale: 2.5,
                color1: [0.20, 0.12, 0.08],
                color2: [0.35, 0.20, 0.15],
                color3: [0.45, 0.28, 0.20]
            },
            maple: {
                time: Math.random(),
                scale: 3.5,
                wood_type: 3,
                panel_width: 1.8,
                panel_height: 0.12,
                ring_scale: 1.0,
                ring_contrast: 0.9,
                grain_scale: 1.8,
                color1: [0.52, 0.37, 0.26],
                color2: [0.65, 0.48, 0.35],
                color3: [0.82, 0.65, 0.48]
            }
        }
    },

    quarter_sawn_wood: {
        code: quarterSawnWoodModule.code,
        uniforms: quarterSawnWoodModule.uniforms.params.fields,
        presets: {
            standardOak: {
                time: Math.random(),
                scale: 3.0,
                color1: [0.4, 0.2, 0.1],
                color2: [0.6, 0.3, 0.15],
                color3: [0.8, 0.4, 0.2],
                grain_scale: 1.0,
                ring_scale: 1.0,
                contrast: 1.3,
                brightness: 0.1,
                ray_intensity: 0.2,
                ray_frequency: 30.0
            },
            maple: {
                time: Math.random(),
                scale: 2.5,
                color1: [0.52, 0.37, 0.26],
                color2: [0.65, 0.48, 0.35],
                color3: [0.82, 0.65, 0.48],
                grain_scale: 1.2,
                ring_scale: 0.8,
                contrast: 1.2,
                brightness: 0.15,
                ray_intensity: 0.15,
                ray_frequency: 25.0
            },
            whiteOak: {
                time: Math.random(),
                scale: 3.5,
                color1: [0.45, 0.35, 0.25],
                color2: [0.65, 0.52, 0.38],
                color3: [0.85, 0.72, 0.55],
                grain_scale: 0.9,
                ring_scale: 1.2,
                contrast: 1.1,
                brightness: 0.2,
                ray_intensity: 0.25,
                ray_frequency: 35.0
            },
            darkWalnut: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.2, 0.12, 0.08],
                color2: [0.35, 0.2, 0.15],
                color3: [0.45, 0.28, 0.2],
                grain_scale: 1.4,
                ring_scale: 1.5,
                contrast: 1.4,
                brightness: 0.05,
                ray_intensity: 0.18,
                ray_frequency: 28.0
            }
        }
    },

    knottyWood: {
        code: knottyWoodModule.code,
        uniforms: knottyWoodModule.uniforms.params.fields,
        presets: {
            knottyPine: {
                time: Math.random(),
                scale: 5.0,
                color1: [0.28, 0.15, 0.07],
                color2: [0.45, 0.27, 0.14],
                color3: [0.65, 0.42, 0.26],
                grain_scale: 400.0,
                ring_scale: 3.0,
                contrast: 1.3,
                brightness: 0.1
            },
            rusticOak: {
                time: Math.random(),
                scale: 6.0,
                color1: [0.22, 0.12, 0.06],
                color2: [0.38, 0.24, 0.12],
                color3: [0.58, 0.38, 0.22],
                grain_scale: 350.0,
                ring_scale: 4.0,
                contrast: 1.4,
                brightness: 0.0
            },
            burledMaple: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.42, 0.28, 0.18],
                color2: [0.62, 0.45, 0.32],
                color3: [0.82, 0.65, 0.48],
                grain_scale: 450.0,
                ring_scale: 2.5,
                contrast: 1.2,
                brightness: 0.15
            }
        }
    },

    wood_fine: {
        code: woodFineModule.code,
        uniforms: woodFineModule.uniforms.params.fields,
        presets: {
            standard: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.03, 0.012, 0.003],
                color2: [0.25, 0.11, 0.04],
                color3: [0.52, 0.32, 0.19],
                grain_scale: 20.0,
                ring_scale: 3.0,
                contrast: 1.2,
                brightness: 0.0
            },
            lightOak: {
                time: Math.random(),
                scale: 3.5,
                color1: [0.42, 0.28, 0.18],
                color2: [0.58, 0.38, 0.25],
                color3: [0.72, 0.52, 0.35],
                grain_scale: 25.0,
                ring_scale: 2.8,
                contrast: 0.9,
                brightness: 0.1
            },
            darkWalnut: {
                time: Math.random(),
                scale: 4.5,
                color1: [0.12, 0.06, 0.03],
                color2: [0.28, 0.15, 0.08],
                color3: [0.42, 0.25, 0.15],
                grain_scale: 22.0,
                ring_scale: 3.2,
                contrast: 1.4,
                brightness: -0.1
            },
            mahogany: {
                time: Math.random(),
                scale: 4.2,
                color1: [0.15, 0.05, 0.03],
                color2: [0.35, 0.12, 0.08],
                color3: [0.55, 0.25, 0.18],
                grain_scale: 18.0,
                ring_scale: 3.5,
                contrast: 1.3,
                brightness: -0.05
            }
        }
    },

    wood_02: {
        code: wood02Module.code,
        uniforms: wood02Module.uniforms.params.fields,
        presets: {
            fineOak: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.35, 0.20, 0.10],
                color2: [0.50, 0.30, 0.15],
                color3: [0.70, 0.45, 0.25],
                grain_scale: 15.0,
                ring_scale: 2.5,
                contrast: 1.2,
                brightness: 0.1
            },
            richWalnut: {
                time: Math.random(),
                scale: 5.0,
                color1: [0.15, 0.08, 0.05],
                color2: [0.30, 0.18, 0.12],
                color3: [0.45, 0.28, 0.20],
                grain_scale: 18.0,
                ring_scale: 3.0,
                contrast: 1.4,
                brightness: -0.05
            },
            goldenTeak: {
                time: Math.random(),
                scale: 4.5,
                color1: [0.40, 0.25, 0.15],
                color2: [0.55, 0.35, 0.20],
                color3: [0.75, 0.50, 0.30],
                grain_scale: 20.0,
                ring_scale: 2.8,
                contrast: 1.3,
                brightness: 0.15
            }
        }
    },

    marble_royal_brown: {
        code: marbleRoyalBrownModule.code,
        uniforms: marbleRoyalBrownModule.uniforms.params.fields,
        presets: {
            royalBrown: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.35, 0.20, 0.12],
                color2: [0.55, 0.35, 0.25],
                color3: [0.85, 0.80, 0.75],
                vein_scale: 2.0,
                vein_contrast: 1.2,
                turbulence: 1.0,
                brightness: 1.0
            },
            emperadorDark: {
                time: Math.random(),
                scale: 3.5,
                color1: [0.25, 0.15, 0.10],
                color2: [0.45, 0.30, 0.20],
                color3: [0.75, 0.65, 0.55],
                vein_scale: 1.8,
                vein_contrast: 1.4,
                turbulence: 1.2,
                brightness: 0.9
            },
            goldenBeige: {
                time: Math.random(),
                scale: 4.2,
                color1: [0.40, 0.30, 0.20],
                color2: [0.60, 0.45, 0.30],
                color3: [0.90, 0.85, 0.80],
                vein_scale: 2.2,
                vein_contrast: 1.1,
                turbulence: 0.8,
                brightness: 1.1
            }
        }
    },

    marble_directional_brown: {
        code: marbleDirectionalBrownModule.code,
        uniforms: marbleDirectionalBrownModule.uniforms.params.fields,
        presets: {
            classic: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.35, 0.20, 0.12],
                color2: [0.55, 0.35, 0.25],
                color3: [0.85, 0.80, 0.75],
                vein_scale: 2.0,
                jitter: 1.0,
                vein_contrast: 1.2,
                brightness: 1.0
            },
            golden: {
                time: Math.random(),
                scale: 3.8,
                color1: [0.42, 0.28, 0.15],
                color2: [0.62, 0.42, 0.25],
                color3: [0.88, 0.82, 0.70],
                vein_scale: 2.2,
                jitter: 0.8,
                vein_contrast: 1.3,
                brightness: 1.1
            },
            coffee: {
                time: Math.random(),
                scale: 4.2,
                color1: [0.25, 0.15, 0.10],
                color2: [0.45, 0.30, 0.20],
                color3: [0.75, 0.65, 0.55],
                vein_scale: 1.8,
                jitter: 1.2,
                vein_contrast: 1.4,
                brightness: 0.9
            }
        }
    },

    marble_veined: {
        code: marbleVeinedModule.code,
        uniforms: marbleVeinedModule.uniforms.params.fields,
        presets: {
            calacatta: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.85, 0.82, 0.78],
                color2: [0.92, 0.90, 0.85],
                color3: [0.98, 0.96, 0.92],
                vein_scale: 2.5,
                jitter: 0.8,
                vein_contrast: 1.1,
                brightness: 1.1
            },
            carrara: {
                time: Math.random(),
                scale: 3.5,
                color1: [0.80, 0.80, 0.82],
                color2: [0.88, 0.88, 0.90],
                color3: [0.95, 0.95, 0.97],
                vein_scale: 2.2,
                jitter: 0.9,
                vein_contrast: 1.2,
                brightness: 1.0
            },
            emperador: {
                time: Math.random(),
                scale: 4.2,
                color1: [0.28, 0.18, 0.12],
                color2: [0.45, 0.32, 0.22],
                color3: [0.65, 0.52, 0.42],
                vein_scale: 2.8,
                jitter: 1.1,
                vein_contrast: 1.3,
                brightness: 0.9
            },
            nero_marquina: {
                time: Math.random(),
                scale: 4.0,
                color1: [0.12, 0.12, 0.12],
                color2: [0.20, 0.20, 0.20],
                color3: [0.85, 0.85, 0.80],
                vein_scale: 3.0,
                jitter: 1.0,
                vein_contrast: 1.4,
                brightness: 0.95
            },
            nero_marquina1: {
                time: Math.random(),
                scale: 4.0,
                color3: [0.12, 0.12, 0.12],
                color2: [0.20, 0.20, 0.20],
                color2: [0.45, 0.32, 0.22],
                vein_scale: 3.0,
                jitter: 1.0,
                vein_contrast: 1.4,
                brightness: 0.95
            }
        }
    },

    granite: {
        code: graniteModule.code,
        uniforms: graniteModule.uniforms.params.fields,
        presets: {
            grayGranite: {
                color1: [0, 0, 0],
                color2: [0.4, 0.4, 0.42],
                color3: [0, 0, 0],
                time: Math.random(),
                scale: 1.0,
                grid_scale: 8.0,
                line_width: 0.05,
                noise_scale: 90,
                roughness: 0.8
            },
            blackGranite: {
                color1: [0.2, 0.2, 0.22],
                color2: [0.1, 0.1, 0.12],
                color3: [0.5, 0.5, 0.52],
                time: Math.random(),
                scale: 10.0,
                grid_scale: 1,
                line_width: 0.01,
                noise_scale: 1.2,
                roughness: 10
            },
            pinkGranite: {
                time: Math.random(),
                scale: 1.0,
                grid_scale: 7.0,
                line_width: 0.06,
                color1: [0.8, 0.65, 0.62],
                color2: [0.6, 0.45, 0.42],
                color3: [0.9, 0.75, 0.72],
                noise_scale: 0.9,
                roughness: 0.7
            },
            brownGranite: {
                time: Math.random(),
                scale: 1.0,
                grid_scale: 9.0,
                line_width: 0.05,
                color1: [0.55, 0.42, 0.35],
                color2: [0.35, 0.25, 0.20],
                color3: [0.65, 0.52, 0.45],
                noise_scale: 1.1,
                roughness: 0.85
            }
        }
    },

};
