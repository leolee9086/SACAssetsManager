import { trinityQuestions, genSummaryPrompt as genTrinityPrompt } from './questionnaire-sections/trinity.js';
import { melchiorQuestions, genSummaryPrompt as genMelchiorPrompt } from './questionnaire-sections/melchior.js';
import { balthazarQuestions, genSummaryPrompt as genBalthazarPrompt } from './questionnaire-sections/balthazar.js';
import { casperQuestions, genSummaryPrompt as genCasperPrompt } from './questionnaire-sections/casper.js';

// 导出所有量表的组合
export const questionnaireSections = [
  ...trinityQuestions,    // TRINITY-00 基础信息与整合特征
  ...melchiorQuestions,   // MELCHIOR-01 认知控制特征
  ...balthazarQuestions,  // BALTHAZAR-02 情感调节特征
  ...casperQuestions      // CASPER-03 本能反应特征
];

// 导出所有总结函数
export const summaryPrompts = {
  trinity: genTrinityPrompt,     // 生成人物小传
  melchior: genMelchiorPrompt,   // 生成认知理性特征总结
  balthazar: genBalthazarPrompt, // 生成情感特征总结
  casper: genCasperPrompt        // 生成本能反应特征总结
}; 