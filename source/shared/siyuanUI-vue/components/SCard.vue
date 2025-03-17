<template>
  <div 
    class="b3-card" 
    :class="{
      'b3-card--wrap': wrap,
      'b3-card--current': current,
      'b3-card--disabled': disabled,
      'b3-card--hoverable': hoverable
    }"
  >
    <div v-if="$slots.image" class="b3-card__img">
      <slot name="image"></slot>
    </div>
    <div class="fn__flex-1 fn__flex-column">
      <div class="b3-card__info fn__flex-1">
        <slot></slot>
      </div>
      <div v-if="$slots.actions" class="b3-card__actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  wrap: {
    type: Boolean,
    default: false
  },
  current: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  hoverable: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.b3-card {
  margin: 8px;
  border-radius: var(--b3-border-radius);
  background-color: var(--b3-theme-background);
  box-shadow: var(--b3-card-shadow);
}

.b3-card--hoverable:hover {
  box-shadow: var(--b3-card-hover-shadow);
}

.b3-card--selected {
  background-color: var(--b3-theme-primary-lightest);
  border: 1px solid var(--b3-theme-primary-lighter);
}

.b3-card__header {
  padding: 16px;
  border-bottom: 1px solid var(--b3-border-color);
}

.b3-card__content {
  padding: 16px;
}

.b3-card__footer {
  padding: 16px;
  border-top: 1px solid var(--b3-border-color);
}

.b3-card__action {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  border-top: 1px solid var(--b3-border-color);
}
</style> 