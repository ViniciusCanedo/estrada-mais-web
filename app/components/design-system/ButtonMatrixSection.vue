<template>
  <section class="space-y-4">
    <h2 class="flex items-center gap-2 font-display text-xl tracking-wider text-white uppercase">
      <span class="inline-block size-3 bg-amber-default" aria-hidden="true" />
      <span>4. Sistema de Botões &amp; Interação</span>
    </h2>

    <div
      class="flex flex-wrap items-center gap-6 rounded-lg border border-asphalt-border bg-asphalt-surface p-6"
    >
      <div>
        <button
          type="button"
          class="rounded-sm bg-amber-default px-5 py-2.5 font-display text-sm font-semibold tracking-wider text-asphalt-bg uppercase shadow-[0_0_15px_rgba(255,180,0,0.3)] transition-all hover:bg-amber-hover active:bg-amber-dark"
        >
          Botão Primário (Amber)
        </button>
        <p class="mt-1.5 font-mono text-[10px] text-highway-muted">Uso restrito a 1 por viewport</p>
      </div>

      <div>
        <button
          type="button"
          class="rounded-sm border border-expense-blue px-5 py-2.5 text-sm font-semibold tracking-wider text-expense-blue uppercase transition-all hover:bg-expense-blue/15 active:bg-expense-blue/25"
        >
          Secundário Despesa (Blue)
        </button>
        <p class="mt-1.5 font-mono text-[10px] text-highway-muted">Ações financeiras / Despesas</p>
      </div>

      <div>
        <button
          type="button"
          class="rounded-sm border border-asphalt-border px-4 py-2.5 text-sm font-medium text-highway-muted transition-all hover:bg-asphalt-surface-light hover:text-white"
        >
          Botão Neutro / Cancelar
        </button>
        <p class="mt-1.5 font-mono text-[10px] text-highway-muted">Descartes e modais</p>
      </div>

      <div>
        <button
          type="button"
          class="rounded-sm border border-highway-red/40 px-4 py-2.5 text-sm font-medium text-highway-red transition-all hover:bg-highway-red/10"
        >
          Ação Destrutiva
        </button>
        <p class="mt-1.5 font-mono text-[10px] text-highway-muted">Exclusão irreversível</p>
      </div>
    </div>
  </section>
</template>
