
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
    },
    {
        id: "openai",
        name: "OpenAI",
        logo: "/assets/images/providers/openai.png",
        location: "美国",
        establishedYear: "2015",
        description: "提供ChatGPT和DALL-E等模型的API，支持文本生成、图像生成等任务，是目前最受欢迎的生成式AI工具之一。",
        services: ["文本生成", "图像生成", "模型微调", "API服务"],
        modelCount: 10,
        links: {
            homepage: "https://openai.com",
            console: "https://platform.openai.com",
            docs: "https://platform.openai.com/docs",
            pricing: "https://openai.com/pricing"
        },
        features: ["支持多语言", "强大的文本生成能力", "广泛的社区支持"]
    },
    {
        id: "googlecloud",
        name: "Google Cloud AI",
        logo: "/assets/images/providers/googlecloud.png",
        location: "美国",
        establishedYear: "2010",
        description: "提供广泛的AI和机器学习产品套件，包括Vertex AI平台、Vision AI、Natural Language API等，覆盖了机器学习的整个生命周期。",
        services: ["自然语言处理", "计算机视觉", "推荐系统", "API服务"],
        modelCount: 20,
        links: {
            homepage: "https://cloud.google.com",
            console: "https://console.cloud.google.com",
            docs: "https://cloud.google.com/docs",
            pricing: "https://cloud.google.com/pricing"
        },
        features: ["强大的数据处理能力", "广泛的云服务集成", "先进的自动化机器学习"]
    },
    {
        id: "ibm_watson",
        name: "IBM Watson",
        logo: "/assets/images/providers/ibm_watson.png",
        location: "美国",
        establishedYear: "2010",
        description: "提供Watson Discovery API等，具有复杂的数据提取和模式分析功能，擅长处理非结构化数据。",
        services: ["自然语言处理", "数据提取", "模式分析", "API服务"],
        modelCount: 15,
        links: {
            homepage: "https://www.ibm.com/watson",
            console: "https://cloud.ibm.com",
            docs: "https://cloud.ibm.com/apidocs",
            pricing: "https://www.ibm.com/watson/pricing"
        },
        features: ["强大的数据分析能力", "企业级安全", "灵活的部署选项"]
    },
    {
        id: "microsoft_azure",
        name: "Microsoft Azure AI",
        logo: "/assets/images/providers/microsoft_azure.png",
        location: "美国",
        establishedYear: "2010",
        description: "提供Azure AI语言服务、Computer Vision API等，支持情绪分析、关键短语提取等任务。",
        services: ["自然语言处理", "计算机视觉", "语音识别", "API服务"],
        modelCount: 18,
        links: {
            homepage: "https://azure.microsoft.com",
            console: "https://portal.azure.com",
            docs: "https://docs.microsoft.com/azure",
            pricing: "https://azure.microsoft.com/pricing"
        },
        features: ["与Microsoft生态系统集成", "强大的企业级支持", "广泛的AI服务覆盖"]
    },
    {
        id: "nlp_cloud",
        name: "NLP云",
        logo: "/assets/images/providers/nlp_cloud.png",
        location: "中国",
        establishedYear: "2020",
        description: "专注于自然语言处理任务，提供情感分析、内容审核、文本摘要等API。",
        services: ["情感分析", "内容审核", "文本摘要", "API服务"],
        modelCount: 10,
        links: {
            homepage: "https://www.nlpcloud.com",
            console: "https://console.nlpcloud.com",
            docs: "https://docs.nlpcloud.com",
            pricing: "https://www.nlpcloud.com/pricing"
        },
        features: ["高精度的自然语言处理", "灵活的API调用", "支持多种语言"]
    },
    {
        id: "dmxapi",
        name: "DMXAPI",
        logo: "/assets/images/providers/dmxapi.png",
        location: "全球",
        establishedYear: "2023",
        description: "由LangChain中文网提供，聚合了全球超过300个领先的大模型，包括GPT-4、Claude、LLaMA等，支持自然语言处理、图像识别等多种任务。",
        services: ["模型聚合", "API服务", "模型比较", "开发工具"],
        modelCount: 300,
        links: {
            homepage: "https://dmxapi.com",
            console: "https://console.dmxapi.com",
            docs: "https://docs.dmxapi.com",
            pricing: "https://dmxapi.com/pricing"
        },
        features: ["广泛的模型选择", "统一的API接口", "灵活的付费模式"]
    },
    {
        id: "ppio",
        name: "PPIO派欧云",
        logo: "/assets/images/providers/ppio.png",
        location: "中国",
        establishedYear: "2022",
        description: "提供开箱即用的大模型API服务，支持自定义模型的免运维部署，适用于人工智能、音视频等新一代场景。",
        services: ["模型部署", "API服务", "音视频处理", "AI应用"],
        modelCount: 22,
        links: {
            homepage: "https://www.pp.io",
            console: "https://console.pp.io",
            docs: "https://docs.pp.io",
            pricing: "https://www.pp.io/pricing"
        },
        features: ["免运维部署", "支持自定义模型", "适用于多种AI场景"]
    },
    {
        id: "openrouter",
        name: "OpenRouter",
        logo: "/assets/images/providers/openrouter.png",
        location: "全球",
        establishedYear: "2023",
        description: "集成式的大模型API平台，可调用ChatGPT、Claude、Gemini等各大模型。",
        services: ["模型集成", "API服务", "模型优化", "开发工具"],
        modelCount: 25,
        links: {
            homepage: "https://openrouter.ai",
            console: "https://console.openrouter.ai",
            docs: "https://docs.openrouter.ai",
            pricing: "https://openrouter.ai/pricing"
        },
        features: ["多模型支持", "统一的API管理", "灵活的路由策略"]
    },
    {
        id: "anthropic",
        name: "Anthropic",
        logo: "/assets/images/providers/anthropic.png",
        location: "美国",
        establishedYear: "2021",
        description: "OpenAI的主要竞争对手，其AI大模型能力不输GPT。",
        services: ["文本生成", "对话系统", "模型微调", "API服务"],
        modelCount: 8,
        links: {
            homepage: "https://www.anthropic.com",
            console: "https://console.anthropic.com",
            docs: "https://docs.anthropic.com",
            pricing: "https://www.anthropic.com/pricing"
        },
        features: ["强大的文本生成能力", "先进的对话系统", "灵活的模型定制"]
    },
    {
        id: "huawei_modelarts",
        name: "华为云ModelArts",
        logo: "/assets/images/providers/huawei_modelarts.png",
        location: "中国·深圳",
        establishedYear: "2017",
        description: "提供模型训练、部署和推理等全生命周期管理服务，支持多种大模型的API调用。",
        services: ["模型训练", "模型部署", "数据标注", "API服务"],
        modelCount: 28,
        links: {
            homepage: "https://www.huaweicloud.com/product/modelarts/studio.html",
            console: "https://auth.huaweicloud.com/authui",
            docs: "https://support.huaweicloud.com/usermanual-maas-modelarts/maas-modelarts-0020.html",
            pricing: "https://www.huaweicloud.com/price/modelarts"
        },
        features: ["全生命周期管理", "强大的数据处理能力", "企业级安全保障"],
        modelList:'./modelCards/华为云ModelArts.js'
    },
    {
        id: "tencent_youpin",
        name: "腾讯云",
        logo: "/assets/images/providers/tencent_youpin.png",
        location: "中国·深圳",
        establishedYear: "2013",
        description: "提供多种AI模型API，包括文本生成、图像识别等，支持开发者快速构建智能应用。",
        services: ["文本生成", "图像识别", "语音识别", "API服务"],
        modelCount: 20,
        links: {
            homepage: "https://cloud.tencent.com",
            console: "https://console.cloud.tencent.com",
            docs: "https://cloud.tencent.com/document",
            pricing: "https://cloud.tencent.com/price"
        },
        features: ["丰富的云服务生态", "强大的技术支持", "灵活的计费模式"]
    }
];