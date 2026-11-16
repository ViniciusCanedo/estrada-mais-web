<template>
  <section class="space-y-4">
    <h2 class="flex items-center gap-2 font-display text-xl tracking-wider text-white uppercase">
      <span class="inline-block size-3 bg-white" aria-hidden="true" />
      <span>2. Hierarquia Tipográfica</span>
    </h2>

    <div class="space-y-6 rounded-lg border border-asphalt-border bg-asphalt-surface p-6">
      <div class="space-y-2">
        <div
          class="flex items-center justify-between border-b border-asphalt-border pb-1 font-mono text-xs text-highway-muted"
        >
          <span>DISPLAY STACK (OSWALD / CONDENSED SANS)</span>
          <span>Cabeçalhos, Marcadores de Título e Logotipo</span>
        </div>
        <p class="font-display text-4xl font-bold tracking-wide text-white uppercase">
          CUSTO OPERACIONAL TOTAL: R$ 4,82 / KM
        </p>
        <p class="font-display text-2xl font-semibold tracking-wide text-amber-default uppercase">
          RELATÓRIO MENSAL TELEMETRIA PESADA
        </p>
        <p class="font-display text-lg font-medium tracking-wider text-highway-muted uppercase">
          ROTA REGULAR SANTOS &rarr; RONDONÓPOLIS
        </p>
      </div>

      <div class="space-y-2">
        <div
          class="flex items-center justify-between border-b border-asphalt-border pb-1 font-mono text-xs text-highway-muted"
        >
          <span>BODY STACK (INTER / HIGH-LEGIBILITY SANS)</span>
          <span>Textos de interface, formulários, tabelas e avisos</span>
        </div>
        <p class="font-body text-sm/relaxed text-highway-fg">
          Os valores calculados representam a média ponderada entre o consumo volumétrico de diesel
          S10 em praças de abastecimento conveniadas e a despesa de pedágio em eixos suspensos
          conforme legislação ANTT.
        </p>
      </div>

      <div class="space-y-2">
        <div
          class="flex items-center justify-between border-b border-asphalt-border pb-1 font-mono text-xs text-highway-muted"
        >
          <span>MONOSPACE INSTRUMENT STACK (JETBRAINS MONO)</span>
          <span>Odômetros, litragens, coordenadas, placas e moedas</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-6 font-mono">
          <span class="text-3xl font-extrabold text-white">14.280 KM</span>
          <span class="text-3xl font-extrabold text-amber-default">2,42 KM/L</span>
          <span class="text-3xl font-extrabold text-expense-blue">R$ 28.320,00</span>
          <span class="text-xl text-highway-muted">NF-e 000.108.921</span>
        </div>
      </div>
    </div>
  </section>
</template>
