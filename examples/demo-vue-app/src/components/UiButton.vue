<script setup lang="ts">
defineProps<{
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}>();
</script>

<template>
  <button
    :class="[
      'rounded font-medium',
      variant === 'primary'
        ? 'bg-primary-500 text-white'
        : 'bg-transparent text-primary-500',
      size === 'sm' && 'px-2 py-1 text-sm',
      size === 'md' && 'px-4 py-2 text-base',
      size === 'lg' && 'px-6 py-3 text-lg',
    ]"
  >
    <slot />
  </button>
</template>
