<script setup lang="ts">
import UiCard from "@/components/UiCard.vue";
import UiButton from "@/components/UiButton.vue";
</script>

<template>
  <!-- TODO: UNBOUND_SPACING at DemoCard — gap on "DemoCard" uses a literal value (16px) -->
  <!-- TODO: UNBOUND_SPACING at DemoCard — padding-top on "DemoCard" uses a literal value (16px) -->
  <!-- TODO: UNBOUND_SPACING at DemoCard — padding-right on "DemoCard" uses a literal value (16px) -->
  <!-- TODO: UNBOUND_SPACING at DemoCard — padding-bottom on "DemoCard" uses a literal value (16px) -->
  <!-- TODO: UNBOUND_SPACING at DemoCard — padding-left on "DemoCard" uses a literal value (16px) -->
  <!-- TODO: UNBOUND_COLOR at DemoCard — background on "DemoCard" uses a raw color value -->
  <div class="flex flex-col gap-4 p-4 items-start justify-start bg-white">
    <UiCard variant="elevated">
      <!-- TODO: UNBOUND_COLOR at DemoCard > Card > Welcome — color on "Welcome" uses a raw color value -->
      <h1 class="font-bold text-[32px] text-black" style="font-family: Inter">
        Welcome
      </h1>
      <UiButton size="md" variant="primary">
        <!-- TODO: UNBOUND_TYPOGRAPHY at DemoCard > Card > Button > Text — Text "Text" uses ad-hoc font properties -->
        <!-- TODO: UNBOUND_COLOR at DemoCard > Card > Button > Text — color on "Text" uses a raw color value -->
        <span class="font-bold text-base text-black" style="font-family: Inter">
          Get started
        </span>
      </UiButton>
    </UiCard>
  </div>
</template>
