<template>
  <div class="magi-container">
    <div class="system-info">
      <div class="warning-text">MAGI SYSTEM CONNECTING...</div>
      <div class="warning-text">ACCESS MODE:SUPERVISOR</div>
      <div class="warning-text danger">RESULT OF THE DELIBERATION</div>
      <div class="warning-text danger">MOTION:SELF-DESTRUCTION!</div>
    </div>
    
    <div class="code-info">
      CODE:208
      MODE:375
      EXTENSION:2048
      EX_MODE:OFF
      PRIORITY:AAA
    </div>

    <div class="cards-container">
      <div class="card-unit" v-for="(card, index) in cards" :key="index">
        <div class="card" :class="`card-${index + 1}`">
          <svg class="card-frame" :viewBox="'0 0 100 100'" preserveAspectRatio="none">
            <defs>
              <pattern :id="`grid-${index}`" width="10" height="10" patternUnits="userSpaceOnUse">
                <path :stroke="card.color" stroke-width="0.5" stroke-opacity="0.1" fill="none" 
                      d="M 10 0 L 0 0 0 10"/>
              </pattern>
            </defs>
            <!-- 外框 - 修正路径命令，避免多余线条 -->
            <path :stroke="card.color" stroke-width="1" fill="none"
                  d="M 5,0 H 95 L 100,5 V 95 L 95,100 H 5 L 0,95 V 5 Z"/>
            <!-- 角落加粗效果 - 改用短线段 -->
            
            <!-- 状态区域的多边形 -->
            <path v-if="index !== 1" 
                  d="M 0 0 L 100 0 L 100 30 L 80 38.2 L 20 38.2 L 0 30 Z" 
                  :fill="'black'" :stroke="card.color"/>
            <!-- BALTHASAR-2 的状态区域在底部 -->
            <path v-else 
                  d="M 20 61.8 L 80 61.8 L 100 70 L 100 100 L 0 100 L 0 70 Z" 
                  :fill="'black'" :stroke="card.color"/>
            <!-- 信息区域背景 -->
            <rect :x="2" :y="index !== 1 ? 40 : 2" 
                  width="96" :height="index !== 1 ? 56 : 58" 
                  :fill="`url(#grid-${index})`"/>
          </svg>
          <!-- 根据卡片索引调整状态区域的位置 -->
          <div class="status-area" :class="{ 'status-bottom': index === 1 }">
            <div class="status-main">{{ card.main }}</div>
            <div class="status-sub">{{ card.sub }}</div>
          </div>
          <div class="info-area" :class="{ 'info-top': index === 1 }">{{ card.info }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const cards = [
  {
    main: 'MELCHIOR-1',
    sub: 'OPERATION CONTROL',
    info: 'HOLD\nStatus Link\nOPEN-CLOSE',
    color: '#00ffff'
  },
  {
    main: 'BALTHASAR-2',
    sub: 'CALCULATION',
    info: 'Layer2\nConnection Contact\nOPEN\nData Link\nOPEN-HARD',
    color: '#00ffff'
  },
  {
    main: 'CASPER-3',
    sub: 'PERSONALITY',
    info: '否定',
    color: '#ff0000'
  }
]
</script>

<style scoped>
.magi-container {
  background-color: black;
  color: #ff8c00;
  width: 100%;
  aspect-ratio: 16/9;
  padding: 2%;
}

.system-info {
  margin-bottom: 20px;
}

.warning-text {
  color: #ff8c00;
  font-family: monospace;
}

.warning-text.danger {
  color: #ff0000;
}

.code-info {
  font-family: monospace;
  margin-bottom: 40px;
  color: #ff8c00;
}

.cards-container {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5%;
}

.card-unit {
  height: 100%;
  flex: 1;
  display: flex;
  align-items: center;
}

.card {
  width: 100%;
  height: 90%;
  position: relative;
  background-color: black;
}

.card-frame {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 0;
}

.status-area {
  position: relative;
  z-index: 1;
  height: 38.2%;
}

.status-bottom {
  position: absolute;
  bottom: 0;
  width: 100%;
}

.info-area {
  position: relative;
  z-index: 1;
  padding: 20px;
  white-space: pre-line;
}

.info-top {
  padding-top: 40px;
}

/* 删除之前的clip-path相关样式 */
.card-1 .status-area, 
.card-3 .status-area,
.card-2 .status-area {
  clip-path: none;
  border: none;
}

/* 删除之前的网格背景相关样式 */
.info-area::before,
.info-area::after {
  display: none;
}

/* 特殊颜色设置 */
.card-3 {
  --card-color: #ff0000;
}

@media (max-width: 768px) {
  .magi-container {
    aspect-ratio: 1;
  }
  
  .cards-container {
    flex-direction: column;
    gap: 2%;
  }
  
  .card-unit {
    width: 100%;
    height: 30%;
  }
}

/* 状态区内部的黄金分割 */
.status-main {
  height: 61.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  font-weight: bold;
}

.status-sub {
  height: 38.2%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  opacity: 0.8;
}
</style>