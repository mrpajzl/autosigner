<template>
  <div class="mt-10 px-5 max-w-4xl mx-auto space-y-8 pb-16">
    <!-- Header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/80 via-indigo-700/90 to-violet-800 p-8 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent"></div>
      <div class="absolute top-4 right-4 opacity-20">
        <UIcon name="i-heroicons-device-phone-mobile" class="w-24 h-24 text-white" />
      </div>
      <div class="relative space-y-4">
        <div class="flex items-center gap-2 text-blue-300 text-sm font-medium">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Návod</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-white">
          Instalace aplikací na iPhone, iPad a Mac
        </h1>
        <p class="text-lg text-white/70 max-w-2xl">
          Jednoduchý průvodce instalací sideloadovaných aplikací přímo z prohlížeče
        </p>
      </div>
    </div>

    <!-- Requirements -->
    <div class="rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-amber-500/20">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-amber-500" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-800 dark:text-white">Co budete potřebovat</h3>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1">
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-amber-500" />
              <span><strong>iPhone, iPad nebo Mac</strong> s registrovaným UDID ve FastSigner</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-amber-500" />
              <span><strong>Safari</strong> nebo jiný prohlížeč na zařízení</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Steps -->
    <div class="space-y-6">
      <!-- Step 1 -->
      <div class="step-card group">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3 class="step-title">Otevřete FastSigner v prohlížeči</h3>
          <div class="step-description">
            <p>
              Na svém iPhone, iPadu nebo Macu otevřete webový prohlížeč (Safari) a přejděte na stránku FastSigner.
            </p>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="step-card group">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3 class="step-title">Klikněte na aplikaci</h3>
          <div class="step-description">
            <p>
              Na hlavní stránce najděte aplikaci, kterou chcete nainstalovat, a klikněte na její tlačítko.
            </p>
            <div class="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-white/5">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <UIcon name="i-heroicons-device-phone-mobile" class="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p class="font-medium text-slate-800 dark:text-white">Název aplikace</p>
                  <p class="text-sm text-slate-500 dark:text-white/60">v1.0.0</p>
                </div>
                <UButton color="red" variant="solid" size="sm" class="ml-auto" disabled>
                  Instalovat
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="step-card group">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3 class="step-title">Potvrďte instalaci</h3>
          <div class="step-description">
            <p>
              Zobrazí se dialogové okno s dotazem, zda chcete nainstalovat aplikaci. Klikněte na <strong>Instalovat</strong>.
            </p>
            <div class="mt-4 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700">
              <div class="text-center space-y-3">
                <p class="text-white text-sm">Chcete nainstalovat "Název aplikace"?</p>
                <div class="flex justify-center gap-3">
                  <span class="px-4 py-1.5 rounded bg-slate-700 text-slate-300 text-sm">Zrušit</span>
                  <span class="px-4 py-1.5 rounded bg-blue-500 text-white text-sm font-medium">Instalovat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="step-card group">
        <div class="step-number">4</div>
        <div class="step-content">
          <h3 class="step-title">Aktivujte Developer Mode (pouze iOS 16+)</h3>
          <div class="step-description">
            <p>
              Pokud máte iOS 16 nebo novější, je nutné aktivovat Developer Mode:
            </p>
            <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700">
              <div class="flex flex-wrap items-center gap-2 text-white font-mono text-sm">
                <span class="text-slate-400">Settings</span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500" />
                <span class="text-slate-400">Privacy & Security</span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500" />
                <span class="text-blue-400 font-semibold">Developer Mode</span>
              </div>
            </div>
            <ol class="mt-4 space-y-2 text-slate-600 dark:text-white/70">
              <li class="flex items-start gap-2">
                <span class="font-mono text-blue-500 font-bold">a.</span>
                <span>Přejděte do <strong>Nastavení</strong> → <strong>Soukromí a zabezpečení</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-blue-500 font-bold">b.</span>
                <span>Scrollujte dolů a najděte <strong>Developer Mode</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-blue-500 font-bold">c.</span>
                <span>Zapněte přepínač a <strong>restartujte zařízení</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-blue-500 font-bold">d.</span>
                <span>Po restartu potvrďte aktivaci Developer Mode</span>
              </li>
            </ol>
            <div class="mt-3 p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-sm">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 inline mr-1" />
              <span class="text-slate-600 dark:text-white/70">
                Developer Mode stačí aktivovat pouze jednou. Poté můžete instalovat aplikace bez omezení.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5 -->
      <div class="step-card group">
        <div class="step-number">5</div>
        <div class="step-content">
          <h3 class="step-title">Hotovo! 🎉</h3>
          <div class="step-description">
            <p>
              Aplikace se nainstaluje a objeví se na domovské obrazovce vašeho zařízení.
            </p>
            <div class="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-check-badge" class="w-8 h-8 text-emerald-500" />
                <div>
                  <p class="font-semibold text-slate-800 dark:text-white">Aplikace nainstalována</p>
                  <p class="text-sm text-slate-600 dark:text-white/70">Nyní ji najdete na ploše zařízení</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Troubleshooting -->
    <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-wrench-screwdriver" class="w-6 h-6 text-slate-500" />
        <h3 class="font-semibold text-slate-800 dark:text-white">Řešení problémů</h3>
      </div>
      
      <div class="space-y-4">
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Aplikace nejde nainstalovat</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Zkontrolujte, zda je vaše zařízení registrováno ve FastSigner</li>
            <li>• Ujistěte se, že máte aktivovaný Developer Mode (iOS 16+)</li>
            <li>• Zkuste použít Safari místo jiného prohlížeče</li>
          </ul>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Nevidím Developer Mode v nastavení</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Developer Mode se zobrazí až po pokusu o instalaci aplikace</li>
            <li>• Zkuste nejprve kliknout na aplikaci ve FastSigner</li>
            <li>• Poté zkontrolujte Nastavení → Soukromí a zabezpečení</li>
          </ul>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Aplikace se nespustí</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Restartujte zařízení</li>
            <li>• Zkontrolujte, zda profil ještě nevypršel</li>
            <li>• Kontaktujte podporu na Discordu</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Back to home -->
    <div class="flex justify-center">
      <UButton to="/" color="gray" variant="ghost" size="lg">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-2" />
        Zpět na hlavní stránku
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Instalace na iOS a Mac'
})
</script>

<style scoped>
.step-card {
  @apply flex gap-4 p-6 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300;
}

.step-card:hover {
  @apply border-blue-500/30 shadow-lg shadow-blue-500/5;
}

.step-number {
  @apply flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white font-bold flex items-center justify-center text-lg shadow-lg;
}

.step-content {
  @apply flex-1 space-y-2;
}

.step-title {
  @apply text-lg font-semibold text-slate-800 dark:text-white;
}

.step-description {
  @apply text-slate-600 dark:text-white/70;
}

.step-description p {
  @apply leading-relaxed;
}

.step-description code {
  @apply px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-sm;
}
</style>


