// 重构着色器定义,使用更结构化的方式
export const shaders = {
    noise: {
        code: `
        @group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
        
        struct Params {
            scale: f32,
            seed: f32,
            octaves: i32,
            persistence: f32,
            lacunarity: f32,
            frequency: f32,
            amplitude: f32,
            offset_x: f32,
            offset_y: f32,
            contrast: f32,
            brightness: f32,
            detail_scale: f32,
            master_scale: f32,
            detail_weight: f32
        }
        @group(0) @binding(1) var<uniform> params: Params;

        // 优化哈希函数，减少计算复杂度
        fn hash2(p: vec2f) -> f32 {
            let x = p.x * 127.1 + p.y * 311.7 + params.seed;
            return fract(sin(x) * 43758.5453123);
        }

        // 简化的2D噪声实现
        fn simpleNoise2D(p: vec2f) -> f32 {
            let pi = floor(p);
            let pf = fract(p);
            
            let a = hash2(pi);
            let b = hash2(pi + vec2f(1.0, 0.0));
            let c = hash2(pi + vec2f(0.0, 1.0));
            let d = hash2(pi + vec2f(1.0, 1.0));
            
            let u = pf * pf * (3.0 - 2.0 * pf);
            
            return mix(
                mix(a, b, u.x),
                mix(c, d, u.x),
                u.y
            );
        }

        // 修改 fbm 函数以支持多层次细节
        fn fbm(p: vec2f) -> f32 {
            // 主要纹理
            var freq = params.frequency;
            var amp = params.amplitude;
            var sum = 0.0;
            var maxSum = 0.0;
            
            let offsetP = p + vec2f(params.offset_x, params.offset_y);
            let baseP = offsetP * params.master_scale;
            
            let maxOctaves = min(params.octaves, 4);
            
            for(var i = 0; i < maxOctaves; i++) {
                sum += amp * simpleNoise2D(baseP * freq);
                maxSum += amp;
                freq *= params.lacunarity;
                amp *= params.persistence;
            }
            
            var mainNoise = sum / maxSum;

            // 细节纹理
            freq = params.frequency * 2.0;
            amp = params.amplitude * 0.5;
            sum = 0.0;
            maxSum = 0.0;
            
            let detailP = offsetP * params.detail_scale;
            
            for(var i = 0; i < maxOctaves; i++) {
                sum += amp * simpleNoise2D(detailP * freq);
                maxSum += amp;
                freq *= params.lacunarity;
                amp *= params.persistence;
            }
            
            let detailNoise = sum / maxSum;

            // 混合主要纹理和细节
            var result = mix(mainNoise, detailNoise, params.detail_weight);
            
            // 应用对比度和亮度
            result = (result - 0.5) * params.contrast + 0.5 + params.brightness;
            return clamp(result, 0.0, 1.0);
        }

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3u) {
            let dims = textureDimensions(output);
            if (global_id.x >= dims.x || global_id.y >= dims.y) {
                return;
            }
            
            let pos = vec2f(f32(global_id.x), f32(global_id.y));
            let uv = pos / vec2f(f32(dims.x), f32(dims.y));
            
            let noise = fbm(uv * params.scale);
            textureStore(output, global_id.xy, vec4f(noise, noise, noise, 1.0));
        }
        `,
        uniforms: {
            scale: 'f32',
            seed: 'f32',
            octaves: 'i32',
            persistence: 'f32',
            lacunarity: 'f32',
            frequency: 'f32',
            amplitude: 'f32',
            offset_x: 'f32',
            offset_y: 'f32',
            contrast: 'f32',
            brightness: 'f32',
            detail_scale: 'f32',
            master_scale: 'f32',
            detail_weight: 'f32'
        }
    },
    
    gradient: {
        code: `
        @group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
        
        struct GradientParams {
            color1: vec4f,
            color2: vec4f,
            angle: f32,
            offset: f32,
            _padding: vec2f
        }
        @group(0) @binding(1) var<uniform> params: GradientParams;

        fn rotate2D(pos: vec2f, angle: f32) -> f32 {
            let c = cos(angle);
            let s = sin(angle);
            return pos.x * c + pos.y * s;
        }

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3u) {
            let dims = textureDimensions(output);
            if (global_id.x >= dims.x || global_id.y >= dims.y) {
                return;
            }
            
            let pos = vec2f(
                (f32(global_id.x) / f32(dims.x) - 0.5) * 2.0,
                (f32(global_id.y) / f32(dims.y) - 0.5) * 2.0
            );
            
            let rotated = rotate2D(pos, params.angle);
            var t = (rotated + 1.0) * 0.5 + params.offset;
            t = clamp(t, 0.0, 1.0);
            
            let color = mix(params.color1, params.color2, t);
            textureStore(output, global_id.xy, color);
        }`,
        uniforms: {
            color1: 'vec4f',
            color2: 'vec4f',
            angle: 'f32',
            offset: 'f32',
            _padding: 'vec2f'
        }
    },
    
    // 添加棋盘格着色器
    checkerboard: {
        code: `
        @group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
        
        struct Params {
            color1: vec4f,
            color2: vec4f,
            size: f32,
            rotation: f32,
            offset_x: f32,
            offset_y: f32
        }
        @group(0) @binding(1) var<uniform> params: Params;

        fn rotate2D(uv: vec2f, angle: f32) -> vec2f {
            let c = cos(angle);
            let s = sin(angle);
            return vec2f(
                uv.x * c - uv.y * s,
                uv.x * s + uv.y * c
            );
        }

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3u) {
            let dims = textureDimensions(output);
            let uv = (vec2f(f32(global_id.x), f32(global_id.y)) + 
                     vec2f(params.offset_x, params.offset_y)) / vec2f(f32(dims.x), f32(dims.y));
            
            let rotatedUV = rotate2D(uv - 0.5, params.rotation) + 0.5;
            let grid = floor(rotatedUV * params.size);
            let checker = (grid.x + grid.y) % 2.0;
            
            let color = mix(params.color1, params.color2, checker);
            textureStore(output, global_id.xy, color);
        }`,
        uniforms: {
            color1: 'vec4f',
            color2: 'vec4f',
            size: 'f32',
            rotation: 'f32',
            offset_x: 'f32',
            offset_y: 'f32'
        }
    },

    // 添加点阵纹理
    dots: {
        code: `
        @group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
        
        struct Params {
            background: vec4f,
            dot_color: vec4f,
            size: f32,
            dot_radius: f32,
            softness: f32,
            rotation: f32
        }
        @group(0) @binding(1) var<uniform> params: Params;

        fn rotate2D(uv: vec2f, angle: f32) -> vec2f {
            let c = cos(angle);
            let s = sin(angle);
            return vec2f(
                uv.x * c - uv.y * s,
                uv.x * s + uv.y * c
            );
        }

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3u) {
            let dims = textureDimensions(output);
            let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));
            
            let rotatedUV = rotate2D(uv - 0.5, params.rotation) + 0.5;
            let gridUV = fract(rotatedUV * params.size);
            let dist = length(gridUV - 0.5);
            
            let circle = 1.0 - smoothstep(
                params.dot_radius - params.softness,
                params.dot_radius + params.softness,
                dist
            );
            
            let color = mix(params.background, params.dot_color, circle);
            textureStore(output, global_id.xy, color);
        }`,
        uniforms: {
            background: 'vec4f',
            dot_color: 'vec4f',
            size: 'f32',
            dot_radius: 'f32',
            softness: 'f32',
            rotation: 'f32'
        }
    },

    // 添加细胞噪声(Worley噪声)
    cellular: {
        code: `
        @group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;
        
        struct Params {
            scale: f32,
            seed: f32,
            intensity: f32,
            jitter: f32,
            falloff: f32
        }
        @group(0) @binding(1) var<uniform> params: Params;

        fn hash3(p: vec2f) -> vec2f {
            var p2 = vec2f(
                dot(p, vec2f(127.1, 311.7)),
                dot(p, vec2f(269.5, 183.3))
            );
            p2 = fract(sin(p2 + params.seed) * 43758.5453123);
            return p2;
        }

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id: vec3u) {
            let dims = textureDimensions(output);
            let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));
            
            let scaled_uv = uv * params.scale;
            let cell = floor(scaled_uv);
            var min_dist = 1.0;
            
            // 搜索相邻的细胞
            for(var y: i32 = -1; y <= 1; y++) {
                for(var x: i32 = -1; x <= 1; x++) {
                    let neighbor = cell + vec2f(f32(x), f32(y));
                    let point = neighbor + params.jitter * hash3(neighbor);
                    let diff = point - scaled_uv;
                    min_dist = min(min_dist, length(diff));
                }
            }
            
            let value = pow(min_dist * params.intensity, params.falloff);
            textureStore(output, global_id.xy, vec4f(value, value, value, 1.0));
        }`,
        uniforms: {
            scale: 'f32',
            seed: 'f32',
            intensity: 'f32',
            jitter: 'f32',
            falloff: 'f32'
        }
    }
};
