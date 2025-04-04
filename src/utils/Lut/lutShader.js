export const lutShader = `
    struct Params {
        intensity: f32
    }
    @group(0) @binding(0) var inputTexture: texture_2d<f32>;
    @group(0) @binding(1) var lutTexture: texture_3d<f32>;
    @group(0) @binding(2) var outputTexture: texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(3) var lutSampler: sampler;
    @group(0) @binding(4) var<uniform> params: Params;
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let dims = textureDimensions(inputTexture);
        let coords = vec2<u32>(global_id.xy);
        if (coords.x >= dims.x || coords.y >= dims.y) {
            return;
        }
        let originalColor = textureLoad(inputTexture, vec2<i32>(coords), 0);
        let lutCoord = originalColor.rgb * (31.0/32.0) + (0.5/32.0);
        let lutColor = textureSampleLevel(lutTexture, lutSampler, lutCoord, 0.0);
        let newColor = mix(originalColor, lutColor, params.intensity);
        textureStore(outputTexture, coords, vec4<f32>(newColor.rgb, originalColor.a));
    }
`;
