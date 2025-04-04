@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

struct Params {
    time: f32,
    scale: f32,
    color1: vec3f,    // 主色调(深褐色)
    _pad1: f32,
    color2: vec3f,    // 次要色调(浅褐色)
    _pad2: f32,
    color3: vec3f,    // 纹理色(白色)
    _pad3: f32,
    vein_scale: f32,  // 纹理尺度
    vein_contrast: f32, // 纹理对比度
    turbulence: f32,   // 湍流强度
    brightness: f32,   // 整体亮度
    jitter: f32       // 细胞噪声的抖动参数
}
@group(0) @binding(1) var<uniform> params: Params;

// 添加hash3函数定义
fn hash3(p: vec2f) -> vec2f {
    var p3 = fract(vec3f(p.xyx) * vec3f(443.897, 441.423, 437.195));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// 修改 cellular_noise 函数，降低其规则性
fn cellular_noise(uv: vec2f, scale: f32, jitter: f32) -> f32 {
    let scaled_uv = uv * scale;
    let cell = floor(scaled_uv);
    var min_dist = 1.0;
    var second_min_dist = 1.0;
    
    // 扩大搜索范围以获得更自然的效果
    for (var y: i32 = -2; y <= 2; y++) {
        for (var x: i32 = -2; x <= 2; x++) {
            let neighbor = cell + vec2f(f32(x), f32(y));
            // 增加随机性
            let point = neighbor + jitter * (hash3(neighbor) - 0.5);
            let diff = point - scaled_uv;
            let dist = dot(diff, diff); // 使用平方距离代替线性距离
            
            if (dist < min_dist) {
                second_min_dist = min_dist;
                min_dist = dist;
            } else if (dist < second_min_dist) {
                second_min_dist = dist;
            }
        }
    }
    
    // 使用更平滑的距离差值
    return smoothstep(0.0, 1.0, (second_min_dist - min_dist) * 4.0);
}

// 添加FBM版本的细胞噪声
fn cellular_fbm(uv: vec2f, octaves: i32) -> f32 {
    var value = 0.0;
    var amplitude = 1.0;
    var frequency = 1.0;
    var total_amplitude = 0.0;
    
    for (var i = 0; i < octaves; i++) {
        value += amplitude * cellular_noise(uv, params.scale * frequency, params.jitter);
        total_amplitude += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value / total_amplitude;
}

fn noise3D(p: vec3f) -> f32 {
    // 使用两个累加器来提高性能
    var wave0 = 0.0;
    var wave1 = 0.0;
    wave0 += sin(dot(p, vec3f(-1.259, 0.878, 1.337))) * 0.0846548766;
    wave1 += sin(dot(p, vec3f(0.276, -0.165, 2.027))) * 0.0829511356;
    wave0 += sin(dot(p, vec3f(-0.854, 1.334, 1.319))) * 0.0820121338;
    wave1 += sin(dot(p, vec3f(-1.715, -0.159, 1.149))) * 0.0812340289;
    wave0 += sin(dot(p, vec3f(-1.808, 0.599, -0.823))) * 0.0807143013;
    wave1 += sin(dot(p, vec3f(-1.548, 1.180, -0.791))) * 0.0783272869;
    wave0 += sin(dot(p, vec3f(1.845, -0.019, 1.012))) * 0.0781140937;
    wave1 += sin(dot(p, vec3f(0.338, -1.430, -1.549))) * 0.0754638431;
    wave0 += sin(dot(p, vec3f(1.114, 0.782, 1.653))) * 0.0749246579;
    wave1 += sin(dot(p, vec3f(-0.329, -0.474, 2.063))) * 0.0748901201;
    wave0 += sin(dot(p, vec3f(0.082, -1.962, -0.914))) * 0.0729476642;
    wave1 += sin(dot(p, vec3f(-0.385, -1.054, 1.855))) * 0.0727844078;
    wave0 += sin(dot(p, vec3f(-1.355, -1.430, -0.920))) * 0.0723501191;
    wave1 += sin(dot(p, vec3f(1.990, 0.377, 0.795))) * 0.0721573533;
    wave0 += sin(dot(p, vec3f(-1.267, -1.400, -1.109))) * 0.0711180738;
    wave1 += sin(dot(p, vec3f(1.126, -1.435, -1.241))) * 0.0699054494;
    wave0 += sin(dot(p, vec3f(-1.384, 1.151, 1.301))) * 0.0689018776;
    wave1 += sin(dot(p, vec3f(0.763, -1.494, 1.488))) * 0.0673927511;
    wave0 += sin(dot(p, vec3f(-0.455, -1.546, -1.574))) * 0.0666859949;
    wave1 += sin(dot(p, vec3f(-1.490, -1.508, -0.788))) * 0.0660935642;
    wave0 += sin(dot(p, vec3f(1.657, -1.210, -1.047))) * 0.0634635256;
    wave1 += sin(dot(p, vec3f(1.090, 1.415, -1.466))) * 0.0630264716;
    wave0 += sin(dot(p, vec3f(0.131, 1.678, -1.590))) * 0.0627348707;
    wave1 += sin(dot(p, vec3f(1.932, -0.258, -1.358))) * 0.0593239779;
    wave0 += sin(dot(p, vec3f(0.622, -1.132, 1.999))) * 0.0591022141;
    wave1 += sin(dot(p, vec3f(-2.087, 0.606, 1.014))) * 0.0581465893;
    wave0 += sin(dot(p, vec3f(1.712, 1.446, -0.911))) * 0.0570776102;
    wave1 += sin(dot(p, vec3f(-1.058, -1.542, -1.569))) * 0.0559640847;
    wave0 += sin(dot(p, vec3f(-1.279, -1.260, 1.655))) * 0.0559447700;
    wave1 += sin(dot(p, vec3f(0.418, 0.935, 2.219))) * 0.0558213187;
    wave0 += sin(dot(p, vec3f(-1.727, 0.529, 1.654))) * 0.0555958554;
    wave1 += sin(dot(p, vec3f(1.595, -1.242, 1.521))) * 0.0519640189;
    wave0 += sin(dot(p, vec3f(1.425, 1.220, 1.699))) * 0.0519169805;
    wave1 += sin(dot(p, vec3f(2.013, -1.004, 1.193))) * 0.0512741124;
    wave0 += sin(dot(p, vec3f(1.193, 1.329, 1.847))) * 0.0503169141;
    wave1 += sin(dot(p, vec3f(-0.198, 1.814, -1.813))) * 0.0501968179;
    wave0 += sin(dot(p, vec3f(-2.498, -0.154, -0.657))) * 0.0495790085;
    wave1 += sin(dot(p, vec3f(-0.117, -1.922, 1.747))) * 0.0491391430;
    wave0 += sin(dot(p, vec3f(-2.450, -0.068, -0.890))) * 0.0488141563;
    wave1 += sin(dot(p, vec3f(1.983, -1.696, 0.247))) * 0.0483421346;
    wave0 += sin(dot(p, vec3f(1.834, 0.402, -1.830))) * 0.0483013581;
    wave1 += sin(dot(p, vec3f(-0.596, 2.167, -1.350))) * 0.0482800303;
    wave0 += sin(dot(p, vec3f(-0.732, 1.725, 1.868))) * 0.0473924009;
    wave1 += sin(dot(p, vec3f(0.219, 1.408, -2.239))) * 0.0471294288;
    wave0 += sin(dot(p, vec3f(-0.049, 0.996, -2.462))) * 0.0470336781;
    wave1 += sin(dot(p, vec3f(-1.948, 1.820, 0.071))) * 0.0466819616;
    wave0 += sin(dot(p, vec3f(0.502, 2.175, 1.464))) * 0.0465789984;
    wave1 += sin(dot(p, vec3f(2.637, -0.121, 0.524))) * 0.0458373932;
    wave0 += sin(dot(p, vec3f(1.384, 2.330, 0.195))) * 0.0449769967;
    wave1 += sin(dot(p, vec3f(-0.675, -1.268, -2.307))) * 0.0449603037;
    wave0 += sin(dot(p, vec3f(0.592, 2.674, 0.117))) * 0.0441940844;
    wave1 += sin(dot(p, vec3f(-0.747, -2.650, 0.035))) * 0.0437969363;
    wave0 += sin(dot(p, vec3f(2.042, -1.782, 0.610))) * 0.0430414909;
    wave1 += sin(dot(p, vec3f(0.524, -2.276, -1.524))) * 0.0427205280;
    wave0 += sin(dot(p, vec3f(1.298, -2.439, 0.467))) * 0.0423439864;
    wave1 += sin(dot(p, vec3f(2.324, 1.197, 1.012))) * 0.0422983771;
    wave0 += sin(dot(p, vec3f(-0.855, 1.898, 1.912))) * 0.0416093220;
    wave1 += sin(dot(p, vec3f(1.856, -1.615, -1.408))) * 0.0413986509;
    wave0 += sin(dot(p, vec3f(1.591, -1.682, -1.640))) * 0.0413208934;
    wave1 += sin(dot(p, vec3f(2.738, 0.757, -0.115))) * 0.0411599404;
    wave0 += sin(dot(p, vec3f(1.159, 0.762, 2.487))) * 0.0410415681;
    wave1 += sin(dot(p, vec3f(-1.840, 2.236, -0.081))) * 0.0397109163;
    wave0 += sin(dot(p, vec3f(-1.592, 1.748, -1.721))) * 0.0390027230;
    wave1 += sin(dot(p, vec3f(2.026, 2.304, -0.101))) * 0.0355954102;
    wave0 += sin(dot(p, vec3f(-1.776, 1.365, -2.137))) * 0.0350378127;
    wave1 += sin(dot(p, vec3f(1.965, -0.745, 2.381))) * 0.0334375851;
    wave0 += sin(dot(p, vec3f(-1.974, -1.267, -2.151))) * 0.0333138005;
    wave1 += sin(dot(p, vec3f(-0.341, -3.128, 0.543))) * 0.0331174528;
    wave0 += sin(dot(p, vec3f(2.073, 1.625, -1.843))) * 0.0327022578;
    wave1 += sin(dot(p, vec3f(-0.736, -0.819, 3.023))) * 0.0326679919;
    wave0 += sin(dot(p, vec3f(-1.182, 0.374, -3.027))) * 0.0316987051;
    wave1 += sin(dot(p, vec3f(-1.835, 0.973, 2.557))) * 0.0313038446;
    wave0 += sin(dot(p, vec3f(-1.509, 1.960, 2.285))) * 0.0300914690;
    wave1 += sin(dot(p, vec3f(2.122, 2.252, 1.332))) * 0.0300776786;
    wave0 += sin(dot(p, vec3f(-1.616, 2.536, -1.524))) * 0.0300290929;
    wave1 += sin(dot(p, vec3f(-1.319, -1.019, 2.950))) * 0.0297758960;
    wave0 += sin(dot(p, vec3f(-2.516, 1.558, 1.735))) * 0.0291242876;
    wave1 += sin(dot(p, vec3f(2.349, 2.032, -1.499))) * 0.0288566198;
    wave0 += sin(dot(p, vec3f(-3.051, 1.544, -0.466))) * 0.0288152382;
    wave1 += sin(dot(p, vec3f(0.246, 1.119, 3.271))) * 0.0286099104;
    wave0 += sin(dot(p, vec3f(-0.546, 2.988, 1.683))) * 0.0285042980;
    wave1 += sin(dot(p, vec3f(-3.138, 0.351, 1.478))) * 0.0283143430;
    wave0 += sin(dot(p, vec3f(-1.797, -2.289, -1.926))) * 0.0282606825;
    wave1 += sin(dot(p, vec3f(3.123, -1.545, 0.195))) * 0.0282577170;
    wave0 += sin(dot(p, vec3f(2.828, 2.000, 0.466))) * 0.0281948783;
    wave1 += sin(dot(p, vec3f(0.788, -1.180, -3.205))) * 0.0280395303;
    wave0 += sin(dot(p, vec3f(0.897, 2.077, 2.691))) * 0.0279058121;
    wave1 += sin(dot(p, vec3f(1.320, -3.030, 1.216))) * 0.0278101397;
    wave0 += sin(dot(p, vec3f(-1.177, -3.387, 0.271))) * 0.0268242474;
    wave1 += sin(dot(p, vec3f(2.539, -2.168, -1.394))) * 0.0265448573;
    wave0 += sin(dot(p, vec3f(1.172, 0.214, 3.421))) * 0.0264819871;
    wave1 += sin(dot(p, vec3f(1.040, -2.187, 2.705))) * 0.0263905747;
    wave0 += sin(dot(p, vec3f(1.674, 3.050, -1.048))) * 0.0263527078;
    wave1 += sin(dot(p, vec3f(-2.931, -2.089, -0.557))) * 0.0262411510;
    wave0 += sin(dot(p, vec3f(0.120, -0.177, 3.676))) * 0.0257538971;
    wave1 += sin(dot(p, vec3f(-2.585, -2.069, -1.766))) * 0.0249277790;
    wave0 += sin(dot(p, vec3f(2.937, -2.163, -1.014))) * 0.0245589063;
    wave1 += sin(dot(p, vec3f(-2.877, 2.325, 0.844))) * 0.0244661555;
    wave0 += sin(dot(p, vec3f(-2.777, 2.229, 1.335))) * 0.0243682172;
    wave1 += sin(dot(p, vec3f(-2.686, 2.022, 1.833))) * 0.0240884440;
    wave0 += sin(dot(p, vec3f(1.781, -0.675, 3.373))) * 0.0236219139;
    wave1 += sin(dot(p, vec3f(-2.231, 0.455, 3.145))) * 0.0235295859;
    wave0 += sin(dot(p, vec3f(3.285, 0.800, 1.913))) * 0.0235150184;
    wave1 += sin(dot(p, vec3f(2.792, -1.067, -2.501))) * 0.0233855666;
    wave0 += sin(dot(p, vec3f(3.089, 2.410, 0.086))) * 0.0231690086;
    wave1 += sin(dot(p, vec3f(-2.316, -1.520, -2.812))) * 0.0228879304;
    wave0 += sin(dot(p, vec3f(2.777, -2.805, -0.247))) * 0.0228107666;
    wave1 += sin(dot(p, vec3f(2.190, 2.768, 1.830))) * 0.0226156480;
    wave0 += sin(dot(p, vec3f(-1.488, -2.005, 3.125))) * 0.0223859744;
    wave1 += sin(dot(p, vec3f(-3.172, 1.636, -1.859))) * 0.0221645617;
    wave0 += sin(dot(p, vec3f(-3.731, 0.941, -1.242))) * 0.0219912915;
    wave1 += sin(dot(p, vec3f(-2.406, -3.304, -0.554))) * 0.0212802537;
    wave0 += sin(dot(p, vec3f(-3.088, -1.542, -2.323))) * 0.0209764848;
    wave1 += sin(dot(p, vec3f(-1.339, -2.859, 2.764))) * 0.0206822296;
    wave0 += sin(dot(p, vec3f(-1.458, -0.403, -3.968))) * 0.0202843002;
    wave1 += sin(dot(p, vec3f(-3.272, -2.771, 0.610))) * 0.0196377983;
    wave0 += sin(dot(p, vec3f(2.424, 1.604, -3.250))) * 0.0194244336;
    wave1 += sin(dot(p, vec3f(-3.061, -2.160, -2.237))) * 0.0194025212;
    wave0 += sin(dot(p, vec3f(-3.032, 2.141, 2.332))) * 0.0192577122;
    wave1 += sin(dot(p, vec3f(1.515, -3.697, -2.035))) * 0.0185704640;
    wave0 += sin(dot(p, vec3f(-2.877, -1.455, 3.161))) * 0.0183653305;
    wave1 += sin(dot(p, vec3f(-2.326, 0.015, -3.877))) * 0.0183230480;
    wave0 += sin(dot(p, vec3f(-0.463, 3.186, -3.362))) * 0.0174895242;
    wave1 += sin(dot(p, vec3f(0.633, -1.267, 4.620))) * 0.0164825754;
    wave0 += sin(dot(p, vec3f(-0.929, 4.480, 1.590))) * 0.0164235829;
    wave1 += sin(dot(p, vec3f(-1.761, 4.569, -0.373))) * 0.0160723354;
    wave0 += sin(dot(p, vec3f(-4.609, 0.748, -1.551))) * 0.0160230408;
    wave1 += sin(dot(p, vec3f(2.837, 1.343, -3.847))) * 0.0157982751;
    return wave0 + wave1;
}


// 扭曲的FBM函数
fn fbmDistorted(p: vec3f, octaves: i32) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    var pos = p;
    
    // 添加扭曲
    pos += params.turbulence * vec3f(
        noise3D(pos * 2.0),
        noise3D(pos * 2.0 + vec3f(5.2, 1.3, 2.9)),
        noise3D(pos * 2.0 + vec3f(9.1, 4.7, 3.2))
    );

    for (var i = 0; i < octaves; i++) {
        value += amplitude * noise3D(pos * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
        
        // 添加旋转以减少方向性
        pos = vec3f(
            pos.y - pos.z * 0.5,
            pos.z - pos.x * 0.5,
            pos.x - pos.y * 0.5
        );
    }

    return value;
}

// 修改 marblePattern 函数中的混合权重
fn marblePattern(p: vec3f) -> vec3f {
    let base_scale = params.vein_scale * 0.3;
    
    // 添加基础噪声层
    let base_noise = noise3D(p * 8.0) * 0.15;
    
    let p1 = vec3f(
        p.x * cos(0.2) - p.y * sin(0.2),
        p.x * sin(0.2) + p.y * cos(0.2),
        p.z
    );
    
    // 增强基础纹理,添加底噪
    let base_pattern = (
        fbmDistorted(p1 * base_scale, 4) * 2.0 +
        fbmDistorted(p * base_scale * 1.5, 4) * 1.5 +
        cellular_fbm(p.xy * 2.0, 3) * 0.5 +
        base_noise  // 添加底层噪声
    );
    
    // 增加更细致的纹理细节
    let fine_detail = fbmDistorted(p * base_scale * 8.0, 2) * 0.3;
    
    let veins = (
        fbmDistorted(p * base_scale * 2.0 + vec3f(base_pattern), 3) * 1.2 +
        fbmDistorted(p * base_scale * 4.0, 2) * 0.6 +
        fine_detail  // 添加细节
    );
    
    // 组合所有纹理层
    let pattern = (base_pattern + veins) * 0.5 + 0.5;
    
    // 调整对比度
    let contrasted = pow(pattern, params.vein_contrast * 2.0);  // 增加对比度
    
    // 改进颜色混合
    var final_color: vec3f;
    if contrasted < 0.3 {  // 调整阈值
        let t = contrasted / 0.3;
        final_color = mix(params.color1, params.color2, smoothstep(0.0, 1.0, t));
    } else if contrasted < 0.6 {
        let t = (contrasted - 0.3) / 0.3;
        final_color = mix(params.color2, params.color3, smoothstep(0.0, 1.0, t));
    } else {
        let t = (contrasted - 0.6) / 0.4;
        final_color = mix(params.color3, params.color3 * 1.4, smoothstep(0.0, 1.0, t));  // 增加高光对比
    }
    
    // 添加细微的颜色变化
    let color_variation = noise3D(p * 5.0) * 0.1;
    final_color += vec3f(color_variation);
    
    return clamp(final_color * params.brightness, vec3f(0.0), vec3f(1.0));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let dims = textureDimensions(output);
    if global_id.x >= dims.x || global_id.y >= dims.y {
        return;
    }
    
    let uv = vec2f(f32(global_id.x), f32(global_id.y)) / vec2f(f32(dims.x), f32(dims.y));
    let p = vec3f(
        uv.x * params.scale,
        uv.y * params.scale,
        params.time * 0.1  // 减慢时间变化
    );
    
    let color = marblePattern(p);
    textureStore(output, global_id.xy, vec4f(color, 1.0));
} 