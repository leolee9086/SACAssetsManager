
export const providerList = [
    {
        id: "siliconflow",
        name: "硅基流动",
        logo: "/assets/images/providers/siliconflow.png",
        location: "中国",
        establishedYear: "2023",
        description: "专注于开源大语言模型的研发与部署，提供高性能、低成本的AI解决方案。",
        services: ["开源模型", "模型部署", "模型训练", "API服务"],
        modelCount: 12,
        links: {
            homepage: "https://www.siliconflow.com",
            console: "https://console.siliconflow.com",
            docs: "https://docs.siliconflow.com",
            pricing: "https://www.siliconflow.com/pricing"
        },
        features: ["支持私有化部署", "提供开源模型下载", "低成本推理方案"],
        modelList:'./modelCards/硅基流动.js'
    },
    {
        id: "volcengine",
        name: "火山引擎",
        logo: "/assets/images/providers/volcengine.png",
        modelList:'./modelCards/火山方舟.js',
        location: "中国·北京",
        establishedYear: "2020",
        description: "字节跳动旗下的云服务平台，提供丰富的AI能力与解决方案，包括文本生成、对话、图像识别等服务。",
        services: ["API服务", "模型训练", "企业定制", "多模态"],
        modelCount: 25,
        links: {
            homepage: "https://www.volcengine.com",
            console: "https://console.volcengine.com/mlm",
            docs: "https://www.volcengine.com/docs/82379",
            pricing: "https://www.volcengine.com/pricing"
        },
        features: ["支持定制微调", "多场景解决方案", "企业级SLA保障"]
    },
    {
        id: "baidu",
        name: "文心千帆",
        logo: "/assets/images/providers/wenxin.png",
        location: "中国·北京",
        establishedYear: "2023",
        description: "百度智能云推出的大模型平台，提供文心一言等系列模型服务，支持多场景AI应用开发。",
        services: ["API服务", "多模态", "知识增强", "企业定制"],
        modelCount: 30,
        links: {
            homepage: "https://cloud.baidu.com/product/wenxinworkshop",
            console: "https://console.bce.baidu.com/qianfan",
            docs: "https://cloud.baidu.com/doc/WENXINWORKSHOP",
            pricing: "https://cloud.baidu.com/pricing/wenxin"
        },
        features: ["知识库增强", "多模态能力", "行业解决方案"]
    },
    {
        id: "dashscope",
        name: "通义千问",
        logo: "/assets/images/providers/tongyi.png",
        location: "中国·杭州",
        establishedYear: "2023",
        description: "阿里云推出的大模型服务平台，提供通义千问系列模型，支持多领域智能化应用。",
        services: ["API服务", "多模态", "行业定制", "知识库"],
        modelCount: 28,
        links: {
            homepage: "https://dashscope.aliyun.com",
            console: "https://dashscope.console.aliyun.com",
            docs: "https://help.aliyun.com/document_detail/2400395.html",
            pricing: "https://help.aliyun.com/document_detail/2348651.html"
        },
        features: ["支持私有知识库", "多模态理解", "企业级安全保障"]
    },
    {
        id: "sensetime",
        name: "商汤科技",
        logo: "/assets/images/providers/sensetime.png",
        location: "中国·上海",
        establishedYear: "2014",
        description: "专注于计算机视觉与AI技术的创新企业，提供全栈AI解决方案，包括大模型服务。",
        services: ["计算机视觉", "多模态", "API服务", "行业解决方案"],
        modelCount: 35,
        links: {
            homepage: "https://www.sensetime.com",
            console: "https://console.sensetime.com",
            docs: "https://www.sensetime.com/api-docs",
            pricing: "https://www.sensetime.com/pricing"
        },
        features: ["领先的视觉技术", "全场景AI解决方案", "端云协同部署"]
    },
    {
        id: "zhipu",
        name: "智谱AI",
        logo: "/assets/images/providers/zhipu.png",
        location: "中国·北京",
        establishedYear: "2019",
        description: "提供ChatGLM系列开源模型，专注于大规模语言模型研发与应用的科技公司。",
        services: ["开源模型", "API服务", "模型训练", "企业定制"],
        modelCount: 15,
        links: {
            homepage: "https://www.zhipuai.cn",
            console: "https://open.zhipuai.cn",
            docs: "https://open.zhipuai.cn/docs",
            github: "https://github.com/THUDM/ChatGLM-6B"
        },
        features: ["开源模型支持", "低资源部署方案", "模型定制服务"]
    },
    {
        id: "minimax",
        name: "MiniMax",
        logo: "/assets/images/providers/minimax.png",
        location: "中国·北京",
        establishedYear: "2021",
        description: "专注于大语言模型应用的AI公司，提供对话生成、内容创作等智能服务。",
        services: ["API服务", "对话模型", "内容生成", "场景定制"],
        modelCount: 20,
        links: {
            homepage: "https://api.minimax.chat",
            console: "https://api.minimax.chat/user-center",
            docs: "https://api.minimax.chat/document",
            pricing: "https://api.minimax.chat/price"
        },
        features: ["对话生成能力", "内容创作助手", "场景化解决方案"]
    }
]