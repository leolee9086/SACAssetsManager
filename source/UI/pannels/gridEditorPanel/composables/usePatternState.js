import { ref, watch } from '../../../../../static/vue.esm-browser.js'
import { symmetryConstraints } from '../patterns.js'
import { 创建实例工厂 } from '../../../../globalStatus/registry/index.js'
// 定义默认的 PatternState 名称
const DEFAULT_PATTERN_STATE = 'default'
export function usePatternState({ genGridStyle, name = DEFAULT_PATTERN_STATE }) {
  const basis1 = ref({ x: 240, y: 0 })
  const basis2 = ref({ x: 0, y: 240 })
  const symmetryType = ref('pmm')
  const fillImageUrl = ref('')
  const fillTransform = ref({
    scale: 1,
    rotation: 0,
    translate: { x: 0, y: 0 }
  })

  const handleBasisInput = () => {
    const constraint = symmetryConstraints[symmetryType.value]
    if (constraint && constraint.validateBasis) {
      const normalized = constraint.normalizeBasis(basis1.value, basis2.value)
      basis1.value = normalized.basis1
      basis2.value = normalized.basis2
    }
    genGridStyle(getPatternConfig())
  }

  const updateSymmetryType = () => {
    const constraint = symmetryConstraints[symmetryType.value]
    if (constraint && constraint.validateBasis) {
      const normalized = constraint.normalizeBasis(basis1.value, basis2.value)
      basis1.value = normalized.basis1
      basis2.value = normalized.basis2
    }
    genGridStyle(getPatternConfig())
  }

  const getPatternConfig = () => ({
    symmetryType: symmetryType.value,
    basis1: basis1.value,
    basis2: basis2.value,
    fillImageUrl: fillImageUrl.value,
    fillTransform: fillTransform.value
  })

  // 设置监听器
  watch([basis1, basis2], () => {
    genGridStyle(getPatternConfig())
  }, { deep: true })

  watch(() => symmetryType.value, () => {
    updateSymmetryType()
    genGridStyle(getPatternConfig())
  })

  watch(() => fillTransform.value, () => {
    genGridStyle(getPatternConfig())
  }, { deep: true })

  return {
    basis1,
    basis2,
    symmetryType,
    fillImageUrl,
    fillTransform,
    handleBasisInput,
    updateSymmetryType,
    getPatternConfig
  }
}

// 创建支持具名实例的 PatternState 工厂
const createPatternState = 创建实例工厂(
  'PatternState',
  ({ genGridStyle, name }) => usePatternState({ genGridStyle, name }),
  {
    最大实例数: 100,
    获取实例标识: (参数组) => 参数组[0].name || DEFAULT_PATTERN_STATE,
    错误处理器: (错误) => {
      console.error('[PatternState]', 错误)
    }
  }
)

// 获取指定名称的 PatternState 实例
export function usePatternStateByName({ name = DEFAULT_PATTERN_STATE, genGridStyle }) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('[PatternState] name 必须是非空字符串')
  }
  return createPatternState({ name, genGridStyle })
}

// 清理指定名称的 PatternState
export function clearPatternState(name = DEFAULT_PATTERN_STATE) {
  createPatternState.清理(name)
}

// 工具函数：获取所有 PatternState 实例
export function getAllPatternStates() {
  return createPatternState.获取所有实例()
}

// 工具函数：检查特定名称的 PatternState 是否存在
export function hasPatternState(name = DEFAULT_PATTERN_STATE) {
  return createPatternState.包含实例(name)
} 