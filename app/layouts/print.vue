<template>
  <div
    data-testid="print-layout"
    class="min-h-screen bg-white p-6 text-neutral-900 md:p-10 print:p-0"
  >
    <div class="mx-auto max-w-5xl">
      <slot />
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  body {
    background-color: #ffffff;
    color: #111827;
  }
}
</style>
