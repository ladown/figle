<script setup lang="ts">
defineProps<{
  variant?: "elevated" | "outlined";
}>();
</script>

<template>
  <div
    :class="[
      'rounded-lg p-6',
      variant === 'elevated' ? 'shadow-md bg-surface-elevated' : 'border',
    ]"
  >
    <slot />
  </div>
</template>
